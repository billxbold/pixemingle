import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserId } from '@/lib/supabase-server'
import { checkEndpointRateLimit } from '@/lib/rate-limit'

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

    const body = await req.json()
    const message = body.message
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    if (message.length > 500) {
      return NextResponse.json({ error: 'Message too long (max 500 characters)' }, { status: 400 })
    }

    // TODO: Route to OpenClaw agent brain via Gateway
    // For now, return a placeholder acknowledgment
    return NextResponse.json({
      reply: 'Agent coaching will be available when OpenClaw Gateway is connected.',
      action: null,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
