import { getAuthUserId, createServiceClient } from '@/lib/supabase-server'
import { PixelWorld } from '@/components/PixelWorld'
import type { AgentAppearance } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function WorldPage() {
  const userId = await getAuthUserId()

  let appearance: AgentAppearance | null = null
  if (userId) {
    const db = createServiceClient()
    const { data } = await db
      .from('users')
      .select('agent_appearance')
      .eq('id', userId)
      .single()
    appearance = (data?.agent_appearance as AgentAppearance) ?? null
  }

  return <PixelWorld userAppearance={appearance} />
}
