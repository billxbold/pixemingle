import { getAuthUserId, createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('photo') as File
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const db = createServiceClient()

  const ext = file.name.split('.').pop()
  const path = `${userId}/${Date.now()}.${ext}`

  const { error: uploadError } = await db.storage.from('photos').upload(path, file)
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = db.storage.from('photos').getPublicUrl(path)

  const { data: userData } = await db.from('users').select('photos').eq('id', userId).single()
  const photos = [...(userData?.photos || []), publicUrl]
  await db.from('users').update({ photos }).eq('id', userId)

  return NextResponse.json({ url: publicUrl })
}
