// Supabase Edge Function: instagram-connect
//
// Business Login for Instagram ("Instagram API with Instagram Login").
//
// Replaces the previous Facebook Login for Business implementation, which
// required every creator to own a Facebook Page, link Instagram to it, and the
// app to hold Advanced Access before anyone but its own testers could connect.
// It also depended on GET /me/accounts to discover the Page -- which returned
// an empty list on a real, correctly-linked account, because enumerating Pages
// and reading one by id are authorised differently.
//
// This flow talks to the Instagram professional account directly:
//
//   code  --(app secret)-->  short-lived token  -->  long-lived token
//                                                        |
//                                     GET /me?fields=followers_count
//
// No Pages, no enumeration, no chooser. The browser only ever holds a
// single-use authorization code, which is worthless without the app secret --
// strictly safer than the old flow, which handed the browser a live token.
//
// Actions (POST body { action, ... }):
//   "connect"  -> exchange the code and store the connection
//   "refresh"  -> re-read followers_count for the caller and write it back
//
// Deploy (does NOT happen on git push):
//   supabase functions deploy instagram-connect
//   supabase secrets set INSTAGRAM_APP_ID=... INSTAGRAM_APP_SECRET=...
//
// NOTE: these are the INSTAGRAM app id/secret from
// Instagram > API setup with Instagram login -- not the Facebook App ID and
// secret used by the previous version. They are different values.

import { createClient } from "npm:@supabase/supabase-js@2";

const IG_GRAPH = "https://graph.instagram.com";
const IG_GRAPH_VERSION = "v25.0";
const IG_TOKEN_URL = "https://api.instagram.com/oauth/access_token";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Meta returns errors as 200-with-error-body often enough to check both. */
async function readMetaJson(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error || body.error_message) {
    const msg =
      body?.error?.message ??
      body?.error_message ??
      `Instagram request failed (${res.status})`;
    throw new Error(msg);
  }
  return body;
}

async function igGet(path: string, params: Record<string, string>) {
  return readMetaJson(await fetch(`${IG_GRAPH}${path}?${new URLSearchParams(params)}`));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Missing Authorization header" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const appId = Deno.env.get("INSTAGRAM_APP_ID") ?? "";
  const appSecret = Deno.env.get("INSTAGRAM_APP_SECRET") ?? "";

  if (!appId || !appSecret) {
    return jsonResponse(
      {
        error:
          "Server is not configured: INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET are not set. " +
          "These come from Instagram > API setup with Instagram login, and are different " +
          "from the Facebook App ID and secret.",
      },
      500,
    );
  }

  try {
    // Scoped to the caller's JWT -- this is what proves who is asking. The row
    // written below is always this id, never one taken from the request body.
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) return jsonResponse({ error: "Not authenticated" }, 401);
    const userId = userData.user.id;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "connect";

    // ---------------------------------------------------------------- refresh
    if (action === "refresh") {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("instagram_access_token, instagram_business_account_id")
        .eq("id", userId)
        .maybeSingle();

      if (!profile?.instagram_access_token) return jsonResponse({ connected: false }, 200);

      const me = await igGet(`/${IG_GRAPH_VERSION}/me`, {
        fields: "user_id,username,followers_count",
        access_token: profile.instagram_access_token,
      });

      // The verified number replaces the self-reported one. Discover and
      // Creator Profile already read instagram_followers, so they show the
      // real figure with no further changes.
      await adminClient
        .from("profiles")
        .update({ instagram_followers: me.followers_count ?? null })
        .eq("id", userId);

      return jsonResponse(
        { connected: true, followers_count: me.followers_count ?? null, username: me.username ?? null },
        200,
      );
    }

    // ---------------------------------------------------------------- connect
    const code = body.code;
    if (!code || typeof code !== "string") {
      return jsonResponse({ error: "Missing authorization code" }, 400);
    }
    // Instagram binds the code to the exact redirect_uri used to obtain it, so
    // accepting this from the browser is safe: a wrong value fails the
    // exchange rather than redirecting anything anywhere.
    const redirectUri = body.redirect_uri;
    if (!redirectUri || typeof redirectUri !== "string") {
      return jsonResponse({ error: "Missing redirect_uri" }, 400);
    }

    // Step 1: code -> short-lived token. Form-encoded POST, unlike every other
    // call here.
    const form = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });
    const shortLived = await readMetaJson(
      await fetch(IG_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
      }),
    );
    const shortToken = shortLived.access_token;
    if (!shortToken) return jsonResponse({ error: "Instagram did not return an access token." }, 502);

    // Step 2: short-lived (1 hour) -> long-lived (60 days).
    const longLived = await igGet("/access_token", {
      grant_type: "ig_exchange_token",
      client_secret: appSecret,
      access_token: shortToken,
    });
    const longToken = longLived.access_token ?? shortToken;

    // Step 3: read the profile. This is the whole reason for the feature, and
    // it is a single call against /me -- no Pages involved.
    const me = await igGet(`/${IG_GRAPH_VERSION}/me`, {
      fields: "user_id,username,followers_count",
      access_token: longToken,
    });

    const igUserId = String(me.user_id ?? shortLived.user_id ?? "");
    if (!igUserId) return jsonResponse({ error: "Instagram did not return an account id." }, 502);

    // instagram_business_account_id keeps its name and its meaning: the id of
    // the connected professional account, and the marker the UI uses to show
    // "Verified via Instagram". Under Instagram Login it is the Instagram user
    // id rather than a Page-derived one, which needs no schema change.
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        instagram_access_token: longToken,
        instagram_business_account_id: igUserId,
        instagram_connected_at: new Date().toISOString(),
        instagram_followers: me.followers_count ?? null,
      })
      .eq("id", userId);

    if (updateError) {
      return jsonResponse({ error: `Could not save the connection: ${updateError.message}` }, 500);
    }

    return jsonResponse(
      {
        connected: true,
        instagram_username: me.username ?? null,
        followers_count: me.followers_count ?? null,
      },
      200,
    );
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
