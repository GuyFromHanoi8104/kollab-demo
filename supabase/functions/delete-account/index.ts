// Supabase Edge Function: delete-account
//
// Deletes the CALLING user's own auth.users row (never a user id passed in
// the request -- there isn't one to pass) and, via the on-delete-cascade
// foreign keys already set up on profiles/campaigns/applications/
// invitations/messages/saved_profiles/profile_views, everything that
// references it.
//
// Two Supabase clients are used deliberately:
//   1. `supabaseClient`, scoped to the caller's own JWT (from the
//      Authorization header) -- used only to answer "who is asking?" via
//      auth.getUser(). This never touches the service_role key.
//   2. `adminClient`, authenticated with the service_role key -- the only
//      client capable of auth.admin.deleteUser(), and only ever called with
//      the id that step 1 already verified, not anything from the request
//      body/query string.
//
// Deploy with the Supabase CLI (this doesn't happen via a normal git push):
//   supabase functions deploy delete-account
// SUPABASE_URL and SUPABASE_ANON_KEY are auto-provided to every Edge
// Function. SUPABASE_SERVICE_ROLE_KEY is also auto-provided as a default
// secret on current Supabase projects -- confirm it's present under
// Project Settings -> Edge Functions -> Secrets before relying on it; if
// it's missing (e.g. an older project), set it explicitly:
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your service_role key>

import { createClient } from "npm:@supabase/supabase-js@2";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing Authorization header" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  try {
    // Scoped to the caller's own JWT -- this is what proves who's asking.
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }

    // Separate admin client -- the service_role key never touches the
    // caller's JWT context, and this client is only ever asked to delete
    // the id verified above, not anything from the request itself.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteError) {
      return jsonResponse({ error: deleteError.message }, 500);
    }

    return jsonResponse({ success: true }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
