import { useEffect, useState } from "react";
import { supabase } from "./config";
import { clearPortalAccess, clearLoginAttempt } from "../utils/authAccess";

// Keep the resolved Supabase user in module memory. Route navigation remounts
// page components, but it should NOT make every new page briefly behave as if
// auth is unknown again. This prevents the "demo/default user" flash between
// Farmer/Public/PDMA pages while still re-checking the real Supabase session.
let cachedUser;
let sessionResolved = false;
let sessionPromise = null;

function resolveSessionOnce() {
  if (sessionResolved) return Promise.resolve(cachedUser ?? null);

  if (!sessionPromise) {
    sessionPromise = supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        cachedUser = data.session?.user ?? null;
        sessionResolved = true;
        return cachedUser;
      })
      .finally(() => {
        sessionPromise = null;
      });
  }

  return sessionPromise;
}

// Same shape as the old Firebase useGoogleAuth() hook — user / loading /
// error / signIn / signOut — so the rest of the app barely has to change.
export function useSupabaseAuth() {
  const [user, setUser] = useState(() => (sessionResolved ? cachedUser ?? null : undefined));
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    resolveSessionOnce()
      .then((resolvedUser) => {
        if (mounted) setUser(resolvedUser);
      })
      .catch((err) => {
        console.error("Couldn't read Supabase session:", err);
        cachedUser = null;
        sessionResolved = true;
        if (mounted) {
          setUser(null);
          setError(err);
        }
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      cachedUser = session?.user ?? null;
      sessionResolved = true;
      if (mounted) setUser(cachedUser);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(redirectTo = `${window.location.origin}/admin-portal`, { forceAccountChoice = false } = {}) {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        ...(forceAccountChoice ? { queryParams: { prompt: "select_account" } } : {}),
      },
    });
    if (signInError) {
      console.error("Google sign-in failed:", signInError);
      setError(signInError);
    }
  }

  async function signOut() {
    clearPortalAccess();
    clearLoginAttempt();
    cachedUser = null;
    sessionResolved = true;
    setUser(null);
    await supabase.auth.signOut();
  }

  return { user, loading: user === undefined, error, signIn, signOut };
}
