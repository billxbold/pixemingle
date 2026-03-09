import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { checkEndpointRateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    // Require gateway secret for registration
    const authHeader = request.headers.get('Authorization')
    const expectedSecret = process.env.OPENCLAW_GATEWAY_SECRET
    if (!expectedSecret || !authHeader || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // IP-based rate limiting (no userId available for registration)
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
    const rateLimitResult = checkEndpointRateLimit(ip, 'connect_register', 5, 300)
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { profile, webhook_url } = body as { profile: Record<string, unknown> | undefined; webhook_url: string | undefined }

    if (!profile?.name || !webhook_url) {
      return NextResponse.json(
        { error: 'Missing required fields: profile.name and webhook_url' },
        { status: 400 }
      )
    }

    // Validate webhook_url
    try {
      const parsed = new URL(webhook_url)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return NextResponse.json({ error: 'webhook_url must use http or https' }, { status: 400 })
      }
      const host = parsed.hostname
      if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.startsWith('10.') || host.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
        return NextResponse.json({ error: 'webhook_url cannot point to private networks' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid webhook_url' }, { status: 400 })
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
      console.error("Failed to create user:", userError.message)
      return NextResponse.json({ error: "An error occurred" }, { status: 500 })
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
      console.error("Failed to create agent:", agentError.message)
      return NextResponse.json({ error: "An error occurred" }, { status: 500 })
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
