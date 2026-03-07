import { createServerSupabase } from '@/lib/supabase-server'
import { PixelWorld } from '@/components/PixelWorld'
import type { AgentAppearance } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function WorldPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  let appearance: AgentAppearance | null = null
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('agent_appearance')
      .eq('id', user.id)
      .single()
    appearance = (data?.agent_appearance as AgentAppearance) ?? null
  }

  return <PixelWorld userAppearance={appearance} />
}
