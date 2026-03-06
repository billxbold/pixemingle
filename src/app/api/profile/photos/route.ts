import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('photo') as File
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const ext = file.name.split('.').pop()
  const path = `${user.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(path, file)

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage
    .from('photos')
    .getPublicUrl(path)

  // Append to user's photos array
  const { data: userData } = await supabase
    .from('users')
    .select('photos')
    .eq('id', user.id)
    .single()

  const photos = [...(userData?.photos || []), publicUrl]
  await supabase.from('users').update({ photos }).eq('id', user.id)

  return NextResponse.json({ url: publicUrl })
}
