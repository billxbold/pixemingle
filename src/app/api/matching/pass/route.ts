import { NextResponse } from 'next/server'

export async function POST() {
  // For MVP, passing just removes the candidate from the UI.
  // No server-side state needed — candidates are re-fetched each search.
  return NextResponse.json({ ok: true })
}
