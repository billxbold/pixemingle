import { getAuthUserId, createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const LLM_MODEL = process.env.LLM_MODEL || 'claude-haiku-4-5-20251001'

export async function POST(request: Request) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, context } = await request.json()
  if (!message) return NextResponse.json({ error: 'No message' }, { status: 400 })

  const db = createServiceClient()
  const { data: profile } = await db
    .from('users')
    .select('name, soul_type, gender, looking_for, bio, personality')
    .eq('id', userId)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const response = await anthropic.messages.create({
    model: LLM_MODEL,
    max_tokens: 150,
    system: `You are a pixel art dating agent for ${profile.name}. You are ${profile.soul_type} soul type. You are charming, helpful, and theatrical. Keep responses to 1-2 short sentences. You live in a pixel world and help your user find dates. You can be asked to search for matches, comment on candidates, or just chat.

Context: ${context || 'User is in their home scene, chatting with you.'}

Respond in character. Be entertaining. Never break character.`,
    messages: [{ role: 'user', content: message }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : "Hmm, let me think about that..."

  let action: string | null = null
  const lower = message.toLowerCase()
  if (lower.includes('find') || lower.includes('search') || lower.includes('match')) action = 'search'
  if (lower.includes('next') || lower.includes('another') || lower.includes('pass') || lower.includes('skip')) action = 'next'
  if (lower.includes('send') || lower.includes('go for') || lower.includes('like')) action = 'approve'

  return NextResponse.json({ text, action })
}
