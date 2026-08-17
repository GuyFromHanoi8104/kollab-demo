// Supabase Edge Function: tiktok-connect
//
// TikTok Login Kit for Web. Turns the single-use authorization code the browser
// brings back into tokens, reads the creator's real follower count, and stores
// it so Discover and the creator profile can show a verified number instead of
// a self-reported one.
//
//   code --(client secret)--> access_token (24h) + refresh_token (365d)
//                                      |
//                    GET /v2/user/info/?fields=...,follower_count
//
// Actions (POST body { action, ... }):
//   "connect"     -> exchange the code and store the connection
//   "refresh"     -> spend the refresh token for a new access token, re-read
//                    follower_count, and write both back
//   "disconnect"  -> clear the stored credentials and the verified marker
//
// The 24-hour access token is the main structural difference from Instagram,
// whose long-lived token lasts 60 days. Here the access token is nearly always
// expired by the time anyone looks at it again, so "refresh" genuinely means
// refresh -- it spends the refresh token rather than reusing a stored access
// token. TikTok may rotate the refresh token on use, so whatever comes back is
// what gets stored.
//
// Deploy (does NOT happen on git push). Verify JWT stays ON for this one --
// unlike meta-callbacks, every request here comes from a logged-in creator's
// browser and is authenticated by their Supabase JWT:
//   supabase functions deploy tiktok-connect
//
// Secrets required (Project Settings -> Edge Functions -> Secrets):
//   TIKTOK_CLIENT_KEY     -- public, same value as VITE_TIKTOK_CLIENT_KEY
//   TIKTOK_CLIENT_SECRET  -- never in the repo, never in the frontend
//
// Requires supabase/migrations/20260817_tiktok_connection.sql.

import { createClient } from "npm:@supabase/supabase-js@2";

const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/";
// follower_count is the point of the feature. The other three ride along free
// with user.info.stats and are worth having for a richer creator card later.
const USER_FIELDS = "open_id,display_name,follower_count,following_count,likes_count,video_count";

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

interface TikTokTokens {
  access_token: string;
  refresh_token: string;
  open_id: string;
}

/**
 * POST the token endpoint. Used for both the initial code exchange and the
 * refresh, which share a URL and differ only by grant_type.
 *
 * TikTok reports failures as a 200 with { error, error_description }, so the
 * status code alone is not enough to tell success from failure.
 */
async function postToken(form: URLSearchParams): Promise<TikTokTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    throw new Error(body.error_description || body.error || `TikTok token request failed (${res.status})`);
  }
  if (!body.access_token || !body.open_id) {
    throw new Error("TikTok did not return an access token.");
  }
  return {
    access_token: body.access_token,
    // Absent on some responses; the caller keeps the previous one in that case.
    refresh_token: body.refresh_token ?? "",
    open_id: String(body.open_id),
  };
}

/**
 * Read the creator's own profile. `error` is ALWAYS present on this endpoint --
 * success is error.code === "ok", not the absence of the key.
 */
async function fetchUserInfo(accessToken: string) {
  const res = await fetch(`${USER_INFO_URL}?fields=${encodeURIComponent(USER_FIELDS)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await res.json().catch(() => ({}));
  const code = body?.error?.code;
  if (!res.ok || (code && code !== "ok")) {
    throw new Error(body?.error?.message || `TikTok user info request failed (${res.status})`);
  }
  const user = body?.data?.user;
  if (!user) throw new Error("TikTok returned no user data.");
  return user as {
    open_id?: string;
    display_name?: string;
    follower_count?: number;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Missing Authorization header" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const clientKey = Deno.env.get("TIKTOK_CLIENT_KEY") ?? "";
  const clientSecret = Deno.env.get("TIKTOK_CLIENT_SECRET") ?? "";

  if (!clientKey || !clientSecret) {
    return jsonResponse(
      {
        error:
          "Server is not configured: TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET are not set. " +
          "Both come from the app's credentials in the TikTok developer portal.",
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
        .select("tiktok_refresh_token")
        .eq("id", userId)
        .maybeSingle();

      if (!profile?.tiktok_refresh_token) return jsonResponse({ connected: false }, 200);

      const tokens = await postToken(
        new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: profile.tiktok_refresh_token,
        }),
      );
      const user = await fetchUserInfo(tokens.access_token);

      const { error: updateError } = await adminClient
        .from("profiles")
        .update({
          tiktok_access_token: tokens.access_token,
          // Keep the old one if TikTok didn't rotate it -- writing "" would
          // silently break every future refresh.
          tiktok_refresh_token: tokens.refresh_token || profile.tiktok_refresh_token,
          tiktok_followers: user.follower_count ?? null,
        })
        .eq("id", userId);

      if (updateError) {
        return jsonResponse({ error: `Could not save refreshed stats: ${updateError.message}` }, 500);
      }
      return jsonResponse(
        { connected: true, follower_count: user.follower_count ?? null, display_name: user.display_name ?? null },
        200,
      );
    }

    // ------------------------------------------------------------- disconnect
    if (action === "disconnect") {
      // tiktok_followers is deliberately left alone, matching the Instagram
      // disconnect: it holds a real number TikTok reported, and with
      // tiktok_open_id gone the UI drops back to "Self-reported" on its own.
      // The creator can then edit it like any other self-reported stat.
      const { error: clearError } = await adminClient
        .from("profiles")
        .update({
          tiktok_access_token: null,
          tiktok_refresh_token: null,
          tiktok_open_id: null,
          tiktok_connected_at: null,
        })
        .eq("id", userId);

      if (clearError) return jsonResponse({ error: `Could not disconnect: ${clearError.message}` }, 500);
      return jsonResponse({ disconnected: true }, 200);
    }

    // ---------------------------------------------------------------- connect
    const code = body.code;
    if (!code || typeof code !== "string") {
      return jsonResponse({ error: "Missing authorization code" }, 400);
    }
    // TikTok binds the code to the exact redirect_uri used to obtain it, so
    // accepting this from the browser is safe: a wrong value fails the exchange
    // rather than redirecting anything anywhere.
    const redirectUri = body.redirect_uri;
    if (!redirectUri || typeof redirectUri !== "string") {
      return jsonResponse({ error: "Missing redirect_uri" }, 400);
    }

    const tokens = await postToken(
      new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        // TikTok requires the code URL-decoded. supabase-js has already parsed
        // the JSON body, so it arrives decoded -- decoding again would corrupt
        // any code containing a literal %.
        code,
        redirect_uri: redirectUri,
      }),
    );
    const user = await fetchUserInfo(tokens.access_token);

    // tiktok_open_id is the marker the UI reads to show "Verified via TikTok",
    // mirroring instagram_business_account_id. The client cannot write it --
    // see the grants in 20260817_tiktok_connection.
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        tiktok_access_token: tokens.access_token,
        tiktok_refresh_token: tokens.refresh_token,
        tiktok_open_id: tokens.open_id,
        tiktok_connected_at: new Date().toISOString(),
        tiktok_followers: user.follower_count ?? null,
      })
      .eq("id", userId);

    if (updateError) {
      return jsonResponse({ error: `Could not save the connection: ${updateError.message}` }, 500);
    }

    return jsonResponse(
      {
        connected: true,
        tiktok_display_name: user.display_name ?? null,
        follower_count: user.follower_count ?? null,
      },
      200,
    );
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
