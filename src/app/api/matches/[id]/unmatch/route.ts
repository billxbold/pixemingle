import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify user is part of this match
  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .single();

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

  if (match.status === 'unmatched') {
    return NextResponse.json({ error: 'Already unmatched' }, { status: 400 });
  }

  await supabase
    .from('matches')
    .update({ status: 'unmatched', updated_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({ status: 'unmatched' });
}
