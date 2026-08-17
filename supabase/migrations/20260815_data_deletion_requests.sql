-- Audit trail for Meta Data Deletion Request callbacks.
--
-- Meta requires the callback to hand back a confirmation code AND a URL where
-- the person can later read "a human-readable explanation of the status of
-- their request". That means the code has to be lookup-able after the request
-- returns, which is what this table is for.
--
-- It is deliberately thin. It records that a deletion happened and what was
-- cleared -- not the data that was deleted, and nothing that identifies the
-- person to whoever holds the code (the status page renders only the columns
-- below, never a name, email or Instagram username).

create table if not exists public.data_deletion_requests (
  -- The confirmation code Meta is handed. Random, and the only key to the
  -- status page, so it doubles as the lookup id.
  confirmation_code   text primary key,

  -- Which platform asked. Only Instagram today; TikTok will want the same
  -- callback pair, and this saves a second table when it does.
  source              text        not null default 'instagram',

  -- App-scoped id from the signed_request. Kept so a repeat request from the
  -- same account is traceable; it is useless on its own.
  platform_user_id    text,

  -- Null when no matching profile existed, and nulled out if the Kollab
  -- account is deleted later -- the audit row should outlive the account.
  profile_id          uuid        references public.profiles(id) on delete set null,

  status              text        not null default 'completed'
    check (status in ('completed', 'no_data_found')),

  -- Column names that were cleared, e.g. {instagram_access_token,
  -- instagram_followers}. Drives the "what was deleted" list on the page.
  deleted_items       text[]      not null default '{}',

  requested_at        timestamptz not null default now(),
  completed_at        timestamptz
);

-- Nobody reaches this table from the browser. The callback and the status page
-- both run inside the Edge Function on service_role, which bypasses RLS; every
-- other role gets nothing, because RLS is on and there are no policies.
alter table public.data_deletion_requests enable row level security;

-- Belt and braces on top of RLS: last time a column-level REVOKE was assumed
-- to be doing work it wasn't (see 20260814_lock_instagram_token), so state the
-- table-level grants outright rather than inheriting whatever the default is.
revoke all on public.data_deletion_requests from anon, authenticated;
