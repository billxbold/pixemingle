import { getAuthUserId, createServiceClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { checkEndpointRateLimit } from '@/lib/rate-limit';

const VALID_REASONS = ['fake_photos', 'inappropriate', 'spam', 'other'] as const;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimitResult = checkEndpointRateLimit(userId, 'report', 5, 60);
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { reported_id, reason, details } = body as { reported_id: string; reason: string; details?: string };

  if (!reported_id || !reason) return NextResponse.json({ error: 'reported_id and reason are required' }, { status: 400 });
  if (!UUID_REGEX.test(reported_id)) {
    return NextResponse.json({ error: 'Invalid reported_id format' }, { status: 400 });
  }
  if (!VALID_REASONS.includes(reason as typeof VALID_REASONS[number])) {
    return NextResponse.json({ error: `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}` }, { status: 400 });
  }
  if (reported_id === userId) return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 });

  const db = createServiceClient();
  const { error } = await db.from('reports').insert({ reporter_id: userId, reported_id, reason, details: details || null });
  if (error) {
    console.error('Failed to create report:', error.message);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
