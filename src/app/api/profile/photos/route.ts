import { getAuthUserId, createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { checkEndpointRateLimit } from '@/lib/rate-limit'

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: Request) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rateLimitResult = checkEndpointRateLimit(userId, 'profile_photos', 10, 60)
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('photo') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    // Validate file size (max 5MB)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
    }
    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Validate extension
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` }, { status: 400 })
    }

    const db = createServiceClient()

    const path = `${userId}/${Date.now()}.${ext}`

    const { error: uploadError } = await db.storage.from('photos').upload(path, file)
    if (uploadError) {
      console.error('Photo upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 })
    }

    const { data: { publicUrl } } = db.storage.from('photos').getPublicUrl(path)

    const { data: userData } = await db.from('users').select('photos').eq('id', userId).single()
    const photos = [...(userData?.photos || []), publicUrl]
    await db.from('users').update({ photos }).eq('id', userId)

    return NextResponse.json({ url: publicUrl })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
