import { NextResponse } from 'next/server';
import { COSMETICS_CATALOG } from '@/lib/constants';

export async function GET() {
  return NextResponse.json({ catalog: COSMETICS_CATALOG });
}
