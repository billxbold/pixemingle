import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-server'
import { checkEndpointRateLimit } from '@/lib/rate-limit'
import { isPrivateUrl } from '@/lib/webhooks'

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimitResult = checkEndpointRateLimit(userId, 'agent_chat', 30, 60)
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const message = body.message
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    if (message.length > 500) {
      return NextResponse.json({ error: 'Message too long (max 500 characters)' }, { status: 400 })
    }

    // Extract optional context from request
    const matchId = typeof body.match_id === 'string' ? body.match_id : null
    const context = typeof body.context === 'string' ? body.context : null
    const mode = matchId ? 'theater_coaching' : 'idle'

    // Look up agent routing for this user
    const supabase = createServiceClient()
    const { data: routing } = await supabase
      .from('agent_routing')
      .select('gateway_url, tier, webhook_url, is_active')
      .eq('user_id', userId)
      .single()

    if (!routing || !routing.is_active) {
      return NextResponse.json({
        text: "I'm still getting set up! Give me a moment to connect...",
        action: null,
      })
    }

    const gatewaySecret = process.env.OPENCLAW_GATEWAY_SECRET
    if (!gatewaySecret) {
      console.error('OPENCLAW_GATEWAY_SECRET not configured')
      return NextResponse.json({
        text: "My brain is warming up, try again in a sec!",
        action: null,
      })
    }

    // Determine target URL and auth headers based on tier
    let targetUrl: string
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (routing.tier === 2 && routing.webhook_url) {
      // Tier 2: forward to user's own webhook
      // SSRF protection: require HTTPS and block private IPs
      if (!routing.webhook_url.startsWith('https://')) {
        return NextResponse.json({ error: 'Tier 2 webhook must use HTTPS' }, { status: 400 })
      }
      if (isPrivateUrl(routing.webhook_url)) {
        return NextResponse.json({ error: 'Tier 2 webhook cannot point to private networks' }, { status: 400 })
      }
      targetUrl = `${routing.webhook_url}/coaching`
      // Do NOT send gateway secret to Tier 2 user-controlled URLs.
      // Tier 2 agents authenticate via their own registered API key.
      // TODO: Add HMAC signature for Tier 2 webhook verification
    } else {
      // Tier 1: forward to managed gateway — safe to send gateway secret
      targetUrl = `${routing.gateway_url}/coaching`
      requestHeaders['Authorization'] = `Bearer ${gatewaySecret}`
    }

    // Forward coaching message to gateway/webhook
    const payload = {
      user_id: userId,
      message,
      match_id: matchId,
      mode,
      context,
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const gatewayRes = await fetch(targetUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!gatewayRes.ok) {
        console.error(`Gateway returned ${gatewayRes.status} from ${targetUrl}`)
        return NextResponse.json({
          text: "Hmm, I got a little confused there. Try again?",
          action: null,
        })
      }

      const data = await gatewayRes.json()

      return NextResponse.json({
        text: typeof data.text === 'string' ? data.text : "...",
        action: typeof data.action === 'string' ? data.action : null,
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.error('Gateway request timed out')
        return NextResponse.json({
          text: "I'm thinking extra hard... try again in a moment!",
          action: null,
        })
      }
      console.error('Gateway request failed:', err)
      return NextResponse.json({
        text: "My connection glitched! Give me another shot.",
        action: null,
      })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
