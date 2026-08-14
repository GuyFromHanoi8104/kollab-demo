// Meta "Facebook Login for Business" helpers for connecting a creator's
// Instagram Business/Creator account.
//
// Only the App ID appears here. It is not a secret -- it is visible in the
// OAuth URL every user is sent to. The App Secret lives solely in the
// instagram-connect Edge Function's secrets and must never be imported into
// anything the browser downloads.

// Overridable so a staging build can point at a different Meta app without a
// code change.
export const META_APP_ID = import.meta.env.VITE_META_APP_ID || "1466493708808617";

// Must match a redirect URI registered in the Meta App Dashboard *exactly* --
// scheme, host, port, path and trailing slash. A mismatch fails at Meta's end
// with "URL Blocked" before the user ever gets back here, so this is
// overridable per environment rather than hardcoded to production.
export const INSTAGRAM_REDIRECT_URI =
  import.meta.env.VITE_INSTAGRAM_REDIRECT_URI ||
  (typeof window !== "undefined" ? `${window.location.origin}/instagram/callback` : "");

// instagram_basic + pages_show_list are what Meta's own "get started" guide
// requires for GET /me/accounts to return a Page's instagram_business_account.
// pages_read_engagement is included because reads on the Page-derived
// Instagram node are refused without it on most app configurations.
// Overridable: the exact set an app may request depends on what has been
// added and approved in its App Dashboard, so this needs confirming there
// rather than being taken on faith from a docs page.
export const INSTAGRAM_SCOPES =
  import.meta.env.VITE_INSTAGRAM_SCOPES ||
  "instagram_basic,pages_show_list,pages_read_engagement";

const OAUTH_BASE = "https://www.facebook.com/v26.0/dialog/oauth";

/** Full Meta login URL to send the creator to. */
export function buildInstagramOAuthUrl() {
  const params = new URLSearchParams({
    client_id: META_APP_ID,
    display: "page",
    // Routes the user through Meta's Instagram onboarding rather than plain
    // Facebook login, so an unlinked IG account can be attached inline.
    extras: JSON.stringify({ setup: { channel: "IG_API_ONBOARDING" } }),
    redirect_uri: INSTAGRAM_REDIRECT_URI,
    response_type: "token",
    scope: INSTAGRAM_SCOPES,
  });
  return `${OAUTH_BASE}?${params}`;
}

/**
 * Read what Meta appended on the way back.
 *
 * Success lands in the URL *fragment* (response_type=token), which never
 * reaches a server -- deliberate, since it carries a token. Failures
 * (a declined dialog) come back on the query string instead, so both are
 * parsed here.
 *
 * @returns {{accessToken: string|null, longLivedToken: string|null, error: string|null}}
 */
export function readInstagramRedirect(locationLike = window.location) {
  const fragment = new URLSearchParams((locationLike.hash || "").replace(/^#/, ""));
  const query = new URLSearchParams(locationLike.search || "");

  const error =
    query.get("error_description") ||
    query.get("error_reason") ||
    query.get("error") ||
    fragment.get("error_description") ||
    fragment.get("error") ||
    null;

  return {
    accessToken: fragment.get("access_token"),
    longLivedToken: fragment.get("long_lived_token"),
    error,
  };
}

/**
 * Remove the token from the address bar as soon as it has been read, so it
 * isn't left sitting in history, or copied out of the URL bar by a user
 * sharing "the page that broke".
 */
export function stripTokenFromUrl() {
  if (typeof window === "undefined") return;
  window.history.replaceState({}, document.title, window.location.pathname);
}
