import { getAuthUserId, createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServiceClient();
  const { data: profile, error } = await db.from('users').select('tier').eq('id', userId).single();
  if (error) {
    console.error('Failed to check payment status:', error.message);
    return NextResponse.json({ error: 'Failed to check payment status' }, { status: 500 });
  }

  return NextResponse.json({ tier: profile?.tier || 'free' });
}
