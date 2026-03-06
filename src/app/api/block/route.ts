import { createServerSupabase } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { blocked_id } = body as { blocked_id: string };

  if (!blocked_id) {
    return NextResponse.json({ error: 'blocked_id is required' }, { status: 400 });
  }

  if (blocked_id === user.id) {
    return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
  }

  // Insert block record
  const { error: blockError } = await supabase
    .from('blocks')
    .insert({
      blocker_id: user.id,
      blocked_id,
    });

  if (blockError) return NextResponse.json({ error: blockError.message }, { status: 500 });

  // Update any active matches between these users to 'unmatched'
  const { error: matchError } = await supabase
    .from('matches')
    .update({ status: 'unmatched' })
    .or(
      `and(user_a_id.eq.${user.id},user_b_id.eq.${blocked_id}),and(user_a_id.eq.${blocked_id},user_b_id.eq.${user.id})`
    )
    .in('status', ['active', 'pending_b']);

  if (matchError) return NextResponse.json({ error: matchError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
