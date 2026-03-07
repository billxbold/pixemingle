import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Dev-only: returns the user ID from the dev-user-id cookie if present.
 */
export async function getDevUserId(): Promise<string | null> {
  if (process.env.NODE_ENV !== 'development') return null
  const cookieStore = await cookies()
  return cookieStore.get('dev-user-id')?.value ?? null
}

/**
 * Returns the authenticated user's ID.
 * In dev mode, falls back to the dev-user-id cookie.
 * Returns null if unauthenticated.
 */
export async function getAuthUserId(): Promise<string | null> {
  const devId = await getDevUserId()
  if (devId) return devId
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component — safe to ignore,
            // middleware handles session refresh.
          }
        },
      },
    }
  );
}

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
