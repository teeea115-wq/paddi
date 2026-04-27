-- Decision Match: Monetization & Admin Protection
-- Restrict room creation to Premium users OR Active Trial users with quota

-- Drop existing broad host policy
DROP POLICY IF EXISTS "Hosts have full access" ON public.rooms;

-- 1. Split room policy: Separate SELECT from INSERT/UPDATE/DELETE
CREATE POLICY "Members/Hosts can read rooms" ON public.rooms FOR SELECT USING (
  auth.uid() = host_id OR
  EXISTS (SELECT 1 FROM public.room_members WHERE room_id = public.rooms.id AND user_id = auth.uid())
);

-- 2. Restrict INSERT based on Premium or Trial status
CREATE POLICY "Authorized users can create rooms" ON public.rooms FOR INSERT WITH CHECK (
  auth.uid() = host_id AND (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND (
        is_premium = true OR 
        (trial_start_at + INTERVAL '30 days' > now() AND public.check_daily_quota(id) = true)
      )
    )
  )
);

-- 3. Allow hosts to update/delete their own rooms
CREATE POLICY "Hosts can manage own rooms" ON public.rooms FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Hosts can delete own rooms" ON public.rooms FOR DELETE USING (auth.uid() = host_id);

-- Note: public.check_daily_quota() logic is already defined in the main schema
-- and returns true if is_premium=true OR (trial active AND usage < 2).
