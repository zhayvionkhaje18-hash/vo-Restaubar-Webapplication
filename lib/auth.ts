import { createClient } from "@/lib/supabase/server"
import type { Profile } from "@/lib/types"

/**
 * Returns the authenticated user's profile, or null if not signed in.
 *
 * Self-healing: if the auth user exists but the public.profiles row is missing
 * (e.g. the user was created manually in the Supabase dashboard and the
 * `handle_new_user()` trigger never fired, or the schema wasn't fully run),
 * this will call the `ensure_profile()` SECURITY DEFINER function to backfill
 * the row using the user's auth metadata.
 */
export async function getSessionProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (profile) return profile as Profile

  // Profile row missing — try to backfill via the SECURITY DEFINER function.
  // This bypasses RLS using the function owner's privileges.
  const { data: ensured, error: ensureErr } = await supabase.rpc("ensure_profile")
  if (ensureErr) {
    console.error("[auth] ensure_profile failed:", ensureErr.message)
    return null
  }
  if (!ensured) return null

  // The RPC returns an array of one row; normalize to a single object.
  const row = Array.isArray(ensured) ? ensured[0] : ensured
  return (row as Profile) ?? null
}
