import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify user is part of this match
  const { data: match } = await supabase
    .from('matches')
    .select('user_a_id, user_b_id')
    .eq('id', matchId)
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .single();

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

  const { data: messages } = await supabase
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
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { content } = await request.json();
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'Empty message' }, { status: 400 });
  }
  if (content.length > 500) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 });
  }

  // Verify user is part of an active match
  const { data: match } = await supabase
    .from('matches')
    .select('user_a_id, user_b_id, status')
    .eq('id', matchId)
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .single();

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  if (match.status !== 'active') {
    return NextResponse.json({ error: 'Match is not active' }, { status: 400 });
  }

  // Rate limit
  const { data: userProfile } = await supabase
    .from('users')
    .select('tier')
    .eq('id', user.id)
    .single();

  const tier = userProfile?.tier || 'free';
  const rateCheck = checkRateLimit(user.id, 'chat', tier);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Chat rate limit reached', remaining: rateCheck.remaining },
      { status: 429 }
    );
  }

  const { data: message, error } = await supabase
    .from('chat_messages')
    .insert({
      match_id: matchId,
      sender_id: user.id,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message });
}
