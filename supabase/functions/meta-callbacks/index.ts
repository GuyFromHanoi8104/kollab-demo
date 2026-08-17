// Supabase Edge Function: meta-callbacks
//
// The two privacy endpoints Meta requires before granting Advanced Access for
// instagram_business_basic. App Review blocks on both.
//
//   POST /meta-callbacks/deauthorize     Deauthorize Callback URL
//   POST /meta-callbacks/data-deletion   Data Deletion Request Callback URL
//   GET  /meta-callbacks/data-deletion?code=...   the status page Meta requires
//
// One function rather than two because Supabase routes every sub-path to the
// same function, so this keeps the signed_request verification in ONE place.
// Splitting it would either duplicate the crypto across two files -- the last
// thing you want in the code that decides whether to erase someone's data --
// or need a _shared/ import, which only bundles when deploying via the CLI,
// not from the dashboard editor.
//
// AUTHENTICATION: there is none, in the usual sense. Meta's servers have no
// Supabase session, so both endpoints must be reachable unauthenticated, and
// the HMAC-SHA256 signature on signed_request is the entire security boundary.
// It is verified before a single row is touched, and the account is matched on
// the id Meta signed -- never on anything else in the request.
//
// Deploy (does NOT happen on git push). Verify JWT must be OFF, or the
// platform rejects Meta's POST and the public status page before this code
// runs. From the dashboard: Edge Functions -> meta-callbacks -> Details ->
// turn off "Verify JWT with legacy secret". Via CLI:
//   supabase functions deploy meta-callbacks --no-verify-jwt
//
// Uses the same INSTAGRAM_APP_SECRET as instagram-connect, and requires
// supabase/migrations/20260815_data_deletion_requests.sql.

import { createClient } from "npm:@supabase/supabase-js@2";

// Used to tell "/meta-callbacks" (no route) from "/meta-callbacks/<route>".
// Renaming the deployed function means changing this too.
const FUNCTION_NAME = "meta-callbacks";

/** Everything Meta ever gives us, and therefore everything a deletion erases. */
const INSTAGRAM_DERIVED_COLUMNS = [
  "instagram_access_token",
  "instagram_business_account_id",
  "instagram_connected_at",
  "instagram_followers",
] as const;

const COLUMN_LABELS: Record<string, string> = {
  instagram_access_token: "Your Instagram access token",
  instagram_business_account_id: "Your Instagram account ID",
  instagram_connected_at: "The date you connected Instagram",
  instagram_followers: "Your Instagram follower count",
};

// ------------------------------------------------------- signed_request

/** base64url -> bytes. Meta omits the `=` padding that atob() requires. */
function base64UrlDecode(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

interface SignedRequestPayload {
  algorithm: string;
  /** App-scoped user id. Under Instagram Login this is the Instagram user id,
   *  i.e. what `connect` stored in profiles.instagram_business_account_id. */
  user_id?: string;
  issued_at?: number;
  [key: string]: unknown;
}

/**
 * Throws unless `signedRequest` carries a valid signature for `appSecret`.
 *
 * Format: {base64url signature}.{base64url payload}. The signature covers the
 * *raw payload string*, so it is checked exactly as received -- re-encoding the
 * decoded JSON before verifying would be a bug.
 */
async function verifySignedRequest(
  signedRequest: string,
  appSecret: string,
): Promise<SignedRequestPayload> {
  const dot = signedRequest.indexOf(".");
  if (dot <= 0 || dot === signedRequest.length - 1) {
    throw new Error("Malformed signed_request");
  }
  const encodedSignature = signedRequest.slice(0, dot);
  const encodedPayload = signedRequest.slice(dot + 1);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  // crypto.subtle.verify compares in constant time, so this doesn't leak the
  // expected signature a byte at a time the way a `===` on hex would.
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlDecode(encodedSignature),
    new TextEncoder().encode(encodedPayload),
  );
  if (!valid) throw new Error("Invalid signed_request signature");

  let payload: SignedRequestPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload)));
  } catch {
    throw new Error("Unreadable signed_request payload");
  }

  // Guard against a downgrade to a weaker/unknown algorithm: the signature just
  // checked is only meaningful if Meta says it signed it the same way.
  if (String(payload.algorithm ?? "").toUpperCase() !== "HMAC-SHA256") {
    throw new Error("Unexpected signed_request algorithm");
  }
  return payload;
}

/**
 * Pulls `signed_request` out of a callback POST. Meta sends it form-encoded;
 * JSON is accepted too so the endpoint can be exercised by hand.
 */
async function readSignedRequest(req: Request): Promise<string | null> {
  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = await req.json();
      return typeof body?.signed_request === "string" ? body.signed_request : null;
    }
    const value = (await req.formData()).get("signed_request");
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Verifies the POST and returns the Instagram user id Meta signed.
 * On any failure returns a ready-made Response to send back instead.
 */
async function authenticate(
  req: Request,
): Promise<{ userId: string } | { response: Response }> {
  const appSecret = Deno.env.get("INSTAGRAM_APP_SECRET") ?? "";
  if (!appSecret) {
    // 500, not 400: this is our misconfiguration, and a Meta retry once the
    // secret is set is the right outcome.
    return { response: jsonResponse({ error: "INSTAGRAM_APP_SECRET is not set" }, 500) };
  }

  const signedRequest = await readSignedRequest(req);
  if (!signedRequest) {
    return { response: jsonResponse({ error: "Missing signed_request" }, 400) };
  }

  try {
    const payload = await verifySignedRequest(signedRequest, appSecret);
    const userId = String(payload.user_id ?? "");
    if (!userId) {
      return { response: jsonResponse({ error: "signed_request carried no user_id" }, 400) };
    }
    return { userId };
  } catch (err) {
    // Deliberately terse: an unsigned caller learns only that it failed, not
    // which check it tripped or whether the account exists.
    console.error("meta-callbacks: rejected signed_request:", err);
    return { response: jsonResponse({ error: "Invalid signed_request" }, 400) };
  }
}

// ------------------------------------------------------------- responses

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function htmlResponse(body: string, status: number) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

function statusUrlFor(code: string) {
  const base = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
  return `${base}/functions/v1/${FUNCTION_NAME}/data-deletion?code=${encodeURIComponent(code)}`;
}

function formatDate(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString("en-GB", {
        day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
      });
}

// ----------------------------------------------------------- status page

/** Shared chrome. Inline styles only -- nothing external is reachable here. */
function page(title: string, inner: string) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} — Kollab</title>
<style>
  :root { color-scheme: light; }
  body {
    margin: 0; padding: 40px 20px; background: #f7f8fa; color: #434655;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.6;
  }
  .card {
    max-width: 640px; margin: 0 auto; background: #fff; border-radius: 16px;
    padding: 40px; box-sizing: border-box; border: 1px solid rgba(195,198,215,0.4);
  }
  h1 { color: #191c1e; font-size: 26px; margin: 0 0 8px; }
  h2 { color: #191c1e; font-size: 16px; margin: 32px 0 8px; }
  p { margin: 0 0 12px; }
  ul { margin: 0 0 12px; padding-left: 20px; }
  li { margin-bottom: 4px; }
  .brand { font-weight: 800; color: #191c1e; font-size: 20px; margin: 0 0 24px; }
  .badge {
    display: inline-block; padding: 4px 12px; border-radius: 999px;
    font-size: 13px; font-weight: 600; background: #e6f4ea; color: #137333;
  }
  .badge.muted { background: #eceef2; color: #434655; }
  .code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    background: #f2f3f7; border-radius: 8px; padding: 10px 14px; display: block;
    word-break: break-all; font-size: 14px; color: #191c1e;
  }
  a { color: #2563eb; }
  @media (max-width: 480px) { .card { padding: 28px 20px; } h1 { font-size: 22px; } }
</style>
</head>
<body>
  <div class="card">
    <p class="brand">Kollab</p>
    ${inner}
  </div>
</body>
</html>`;
}

/** Shown on every status page: what this process does and does not cover. */
const SCOPE_NOTE = `
    <h2>What this covers</h2>
    <p>
      This request covers the data Kollab received from Instagram. It does not
      delete your Kollab account, because your account, profile and campaign
      history were created by you directly on Kollab — Instagram never supplied
      them, so they are outside what Instagram can ask us to erase on your
      behalf.
    </p>
    <p>
      If you also want your Kollab account deleted, you can do that yourself
      under <strong>Settings → Delete Account</strong>, or email
      <a href="mailto:linh.kollab@gmail.com">linh.kollab@gmail.com</a>.
    </p>`;

function renderIntro() {
  return page(
    "Data deletion",
    `<h1>Instagram data deletion</h1>
    <p>
      This page confirms requests to delete the Instagram data Kollab holds
      about you.
    </p>
    <p>
      You can start one at any time from Instagram, under
      <strong>Settings → Apps and websites</strong>, by removing Kollab. You can
      also disconnect Instagram directly in Kollab under
      <strong>My Profile</strong>, which erases the same connection data.
    </p>
    <p>
      If you already have a confirmation code, open the link that came with it
      to see the status of that request.
    </p>
    ${SCOPE_NOTE}`,
  );
}

function renderUnknownCode() {
  // Deliberately does not echo the submitted code back, and does not
  // distinguish "expired" from "never existed" -- neither would help a real
  // requester, and both would help someone guessing at codes.
  return page(
    "Request not found",
    `<h1>We couldn't find that request</h1>
    <p>
      No deletion request matches that confirmation code. Check that the whole
      link was copied, including everything after <code>code=</code>.
    </p>
    <p>
      If it still doesn't work, email
      <a href="mailto:linh.kollab@gmail.com">linh.kollab@gmail.com</a> and we'll
      confirm the status for you.
    </p>
    ${SCOPE_NOTE}`,
  );
}

function renderStatus(row: {
  confirmation_code: string;
  status: string;
  deleted_items: string[] | null;
  requested_at: string;
  completed_at: string | null;
}) {
  const requested = formatDate(row.requested_at);
  const completed = formatDate(row.completed_at);
  const foundData = row.status === "completed";

  const items = (row.deleted_items ?? [])
    .map((c) => `<li>${escapeHtml(COLUMN_LABELS[c] ?? c)}</li>`)
    .join("");

  const outcome = foundData
    ? `<h2>What was deleted</h2>
       <p>Everything Kollab had received from Instagram about you was erased:</p>
       <ul>${items}</ul>
       <p>
         Kollab no longer holds an Instagram access token for you, and your
         profile no longer shows Instagram-verified statistics.
       </p>`
    : `<h2>What was deleted</h2>
       <p>
         Nothing needed deleting. Kollab held no Instagram data for this account
         when the request arrived — most often because the connection had
         already been removed.
       </p>`;

  return page(
    "Deletion confirmed",
    `<h1>Your data has been deleted</h1>
    <p>
      <span class="badge${foundData ? "" : " muted"}">
        ${foundData ? "Completed" : "Completed — no data held"}
      </span>
    </p>
    <h2>Confirmation code</h2>
    <span class="code">${escapeHtml(row.confirmation_code)}</span>
    <p style="margin-top:12px">
      Received ${escapeHtml(requested ?? "recently")}${
        completed ? `, completed ${escapeHtml(completed)}` : ""
      }.
    </p>
    ${outcome}
    ${SCOPE_NOTE}`,
  );
}

// --------------------------------------------------------------- handlers

/**
 * Deauthorize: someone removed Kollab in their Instagram settings rather than
 * clicking Disconnect in the app. Same intent, different doorway, so it does
 * what the "disconnect" action in instagram-connect does.
 *
 * instagram_followers is deliberately kept, exactly as in-app Disconnect does:
 * it is a real number the creator can now edit as a self-reported stat, and
 * with instagram_business_account_id gone the UI already stops calling it
 * verified. Erasing everything is what a data deletion request is for.
 */
async function handleDeauthorize(userId: string) {
  const { data, error } = await adminClient()
    .from("profiles")
    .update({
      instagram_access_token: null,
      instagram_business_account_id: null,
      instagram_connected_at: null,
    })
    .eq("instagram_business_account_id", userId)
    .select("id");

  if (error) {
    console.error("deauthorize: could not clear connection:", error.message);
    return jsonResponse({ error: "Could not process deauthorization" }, 500);
  }

  // No match is a success, not an error: the account may have disconnected
  // in-app already. Anything else would make Meta retry forever.
  console.log(`deauthorize: cleared ${data?.length ?? 0} profile(s)`);
  return jsonResponse({ success: true }, 200);
}

/** Data deletion: erase everything Meta ever gave us, and record the outcome. */
async function handleDataDeletion(userId: string) {
  const admin = adminClient();

  // Erase first, record second: if the insert below fails the data is still
  // gone, which is the right way round to fail.
  const { data: cleared, error: clearError } = await admin
    .from("profiles")
    .update(Object.fromEntries(INSTAGRAM_DERIVED_COLUMNS.map((c) => [c, null])))
    .eq("instagram_business_account_id", userId)
    .select("id");

  if (clearError) {
    console.error("data-deletion: erase failed:", clearError.message);
    return jsonResponse({ error: "Could not process deletion request" }, 500);
  }

  const profileId = cleared?.[0]?.id ?? null;
  const foundData = Boolean(profileId);
  const confirmationCode = crypto.randomUUID().replace(/-/g, "");
  const now = new Date().toISOString();

  const { error: recordError } = await admin.from("data_deletion_requests").insert({
    confirmation_code: confirmationCode,
    source: "instagram",
    platform_user_id: userId,
    profile_id: profileId,
    status: foundData ? "completed" : "no_data_found",
    deleted_items: foundData ? [...INSTAGRAM_DERIVED_COLUMNS] : [],
    requested_at: now,
    completed_at: now,
  });

  if (recordError) {
    // The deletion itself succeeded, so this must not fail the callback --
    // telling Meta to retry would delete nothing further and lose the code.
    // It does mean the status page won't find it, hence the loud log.
    console.error(
      `data-deletion: erased data but could NOT record ${confirmationCode}:`,
      recordError.message,
    );
  }

  return jsonResponse(
    { url: statusUrlFor(confirmationCode), confirmation_code: confirmationCode },
    200,
  );
}

async function handleStatusPage(code: string | null) {
  if (!code) return htmlResponse(renderIntro(), 200);

  const { data, error } = await adminClient()
    .from("data_deletion_requests")
    .select("confirmation_code, status, deleted_items, requested_at, completed_at")
    .eq("confirmation_code", code)
    .maybeSingle();

  if (error) {
    console.error("data-deletion: status lookup failed:", error.message);
    return htmlResponse(renderUnknownCode(), 500);
  }
  if (!data) return htmlResponse(renderUnknownCode(), 404);
  return htmlResponse(renderStatus(data), 200);
}

// ----------------------------------------------------------------- router

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "";
  const route = last === FUNCTION_NAME ? "" : last;

  if (req.method === "GET") {
    // The status page is the only endpoint a human is meant to open; the rest
    // explain themselves rather than returning a bare 405 to a curious
    // reviewer clicking the URL they just registered.
    if (route === "data-deletion") return handleStatusPage(url.searchParams.get("code"));
    if (route === "deauthorize") {
      return new Response(
        "Kollab Instagram deauthorize callback. This endpoint accepts POSTs from Meta only.",
        { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } },
      );
    }
    return htmlResponse(renderIntro(), 200);
  }

  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  if (route !== "deauthorize" && route !== "data-deletion") {
    return jsonResponse(
      { error: "Unknown callback. Use /deauthorize or /data-deletion." },
      404,
    );
  }

  const auth = await authenticate(req);
  if ("response" in auth) return auth.response;

  return route === "deauthorize"
    ? handleDeauthorize(auth.userId)
    : handleDataDeletion(auth.userId);
});
