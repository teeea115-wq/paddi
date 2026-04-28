import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Cookie: cookieStore.toString() } } }
    )
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ allowed: false, reason: 'not_authenticated' })

    // Get or create user record
    let { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    // If no user record, create one with trial start
    if (!userData) {
      const { data: newUser } = await supabase
        .from('users')
        .insert({ id: user.id, email: user.email, trial_start_at: new Date().toISOString() })
        .select()
        .single()
      userData = newUser
    }

    // If trial_start_at is null, set it now
    if (!userData.trial_start_at) {
      const now = new Date().toISOString()
      await supabase
        .from('users')
        .update({ trial_start_at: now })
        .eq('id', user.id)
      userData.trial_start_at = now
    }

    // Premium users always allowed
    if (userData.is_premium) {
      return NextResponse.json({ allowed: true, reason: 'premium' })
    }

    // Check trial expiry
    const trialStart = new Date(userData.trial_start_at)
    const trialEnd = new Date(trialStart.getTime() + 30 * 24 * 60 * 60 * 1000)
    const now = new Date()
    if (now > trialEnd) {
      return NextResponse.json({ allowed: false, reason: 'trial_expired' })
    }

    // Check daily quota
    const today = new Date().toISOString().split('T')[0]
    const { count } = await supabase
      .from('usage_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('date', today)
      .eq('action', 'create_room')

    if ((count ?? 0) >= 2) {
      return NextResponse.json({ allowed: false, reason: 'quota_exceeded' })
    }

    return NextResponse.json({ allowed: true, reason: 'trial_active' })
  } catch (error) {
    console.error('check-access error:', error)
    return NextResponse.json({ allowed: false, reason: 'error' })
  }
}
