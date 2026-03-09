import { getAuthUserId, createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { checkRateLimit, checkEndpointRateLimit } from '@/lib/rate-limit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  if (!UUID_RE.test(matchId)) {
    return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
  }
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimitResult = checkEndpointRateLimit(userId, 'chat-get', 30, 60);
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const db = createServiceClient();

  // Verify user is part of this match
  const { data: match } = await db
    .from('matches')
    .select('user_a_id, user_b_id')
    .eq('id', matchId)
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .single();

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

  const { data: messages } = await db
    .from('chat_messages')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true })
    .limit(200);

  return NextResponse.json({ messages: messages || [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  if (!UUID_RE.test(matchId)) {
    return NextResponse.json({ error: 'Invalid match ID' }, { status: 400 });
  }
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServiceClient();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { content } = body as { content?: string };
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'Empty message' }, { status: 400 });
  }
  if (content.length > 500) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  }

  // Verify user is part of an active match
  const { data: match } = await db
    .from('matches')
    .select('user_a_id, user_b_id, status')
    .eq('id', matchId)
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .single();

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  if (!['active', 'pending_b'].includes(match.status)) {
    return NextResponse.json({ error: 'Match is not active' }, { status: 400 });
  }

  // Rate limit
  const { data: userProfile } = await db
    .from('users')
    .select('tier')
    .eq('id', userId)
    .single();

  const tier = userProfile?.tier || 'free';
  const rateCheck = checkRateLimit(userId, 'chat', tier);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Chat rate limit reached', remaining: rateCheck.remaining },
      { status: 429 }
    );
  }

  const { data: message, error } = await db
    .from('chat_messages')
    .insert({
      match_id: matchId,
      sender_id: userId,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to send chat message:', error.message);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }

  return NextResponse.json({ message });
}
