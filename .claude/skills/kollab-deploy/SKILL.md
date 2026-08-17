---
name: kollab-deploy
description: How to actually get a Kollab change live — running migrations, deploying Edge Functions, adding environment variables, and proving a deploy landed. Use this skill whenever work touches supabase/migrations/, supabase/functions/, a VITE_ variable, or a Supabase secret, and ALWAYS when the user says a change "isn't showing up", "still shows the old version", or asks how to deploy or redeploy something. Nothing in this project deploys on git push, so assuming otherwise produces confidently wrong answers.
---

# Deploying Kollab

The single most expensive mistake in this project is assuming something
deployed. Almost nothing here happens automatically, and the failure mode is
always the same: the code is correct, the user is looking at the old version,
and everyone starts debugging the code instead of the pipeline.

So the rule that saves the most time is: **before debugging behaviour, prove
which version is live.** The verification section below is the most useful part
of this skill.

## What deploys automatically, and what doesn't

| Change | How it ships |
|---|---|
| Anything in `src/` | Vercel, on push to `main` |
| Files in `public/` | Vercel, on push to `main` |
| `supabase/migrations/*.sql` | **manually**, pasted into the dashboard SQL Editor |
| `supabase/functions/*/index.ts` | **manually**, from the Supabase dashboard |
| Supabase secrets | **manually**, dashboard |
| `VITE_*` variables | Vercel dashboard **plus a redeploy** |

## `main` is the branch that deploys

Vercel's production branch is `main`. A second long-lived branch, `front-end`,
has also existed — it was once the GitHub default, so PRs can silently target
it, get merged, and never reach production. This has actually happened.

Base branches on `origin/main` and write PR links against `main`. When a change
is merged but not live, check which branch it landed on **before** looking at
anything else:

```bash
git branch -r --contains <sha>
```

## The user has no Supabase CLI

Give dashboard click-paths, never `supabase ...` commands. Those have twice been
pasted into the SQL Editor, producing `ERROR: 42601: syntax error at or near
"supabase"` — a confusing failure caused entirely by offering the wrong tool.

This also constrains function design: dashboard deploys bundle a single function
directory, so `supabase/functions/_shared/` imports **do not work**. Keep each
function self-contained. When two endpoints want shared logic, route sub-paths
off one function rather than splitting into two — `meta-callbacks` does this
deliberately so the signed-request verification exists in one place.

## Running a migration

Dashboard → SQL Editor → paste the file → Run.

Migrations here are written to be idempotent (`add column if not exists`,
repeatable grants), so if one half-fails during an outage it is safe to paste
again. Say so when a user hits an error mid-migration — the instinct to start
hand-cleaning the schema is the dangerous one.

If the working tree is on a branch that doesn't contain the migration, don't
leave the user hunting for a missing file. Print it for them:

```bash
git show <branch>:supabase/migrations/<file>.sql
```

## Deploying an Edge Function

Dashboard → Edge Functions → deploy, with the function's name matching the
directory exactly (some functions read their own name to route sub-paths).

Then set the **Verify JWT with legacy secret** toggle correctly. Getting this
wrong produces a 401 before the handler ever runs, which looks nothing like a
config problem:

| Function | Verify JWT | Why |
|---|---|---|
| `delete-account`, `instagram-connect`, `tiktok-connect` | **ON** | called by a logged-in user's browser, authenticated by their Supabase JWT |
| `meta-callbacks` | **OFF** | Meta's servers POST it and have no Supabase session |

The general test: if a third party calls it, Verify JWT must be off, and the
function must authenticate the caller itself — `meta-callbacks` does that by
verifying an HMAC signature.

## Secrets versus VITE_ variables

This distinction is a security boundary, not a preference. Vite inlines every
`VITE_`-prefixed variable into the browser bundle, so anything secret placed
there is published.

- **Public identifiers** (Instagram App ID, TikTok Client Key) → Vercel
  environment variables as `VITE_*`
- **Secrets** (Meta App Secret, TikTok Client Secret, service role key) →
  Supabase → Project Settings → Edge Functions → Secrets, only

A `VITE_` variable added in Vercel does nothing until a redeploy, because it's
baked in at build time. This is a common "I added the key and it still says not
configured" report.

## Verifying a deploy actually landed

Don't take the dashboard's word for it, and don't ask the user to eyeball it.
These checks are fast and definitive.

**Did a static file ship?** The content type is the tell — HTML means the SPA
fallback served `index.html` instead of the real file:

```bash
curl -sI https://www.appkollab.com/<file> | grep -i content-type
```

**Did the frontend bundle update?** Grep the live bundle for a distinctive
string from the new code. This is the most reliable check available, because it
inspects what users are actually served:

```bash
JS=$(curl -s https://www.appkollab.com/ | grep -o '/assets/index-[A-Za-z0-9_-]*\.js' | head -1)
curl -s "https://www.appkollab.com$JS" | grep -c "<distinctive string from the change>"
```

**Is Supabase itself healthy?** Worth checking before blaming the app — a 401
from the REST root is the correct, healthy response to an unauthenticated
request:

```bash
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" "$SUPABASE_URL/rest/v1/"
curl -s https://status.supabase.com/api/v2/status.json | head -c 200
```

**Did an Edge Function deploy?** Dashboard → Edge Functions → the function →
Logs. Callbacks log deliberately loud lines (`deauthorize: cleared 1
profile(s)`) precisely so a real invocation is visible.

## Order of diagnosis when something "isn't live"

Work down this list rather than starting from the code. The first three
explain the overwhelming majority of cases:

1. **Is it merged, and into which branch?** (`git branch -r --contains <sha>`)
2. **Did Vercel deploy?** Compare the live bundle hash before and after.
3. **Is it a manual step that was never done?** Migration, function, secret,
   `VITE_` variable + redeploy.
4. **Is the platform down?** Check Supabase and GitHub status pages — a "no
   server is currently available" error is theirs, not the project's.
5. Only now, look at the code.

## Full setup sequence for a new integration

When adding something like an OAuth connection, the steps are order-dependent —
the function needs its secrets before it can succeed, and the frontend needs its
`VITE_` variable before the button works:

1. Run the migration (SQL Editor)
2. Add secrets (Supabase → Edge Functions → Secrets)
3. Deploy the function, with the correct Verify JWT setting
4. Add the `VITE_*` variable in Vercel, then **redeploy**
5. Register any redirect URI or callback URL with the third party
6. Merge the PR into `main`

Steps 1–3 need Supabase; 4–6 don't. When Supabase is degraded, that split lets
work continue instead of stalling — worth pointing out rather than telling the
user to wait.
