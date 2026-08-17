-- Columns for the TikTok Login Kit connection.
--
-- Two differences from the Instagram equivalent drive the shape here:
--
--   * TikTok's access token lives 24 HOURS, not 60 days, so a refresh token is
--     mandatory rather than optional. Without storing it, every creator's
--     verified follower count would go stale after a day with no way back
--     short of making them log in again.
--   * The refresh token is itself a long-lived credential (365 days), so it is
--     exactly as sensitive as the access token and gets the same treatment.
--
-- IMPORTANT -- read 20260814_lock_instagram_token before changing this.
-- That migration REVOKEd table-level SELECT/UPDATE on profiles and replaced
-- them with explicit column lists, because profiles has public SELECT for
-- guest browsing. The consequence is that any column added later is invisible
-- and unwritable to anon/authenticated until it is named in a GRANT. For
-- tokens that is precisely the behaviour we want, so the two token columns
-- below are deliberately never granted to anyone: only service_role (which
-- bypasses grants) can read or write them, and it does so inside the
-- tiktok-connect Edge Function.

alter table public.profiles
  add column if not exists tiktok_access_token  text,
  add column if not exists tiktok_refresh_token text,
  add column if not exists tiktok_open_id       text,
  add column if not exists tiktok_connected_at  timestamptz;

-- Safe to expose: an account id and a timestamp, no credential. The client
-- needs both to tell a verified connection from a self-reported number, the
-- same way instagram_business_account_id is used.
grant select (tiktok_open_id, tiktok_connected_at) on public.profiles to anon, authenticated;

-- No UPDATE grant on any of the four. A creator must not be able to write
-- their own tiktok_open_id -- that is the marker the UI trusts to display
-- "Verified via TikTok", and letting the client set it would make the badge
-- self-certified and therefore worthless.

-- Verify the tokens really are unreadable. Run as an anon/authenticated
-- caller, NOT as the SQL editor's superuser role, or it will always pass:
--   select tiktok_access_token from public.profiles limit 1;
-- Expected: ERROR 42501 permission denied for table profiles
