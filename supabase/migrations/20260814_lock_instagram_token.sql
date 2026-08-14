-- Lock down profiles.instagram_access_token.
--
-- profiles has public SELECT (Discover Creators and Discover Brands are
-- browsable by logged-out guests), so every column on it is world-readable
-- through the anon key -- which ships in the frontend bundle. Verified before
-- writing this: an anonymous GET on
--   /rest/v1/profiles?select=instagram_access_token
-- returns 200 and a row per profile. The values are null today only because
-- nobody has connected yet; the first real connection would publish a
-- long-lived Meta token to anyone who asks.
--
-- Column-level REVOKE is enough: PostgREST runs as the requesting role, so
-- Postgres refuses the column and the token never leaves the database. The
-- Edge Function reads it with the service_role key, which these grants do
-- not apply to.
--
-- NOTE: this makes `select=*` fail for anon/authenticated, because * expands
-- to every column including the revoked one. The three `select("*")` calls in
-- the app (DiscoverCreators, CreatorProfile, AuthContext) are replaced with
-- explicit column lists in the same change.

REVOKE SELECT (instagram_access_token) ON public.profiles FROM anon;
REVOKE SELECT (instagram_access_token) ON public.profiles FROM authenticated;

-- Nobody should be able to write it from the client either -- it is only ever
-- set by the Edge Function, which uses service_role.
REVOKE INSERT (instagram_access_token) ON public.profiles FROM anon, authenticated;
REVOKE UPDATE (instagram_access_token) ON public.profiles FROM anon, authenticated;

-- Sanity check after applying (should raise "permission denied for column"):
--   set role anon;
--   select instagram_access_token from public.profiles limit 1;
--   reset role;
