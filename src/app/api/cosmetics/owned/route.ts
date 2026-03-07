import { getAuthUserId, createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServiceClient();
  const { data: purchases, error } = await db
    .from('purchases')
    .select('item_id, item_type, amount_cents, created_at')
    .eq('user_id', userId)
    .eq('item_type', 'cosmetic')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ owned: purchases || [] });
}
