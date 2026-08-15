-- Lock down profiles.instagram_access_token.
--
-- profiles has public SELECT (Discover is browsable by logged-out guests), so
-- every column on it is world-readable through the anon key that ships in the
-- frontend bundle. Verified: an anonymous GET on
--   /rest/v1/profiles?select=instagram_access_token
-- returned 200 with a row per profile. Null today only because nobody has
-- connected; the first real connection would publish a long-lived Meta token.
--
-- WHY THE OBVIOUS VERSION DOES NOT WORK
-- A bare `REVOKE SELECT (instagram_access_token) ... FROM anon` is silently a
-- no-op here. In Postgres, table-level and column-level privileges are
-- independent: GRANT SELECT ON <table> authorises every column on its own, and
-- revoking a column privilege that was never separately granted removes
-- nothing. Confirmed empirically -- after running that, `set role anon; select
-- instagram_access_token ...` still returned a row instead of erroring.
--
-- The working form is to drop the table-wide grant and re-grant the columns
-- that are safe, so the token is simply never covered.
--
-- ORDER OF OPERATIONS: apply this only AFTER the frontend that names its
-- columns is deployed. Once table-level SELECT is gone, `select=*` fails
-- outright -- and AuthContext used it to load the session's profile, so
-- applying this first logs everybody out.

-- ---------------------------------------------------------------- SELECT
REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (
  id, role, name, avatar_url, created_at,
  company_name, website, industry,
  handle, bio, niche, location,
  tiktok_followers, tiktok_avg_views,
  instagram_followers, instagram_avg_views,
  engagement_rate, stats_verified, stats_updated_at,
  notify_new_applications, notify_campaign_updates,
  -- Safe to expose: an account id and a timestamp, no credential. The client
  -- needs them to tell a verified connection from a self-report.
  instagram_business_account_id, instagram_connected_at
) ON public.profiles TO anon, authenticated;

-- ---------------------------------------------------------------- UPDATE
-- Same trap: without this, any logged-in user could write their own
-- instagram_access_token and hand the app an attacker-controlled credential.
-- Granted columns are exactly what MyProfile and Settings actually save.
-- Deliberately excluded: id / role / created_at (never client-written), and
-- the three instagram_* connection columns, which only the Edge Function sets
-- using the service_role key that these grants do not apply to.
REVOKE UPDATE ON public.profiles FROM anon, authenticated;

GRANT UPDATE (
  name, avatar_url, bio, niche, location, handle,
  company_name, website, industry,
  tiktok_followers, tiktok_avg_views,
  instagram_followers, instagram_avg_views,
  engagement_rate, stats_verified, stats_updated_at,
  notify_new_applications, notify_campaign_updates
) ON public.profiles TO authenticated;

-- No client INSERT path exists (rows are created by the signup trigger), so
-- nothing is granted here.
REVOKE INSERT ON public.profiles FROM anon, authenticated;

-- ---------------------------------------------------------------- verify
-- 1) MUST raise "permission denied for column instagram_access_token":
--      set role anon; select instagram_access_token from public.profiles limit 1; reset role;
-- 2) MUST still return rows:
--      set role anon; select id, name, instagram_followers from public.profiles limit 1; reset role;
