import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Returns the current Supabase session:
 *   undefined  — still loading (don't render yet)
 *   null       — no session (show login)
 *   Session    — authenticated user
 */
export function useAuthSession() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    if (!supabase) {
      // Supabase not configured — open access (dev fallback)
      setSession(null);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return session;
}
