import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { AuthContext } from "./authStore";

// Wraps the whole app (see App.jsx). Tracks the real Supabase session plus
// the matching `profiles` row (role, name, ...), replacing the old
// sessionStorage mock flags. `loading` stays true until the initial session
// check resolves, so consumers (ProtectedRoute in particular) can avoid
// flashing a redirect before we know whether someone's logged in.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!active) return;
      setSession(initialSession);
      if (initialSession?.user) {
        loadProfile(initialSession.user.id).finally(() => active && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession?.user) {
        loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  // Consumers that write to their own `profiles` row (Settings, MyProfile)
  // call this afterward so every component reading from useAuth() -- not
  // just the one that made the edit -- sees the update immediately.
  const refreshProfile = useCallback(() => {
    return session?.user ? loadProfile(session.user.id) : Promise.resolve();
  }, [session, loadProfile]);

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? "brand",
    name: profile?.name ?? null,
    isLoggedIn: !!session,
    loading,
    signOut: () => supabase.auth.signOut(),
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
