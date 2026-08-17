// TikTok Login Kit for Web.
//
// Same overall shape as instagramAuth.js -- send the creator to TikTok, get a
// single-use authorization code back on the query string, hand that to an Edge
// Function which alone holds the client secret. The browser never sees a token.
//
// Three things differ from Instagram in ways that matter:
//
//   * `client_key`, not `client_id`. Silently wrong-named params come back as
//     a generic error page after the creator has already logged in.
//   * Scopes are COMMA separated, not space separated.
//   * `state` is a required parameter, and it is a real CSRF defence rather
//     than paperwork: without it, an attacker can hand someone a link that
//     completes the OAuth dance and binds the ATTACKER's TikTok account to the
//     victim's Kollab profile. We generate it, stash it in sessionStorage, and
//     the callback refuses to proceed unless what comes back matches.

export const TIKTOK_CLIENT_KEY = import.meta.env.VITE_TIKTOK_CLIENT_KEY || "";

// Must exactly match a redirect URI registered under the app's Login Kit
// settings, and must sit under a verified URL property.
export const TIKTOK_REDIRECT_URI =
  import.meta.env.VITE_TIKTOK_REDIRECT_URI ||
  (typeof window !== "undefined" ? `${window.location.origin}/tiktok/callback` : "");

// user.info.basic is mandatory and added by default, but it carries only
// open_id/union_id/avatar/display_name -- follower_count was moved out of it in
// February 2024. user.info.stats is what actually returns the number this
// feature exists for. Nothing else is requested: every extra scope has to be
// demonstrated in the App Review screencast, and an undemonstrated scope delays
// the review.
export const TIKTOK_SCOPES =
  import.meta.env.VITE_TIKTOK_SCOPES || "user.info.basic,user.info.stats";

const AUTH_BASE = "https://www.tiktok.com/v2/auth/authorize/";
const STATE_KEY = "kollab_tiktok_oauth_state";

/** True when the client key is configured; the button should explain itself otherwise. */
export function isTikTokConfigured() {
  return Boolean(TIKTOK_CLIENT_KEY);
}

/**
 * Full TikTok login URL to send the creator to.
 *
 * Generates and stores the CSRF state as a side effect, so this must be called
 * at the moment of navigation rather than cached.
 */
export function buildTikTokOAuthUrl() {
  const state = crypto.randomUUID().replace(/-/g, "");
  // sessionStorage, not localStorage: scoped to this tab and cleared when it
  // closes, which matches the lifetime of a single OAuth round trip.
  try {
    sessionStorage.setItem(STATE_KEY, state);
  } catch {
    // Private browsing with storage disabled. The callback treats a missing
    // stored state as a failure rather than waving it through.
  }
  const params = new URLSearchParams({
    client_key: TIKTOK_CLIENT_KEY,
    response_type: "code",
    scope: TIKTOK_SCOPES,
    redirect_uri: TIKTOK_REDIRECT_URI,
    state,
  });
  return `${AUTH_BASE}?${params}`;
}

/**
 * Read what TikTok appended on the way back.
 *
 * Success is `?code=...&scopes=...&state=...`. A declined dialog comes back as
 * `?error=access_denied&error_description=...`.
 *
 * @returns {{code: string|null, state: string|null, scopes: string|null, error: string|null}}
 */
export function readTikTokRedirect(locationLike = window.location) {
  const query = new URLSearchParams(locationLike.search || "");
  return {
    code: query.get("code") || null,
    state: query.get("state") || null,
    scopes: query.get("scopes") || null,
    error: query.get("error_description") || query.get("error") || null,
  };
}

/**
 * Read and clear the state we stored before redirecting. Single-use by
 * design -- a replayed callback finds nothing to match against.
 */
export function consumeStoredState() {
  try {
    const stored = sessionStorage.getItem(STATE_KEY);
    sessionStorage.removeItem(STATE_KEY);
    return stored;
  } catch {
    return null;
  }
}

/**
 * Clear the code from the address bar once read. It is single-use, so this
 * avoids a confusing "already used" failure if the page is refreshed.
 */
export function stripCodeFromUrl() {
  if (typeof window === "undefined") return;
  window.history.replaceState({}, document.title, window.location.pathname);
}
