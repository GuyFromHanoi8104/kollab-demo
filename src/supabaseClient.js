import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Supabase persists sessions via localStorage by default, which survives a
// full browser restart regardless of any "Remember Me" UI -- to make that
// checkbox do something real, the session needs to land in sessionStorage
// (cleared when the tab/browser closes) when it's unchecked. This flag is
// what decides which one, and has to be plain localStorage itself (not
// gated by its own preference) so it's readable synchronously as soon as
// this module loads, before any login has happened this session.
const REMEMBER_ME_KEY = "kollab_remember_me";

function rememberMeEnabled() {
  const stored = localStorage.getItem(REMEMBER_ME_KEY);
  // No preference recorded yet (first-ever visit, or a signup that never
  // goes through this checkbox at all) -- default to remembered, matching
  // both Supabase's own native default and Login's checkbox default.
  return stored === null ? true : stored === "true";
}

export function setRememberMe(remember) {
  localStorage.setItem(REMEMBER_ME_KEY, remember ? "true" : "false");
}

// Supabase's auth.storage option just needs getItem/setItem/removeItem,
// matching the standard Storage interface -- this implements it by
// re-checking the preference on every call and delegating to the real
// localStorage or sessionStorage, rather than being locked to one at
// client-creation time (the preference can change between logins in the
// same tab).
const dynamicAuthStorage = {
  getItem: (key) => (rememberMeEnabled() ? localStorage : sessionStorage).getItem(key),
  setItem: (key, value) => (rememberMeEnabled() ? localStorage : sessionStorage).setItem(key, value),
  removeItem: (key) => (rememberMeEnabled() ? localStorage : sessionStorage).removeItem(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: dynamicAuthStorage },
});
