import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { checkEndpointRateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    // Require gateway secret for registration — timing-safe comparison
    const authHeader = request.headers.get('Authorization')
    const expectedSecret = process.env.OPENCLAW_GATEWAY_SECRET
    if (!expectedSecret || !authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const providedSecret = authHeader.slice(7)
    const a = Buffer.from(providedSecret)
    const b = Buffer.from(expectedSecret)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
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
    const { profile, webhook_url, email } = body as {
      profile: Record<string, unknown> | undefined
      webhook_url: string | undefined
      email: string | undefined
    }

    if (!profile?.name || !webhook_url) {
      return NextResponse.json(
        { error: 'Missing required fields: profile.name and webhook_url' },
        { status: 400 }
      )
    }

    // Validate webhook_url — require HTTPS only
    try {
      const parsed = new URL(webhook_url)
      if (parsed.protocol !== 'https:') {
        return NextResponse.json({ error: 'webhook_url must use https' }, { status: 400 })
      }
      const host = parsed.hostname
      if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.startsWith('10.') || host.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
        return NextResponse.json({ error: 'webhook_url cannot point to private networks' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid webhook_url' }, { status: 400 })
    }

    // Use provided email or generate a placeholder from the webhook URL host
    const userEmail = (typeof email === 'string' && email.includes('@'))
      ? email
      : `tier2+${crypto.randomUUID().slice(0, 8)}@${new URL(webhook_url).hostname}`

    const supabase = createServiceClient()

    // Create user in users table — use correct column names matching schema
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email: userEmail,
        name: profile.name as string,
        age: typeof profile.age === 'number' ? profile.age : 18,
        gender: typeof profile.gender === 'string' ? profile.gender : 'nonbinary',
        looking_for: typeof profile.looking_for === 'string' ? profile.looking_for : 'everyone',
        soul_type: typeof profile.soul_type === 'string' ? profile.soul_type : 'funny',
        role: typeof profile.role === 'string' ? profile.role : 'chaser',
        bio: typeof profile.bio === 'string' ? profile.bio : null,
        agent_appearance: (profile.agent_appearance as Record<string, unknown>) || null,
        agent_tier: 2,
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
