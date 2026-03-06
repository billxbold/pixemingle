import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const { profile, webhook_url } = await request.json()

    if (!profile?.name || !webhook_url) {
      return NextResponse.json(
        { error: 'Missing required fields: profile.name and webhook_url' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Create user in users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        display_name: profile.name,
        age: profile.age || null,
        gender: profile.gender || null,
        looking_for: profile.looking_for || null,
        soul_type: profile.soul_type || null,
        bio: profile.bio || null,
        agent_appearance: profile.agent_appearance || null,
        onboarding_complete: true,
      })
      .select()
      .single()

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 })
    }

    // Generate API key and hash it
    const apiKey = crypto.randomUUID()
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

    // Store hash in openclaw_agents table
    const { error: agentError } = await supabase
      .from('openclaw_agents')
      .insert({
        user_id: user.id,
        api_key_hash: apiKeyHash,
        webhook_url,
      })

    if (agentError) {
      return NextResponse.json({ error: agentError.message }, { status: 500 })
    }

    return NextResponse.json({
      api_key: apiKey,
      user_id: user.id,
    })
  } catch (e) {
    console.error('Connect register error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
