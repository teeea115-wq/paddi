import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  console.log('=== CHECK ACCESS CALLED ===')
  try {
    const cookieStore = await cookies()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Cookie: cookieStore.toString() } } }
    )
    
    const { data: { user } } = await supabase.auth.getUser()
    console.log('user:', user?.id)
    
    if (!user) {
      console.log('returning: { allowed: false, reason: "not_authenticated" }')
      return NextResponse.json({ allowed: false, reason: 'not_authenticated' })
    }

    // Get or create user record
    let { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    console.log('userData before check:', userData)

    // If no user record, create one with trial start
    if (!userData) {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({ id: user.id, email: user.email, trial_start_at: new Date().toISOString() })
        .select()
        .single()
      
      if (insertError) console.error('insert userData error:', insertError)
      userData = newUser
      console.log('created new userData:', userData)
    }

    // If trial_start_at is null, set it now
    if (userData && !userData.trial_start_at) {
      const now = new Date().toISOString()
      const { error: updateError } = await supabase
        .from('users')
        .update({ trial_start_at: now })
        .eq('id', user.id)
      
      if (updateError) console.error('update trial_start_at error:', updateError)
      userData.trial_start_at = now
      console.log('updated trial_start_at for userData:', userData)
    }

    // Premium users always allowed
    if (userData?.is_premium) {
      console.log('returning: { allowed: true, reason: "premium" }')
      return NextResponse.json({ allowed: true, reason: 'premium' })
    }

    // Check trial expiry
    if (userData?.trial_start_at) {
      const trialStart = new Date(userData.trial_start_at)
      const trialEnd = new Date(trialStart.getTime() + 30 * 24 * 60 * 60 * 1000)
      const now = new Date()
      if (now > trialEnd) {
        console.log('returning: { allowed: false, reason: "trial_expired" }')
        return NextResponse.json({ allowed: false, reason: 'trial_expired' })
      }
    }

    // Check daily quota
    const today = new Date().toISOString().split('T')[0]
    const { count, error: countError } = await supabase
      .from('usage_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('date', today)
      .eq('action', 'create_room')

    if (countError) console.error('quota check error:', countError)

    if ((count ?? 0) >= 2) {
      console.log('returning: { allowed: false, reason: "quota_exceeded" }')
      return NextResponse.json({ allowed: false, reason: 'quota_exceeded' })
    }

    console.log('returning: { allowed: true, reason: "trial_active" }')
    return NextResponse.json({ allowed: true, reason: 'trial_active' })
  } catch (error) {
    console.error('check-access error:', error)
    return NextResponse.json({ allowed: false, reason: 'error' })
  }
}
