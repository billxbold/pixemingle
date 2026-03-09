import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { checkEndpointRateLimit } from '@/lib/rate-limit'

export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 })
    }

    const apiKey = authHeader.slice(7)
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

    const supabase = createServiceClient()

    // Validate API key
    const { data: agent, error: lookupError } = await supabase
      .from('openclaw_agents')
      .select('id')
      .eq('api_key_hash', apiKeyHash)
      .single()

    if (lookupError || !agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const rateLimitResult = checkEndpointRateLimit(agent.id, 'webhook-config-put', 20, 60)
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Update webhook URL
    let reqBody: Record<string, unknown>
    try {
      reqBody = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { webhook_url } = reqBody as { webhook_url?: string }
    if (!webhook_url || typeof webhook_url !== 'string') {
      return NextResponse.json({ error: 'Missing webhook_url' }, { status: 400 })
    }

    // Validate webhook_url
    try {
      const parsed = new URL(webhook_url)
      if (parsed.protocol !== 'https:') {
        return NextResponse.json({ error: 'webhook_url must use https' }, { status: 400 })
      }
      // Block private IPs
      const host = parsed.hostname
      if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.startsWith('10.') || host.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
        return NextResponse.json({ error: 'webhook_url cannot point to private networks' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid webhook_url' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('openclaw_agents')
      .update({ webhook_url })
      .eq('id', agent.id)

    if (updateError) {
      console.error('Failed to update webhook URL:', updateError.message)
      return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Webhook config error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
