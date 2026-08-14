// Business Login for Instagram ("Instagram API with Instagram Login").
//
// This replaces the earlier Facebook Login for Business flow. That one required
// every creator to own a Facebook Page, link their Instagram to it, and for the
// app to hold Advanced Access before anyone outside the app's own testers could
// connect at all. For a creator marketplace that is a signup-killing amount of
// friction -- plenty of Instagram creators have no Facebook Page and no reason
// to make one.
//
// Instagram Login authenticates against the Instagram professional account
// directly. No Facebook Page, no Page linking, and no /me/accounts enumeration
// (which returned an empty list on a real account even though the Page and the
// link both existed).
//
// Two things differ from the Facebook flow in ways that matter:
//
//   * The client id is the INSTAGRAM app id, shown under
//     Instagram > API setup with Instagram login in the App Dashboard. It is
//     NOT the Facebook App ID -- they are different numbers and swapping them
//     fails in confusing ways.
//   * The redirect returns an authorization CODE on the query string, not a
//     token in the fragment. The code is useless without the app secret, so
//     nothing sensitive is ever exposed to the browser -- strictly better than
//     the previous flow, which handed the browser a real access token.

// No default: the Instagram app id is per-app and guessing it would produce a
// login page that fails after the user has already typed their password.
export const INSTAGRAM_APP_ID = import.meta.env.VITE_INSTAGRAM_APP_ID || "";

// Must exactly match a URI registered under Instagram > API setup with
// Instagram login. That list is SEPARATE from the Facebook Login redirect URIs
// -- registering it in one does not register it in the other.
export const INSTAGRAM_REDIRECT_URI =
  import.meta.env.VITE_INSTAGRAM_REDIRECT_URI ||
  (typeof window !== "undefined" ? `${window.location.origin}/instagram/callback` : "");

// instagram_business_basic covers profile fields including followers_count.
// The other scopes (content publishing, messages, comments) grant abilities
// this app has no use for, and asking for them would make the consent screen
// scarier than the feature warrants.
export const INSTAGRAM_SCOPES =
  import.meta.env.VITE_INSTAGRAM_SCOPES || "instagram_business_basic";

const AUTH_BASE = "https://www.instagram.com/oauth/authorize";

/** True when the app id is configured; the button should explain itself otherwise. */
export function isInstagramConfigured() {
  return Boolean(INSTAGRAM_APP_ID);
}

/** Full Instagram login URL to send the creator to. */
export function buildInstagramOAuthUrl() {
  const params = new URLSearchParams({
    client_id: INSTAGRAM_APP_ID,
    redirect_uri: INSTAGRAM_REDIRECT_URI,
    response_type: "code",
    scope: INSTAGRAM_SCOPES,
  });
  return `${AUTH_BASE}?${params}`;
}

/**
 * Read what Instagram appended on the way back.
 *
 * Success is `?code=...` on the query string. A declined dialog comes back as
 * `?error=access_denied&error_description=...`. The fragment is still checked
 * because Meta has historically used it for errors, and missing an error
 * message is worse than looking in one extra place.
 *
 * @returns {{code: string|null, error: string|null}}
 */
export function readInstagramRedirect(locationLike = window.location) {
  const query = new URLSearchParams(locationLike.search || "");
  const fragment = new URLSearchParams((locationLike.hash || "").replace(/^#/, ""));

  const error =
    query.get("error_description") ||
    query.get("error_reason") ||
    query.get("error") ||
    fragment.get("error_description") ||
    fragment.get("error") ||
    null;

  // Instagram appends #_ to the redirect; harmless, but strip it so a bare
  // fragment isn't mistaken for content.
  const code = (query.get("code") || "").replace(/#_$/, "") || null;

  return { code, error };
}

/**
 * Clear the code from the address bar once read. It is single-use and expires
 * in an hour, so this is tidiness rather than a security boundary -- but a URL
 * that still contains a spent code invites confusing retries if the page is
 * refreshed or the link is shared.
 */
export function stripCodeFromUrl() {
  if (typeof window === "undefined") return;
  window.history.replaceState({}, document.title, window.location.pathname);
}
