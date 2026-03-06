import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: purchases, error } = await supabase
    .from('purchases')
    .select('item_id, item_type, amount_cents, created_at')
    .eq('user_id', user.id)
    .eq('item_type', 'cosmetic')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ owned: purchases || [] });
}
