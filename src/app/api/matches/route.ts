import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get active and pending matches with partner info
  const { data: matches, error } = await supabase
    .from('matches')
    .select('*, user_a:users!user_a_id(id, name, photos, agent_appearance, soul_type), user_b:users!user_b_id(id, name, photos, agent_appearance, soul_type)')
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .in('status', ['active', 'pending_b'])
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Annotate each match with the partner info
  const annotated = (matches || []).map((match) => {
    const isUserA = match.user_a_id === user.id;
    return {
      ...match,
      partner: isUserA ? match.user_b : match.user_a,
      role: isUserA ? 'initiator' : 'responder',
    };
  });

  return NextResponse.json({ matches: annotated });
}
