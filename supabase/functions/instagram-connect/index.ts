// Supabase Edge Function: instagram-connect
//
// Completes the Meta "Facebook Login for Business" handshake for a creator
// and stores the resulting Instagram connection.
//
// Why this is server-side at all: the exchange needs the Meta App Secret,
// and the result is a long-lived token. Neither may touch the browser. The
// frontend only ever holds the short-lived token that Meta already put in
// its own URL fragment, and posts it straight here.
//
// Actions (POST body { action, ... }):
//   "connect"  -> exchange short-lived token, list Pages with an attached
//                 Instagram account. One match: store it. Several: return
//                 the choices (never the tokens) so the user picks.
//   "refresh"  -> re-read followers_count for the caller's stored connection
//                 and write it back.
//
// Multi-Page handling is deliberately a second round trip rather than the
// function holding state between calls: the browser re-sends the same
// short-lived token with its chosen page_id and the exchange runs again.
// Short-lived tokens last ~1h, so this always succeeds in practice, and it
// means the long-lived token never leaves this function even momentarily.
//
// Deploy (does NOT happen on git push):
//   supabase functions deploy instagram-connect
//   supabase secrets set META_APP_ID=... META_APP_SECRET=...
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are provided
// automatically; confirm the service_role key under
// Project Settings -> Edge Functions -> Secrets.

import { createClient } from "npm:@supabase/supabase-js@2";

const GRAPH = "https://graph.facebook.com/v26.0";

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
async function graph(path: string, params: Record<string, string>) {
  const url = `${GRAPH}${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const msg = body?.error?.message ?? `Meta request failed (${res.status})`;
    throw new Error(msg);
  }
  return body;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Missing Authorization header" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const appId = Deno.env.get("META_APP_ID") ?? "";
  const appSecret = Deno.env.get("META_APP_SECRET") ?? "";

  if (!appId || !appSecret) {
    return jsonResponse(
      { error: "Server is not configured: META_APP_ID / META_APP_SECRET are not set." },
      500,
    );
  }

  try {
    // Scoped to the caller's JWT -- this is what proves who is asking. The
    // profile row written below is always this id, never one from the body.
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }
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

      if (!profile?.instagram_business_account_id || !profile?.instagram_access_token) {
        return jsonResponse({ connected: false }, 200);
      }

      const ig = await graph(`/${profile.instagram_business_account_id}`, {
        fields: "followers_count,username",
        access_token: profile.instagram_access_token,
      });

      // The real number replaces the self-reported one. Every existing
      // surface (Discover, Creator Profile) already reads instagram_followers,
      // so they all show the verified figure without further changes, and
      // instagram_business_account_id marks it as Instagram-verified.
      await adminClient
        .from("profiles")
        .update({ instagram_followers: ig.followers_count ?? null })
        .eq("id", userId);

      return jsonResponse(
        { connected: true, followers_count: ig.followers_count ?? null, username: ig.username ?? null },
        200,
      );
    }

    // ---------------------------------------------------------------- connect
    const shortLivedToken = body.access_token;
    if (!shortLivedToken || typeof shortLivedToken !== "string") {
      return jsonResponse({ error: "Missing access_token" }, 400);
    }

    // Meta's redirect fragment can already include a long_lived_token, but the
    // documented exchange is done here anyway: it is the only step that proves
    // possession of the App Secret, and it does not depend on the browser
    // having handed us an honest value.
    const exchanged = await graph("/oauth/access_token", {
      grant_type: "fb_exchange_token",
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortLivedToken,
    });
    const longLivedUserToken = exchanged.access_token;
    if (!longLivedUserToken) {
      return jsonResponse({ error: "Meta did not return a long-lived token." }, 502);
    }

    const accounts = await graph("/me/accounts", {
      fields: "id,name,access_token,instagram_business_account{id,username,followers_count}",
      access_token: longLivedUserToken,
    });

    const pages = (accounts.data ?? []).filter((p: Record<string, unknown>) => p.instagram_business_account);
    if (pages.length === 0) {
      return jsonResponse(
        {
          error:
            "No Instagram Business or Creator account is connected to your Facebook Pages. " +
            "Link them in Instagram settings, then try again.",
        },
        400,
      );
    }

    const chosenPageId = body.page_id;
    let page = pages[0];
    if (pages.length > 1) {
      if (!chosenPageId) {
        // Ask rather than guess which Page is the right one. Deliberately no
        // tokens in this payload -- only what the user needs to choose.
        return jsonResponse(
          {
            needs_choice: true,
            pages: pages.map((p: Record<string, any>) => ({
              page_id: p.id,
              page_name: p.name,
              instagram_username: p.instagram_business_account?.username ?? null,
              followers_count: p.instagram_business_account?.followers_count ?? null,
            })),
          },
          200,
        );
      }
      const match = pages.find((p: Record<string, unknown>) => p.id === chosenPageId);
      if (!match) return jsonResponse({ error: "That Page is not available on this account." }, 400);
      page = match;
    }

    const igAccount = page.instagram_business_account;
    // The Page token, not the user token: it is what authorises reads on the
    // Instagram Business Account node, and it inherits the long-lived expiry
    // from the exchanged user token above.
    const pageToken = page.access_token ?? longLivedUserToken;

    // followers_count comes back on the nested field, but re-read it directly
    // so a connection always stores a number it actually fetched.
    let followersCount = igAccount?.followers_count ?? null;
    try {
      const ig = await graph(`/${igAccount.id}`, {
        fields: "followers_count,username",
        access_token: pageToken,
      });
      followersCount = ig.followers_count ?? followersCount;
    } catch {
      // Storing the connection still succeeds; the count refreshes later.
    }

    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        instagram_access_token: pageToken,
        instagram_business_account_id: igAccount.id,
        instagram_connected_at: new Date().toISOString(),
        instagram_followers: followersCount,
      })
      .eq("id", userId);

    if (updateError) {
      return jsonResponse({ error: `Could not save the connection: ${updateError.message}` }, 500);
    }

    return jsonResponse(
      {
        connected: true,
        instagram_username: igAccount?.username ?? null,
        followers_count: followersCount,
        page_name: page.name ?? null,
      },
      200,
    );
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
