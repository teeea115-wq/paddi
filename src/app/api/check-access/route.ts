import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ allowed: false, reason: 'auth_required' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('is_premium, trial_start_at')
    .eq('id', authUser.id)
    .single();

  if (!profile) {
    // If profile doesn't exist yet, we allow it (new user)
    return NextResponse.json({ allowed: true, reason: 'new_user' });
  }

  if (profile.is_premium) {
    return NextResponse.json({ allowed: true, reason: 'premium' });
  }

  // Check Trial
  if (profile.trial_start_at) {
    const trialStart = new Date(profile.trial_start_at);
    const now = new Date();
    const trialDaysElapsed = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 3600 * 24));
    
    if (trialDaysElapsed >= 30) {
      return NextResponse.json({ allowed: false, reason: 'trial_expired' });
    }
  }

  // Check Quota
  const today = new Date().toISOString().split('T')[0];
  const { data: usage } = await supabase
    .from('usage_log')
    .select('id')
    .eq('user_id', authUser.id)
    .eq('date', today)
    .eq('action', 'create_room');

  if (usage && usage.length >= 2) {
    return NextResponse.json({ allowed: false, reason: 'quota_exceeded' });
  }

  return NextResponse.json({ allowed: true, reason: 'trial_active' });
}
