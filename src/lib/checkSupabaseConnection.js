import { supabase } from "./supabaseClient";

/**
 * Dev-only utility. Call from browser console:
 *   import('/src/lib/checkSupabaseConnection.js').then(m => m.checkSupabaseConnection())
 *
 * Returns { ok: true } if connected, or { ok: false, error } on failure.
 */
export async function checkSupabaseConnection() {
  if (!supabase) {
    console.error("[Supabase] Client not initialized — check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local");
    return { ok: false, error: "Client not initialized" };
  }

  try {
    const { error } = await supabase.auth.getSession();
    if (error) throw error;
    console.info("[Supabase] ✓ Connected successfully");
    return { ok: true };
  } catch (err) {
    console.error("[Supabase] ✗ Connection failed:", err.message);
    return { ok: false, error: err.message };
  }
}
