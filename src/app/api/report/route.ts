import { getAuthUserId, createServiceClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

const VALID_REASONS = ['fake_photos', 'inappropriate', 'spam', 'other'] as const;

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { reported_id, reason, details } = body as { reported_id: string; reason: string; details?: string };

  if (!reported_id || !reason) return NextResponse.json({ error: 'reported_id and reason are required' }, { status: 400 });
  if (!VALID_REASONS.includes(reason as typeof VALID_REASONS[number])) {
    return NextResponse.json({ error: `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}` }, { status: 400 });
  }
  if (reported_id === userId) return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 });

  const db = createServiceClient();
  const { error } = await db.from('reports').insert({ reporter_id: userId, reported_id, reason, details: details || null });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
