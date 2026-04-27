-- Decision Match: Supabase Database Schema
-- Optimized for Tinder-like swipe UX and collaborative decision making

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE room_mode AS ENUM ('geo', 'manual');
CREATE TYPE room_status AS ENUM ('drafting', 'voting', 'completed');
CREATE TYPE vote_value AS ENUM ('like', 'dislike');

-- 2. TABLES
-- User profiles (linked to auth.users)
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text NOT NULL,
  trial_start_at timestamptz DEFAULT now(),
  is_premium boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Decision Rooms
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id uuid REFERENCES public.users(id) NOT NULL,
  mode room_mode NOT NULL,
  status room_status NOT NULL DEFAULT 'drafting',
  card_limit integer DEFAULT 3,
  radius_m integer,
  created_at timestamptz DEFAULT now()
);

-- Junction table for room participants
CREATE TABLE public.room_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Decision Cards (Places/Options)
CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES public.users(id) NOT NULL,
  title text NOT NULL,
  place_id text,
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- Swipe Votes
CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  card_id uuid REFERENCES public.cards(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  value vote_value NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(card_id, user_id)
);

-- System usage tracking
CREATE TABLE public.usage_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- 3. PL/PGSQL FUNCTIONS
-- Check if user is within daily usage limits
CREATE OR REPLACE FUNCTION public.check_daily_quota(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_is_premium boolean;
  v_trial_start timestamptz;
  v_usage_count integer;
BEGIN
  SELECT is_premium, trial_start_at INTO v_is_premium, v_trial_start
  FROM public.users WHERE id = p_user_id;

  IF v_is_premium THEN
    RETURN true;
  END IF;

  -- Trial expires after 30 days
  IF v_trial_start + INTERVAL '30 days' < now() THEN
    RETURN false;
  END IF;

  -- Limit to 2 actions per day for free users
  SELECT count(*) INTO v_usage_count
  FROM public.usage_log
  WHERE user_id = p_user_id AND date = CURRENT_DATE;

  RETURN v_usage_count < 2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can add more cards to a room
CREATE OR REPLACE FUNCTION public.check_card_limit(p_room_id uuid, p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_limit integer;
  v_count integer;
BEGIN
  SELECT card_limit INTO v_limit FROM public.rooms WHERE id = p_room_id;
  SELECT count(*) INTO v_count FROM public.cards WHERE room_id = p_room_id AND created_by = p_user_id;
  RETURN v_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if a card has been liked by everyone in the room
CREATE OR REPLACE FUNCTION public.check_match(p_room_id uuid, p_card_id uuid)
RETURNS boolean AS $$
DECLARE
  v_member_count integer;
  v_like_count integer;
BEGIN
  SELECT count(*) INTO v_member_count FROM public.room_members WHERE room_id = p_room_id;
  SELECT count(*) INTO v_like_count FROM public.votes WHERE card_id = p_card_id AND value = 'like';
  RETURN v_member_count = v_like_count AND v_member_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS POLICIES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_log ENABLE ROW LEVEL SECURITY;

-- users: read/update own row
CREATE POLICY "Users can read own data" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid() = id);

-- rooms: host can CRUD, members can read
CREATE POLICY "Hosts have full access" ON public.rooms FOR ALL USING (auth.uid() = host_id);
CREATE POLICY "Members can read rooms" ON public.rooms FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.room_members WHERE room_id = public.rooms.id AND user_id = auth.uid())
);

-- room_members
CREATE POLICY "Users can join rooms" ON public.room_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members can see each other" ON public.room_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.room_members AS rm WHERE rm.room_id = public.room_members.room_id AND rm.user_id = auth.uid())
);

-- cards: members can INSERT if count < card_limit, all members can read
CREATE POLICY "Members can read cards" ON public.cards FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.room_members WHERE room_id = public.cards.room_id AND user_id = auth.uid())
);
CREATE POLICY "Members can insert cards" ON public.cards FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.room_members WHERE room_id = public.cards.room_id AND user_id = auth.uid())
  AND public.check_card_limit(room_id, auth.uid())
);

-- votes: user can insert own vote only, read all votes in same room
CREATE POLICY "Users can cast votes" ON public.votes FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.room_members WHERE room_id = public.votes.room_id AND user_id = auth.uid())
);
CREATE POLICY "Users can read room votes" ON public.votes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.room_members WHERE room_id = public.votes.room_id AND user_id = auth.uid())
);

-- usage_log: system inserts, user reads own
CREATE POLICY "Users can read own usage logs" ON public.usage_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON public.usage_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. REALTIME
-- Enable Realtime for key interaction tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms, public.cards, public.votes;

-- 6. AUTOMATION: Sync Auth Users to Public Users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
