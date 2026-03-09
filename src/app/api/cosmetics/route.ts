import { NextResponse } from 'next/server';
import { COSMETICS_CATALOG } from '@/lib/constants';

// Public catalog endpoint — no auth required. The catalog is non-sensitive
// static data that can be shown to unauthenticated users (e.g., on landing page).
export async function GET() {
  return NextResponse.json({ catalog: COSMETICS_CATALOG });
}
