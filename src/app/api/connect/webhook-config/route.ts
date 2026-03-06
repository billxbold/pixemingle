import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

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

    // Update webhook URL
    const { webhook_url } = await request.json()
    if (!webhook_url) {
      return NextResponse.json({ error: 'Missing webhook_url' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('openclaw_agents')
      .update({ webhook_url })
      .eq('id', agent.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Webhook config error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
