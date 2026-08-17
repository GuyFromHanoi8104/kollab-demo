# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Kollab is a brand↔creator marketplace for Vietnam. Brands post campaigns, creators
apply, and creators can connect Instagram/TikTok so their follower counts are
verified by the platform rather than self-reported.

## Commands

```bash
npm run dev      # Vite dev server on :5173
npm run build    # production build to dist/
npm run lint     # eslint over the repo
```

**There is no test suite** — no test script, no vitest/jest, no test files. Don't
go looking for one, and don't report "tests pass". Verification here means
`npm run lint`, `npm run build`, and driving the running app in the browser.

For browser verification use the preview tools with the existing launch config
(`.claude/launch.json`, name `kollab-dev`) rather than starting Vite by hand.

## Deployment — read this before touching anything shipped

Nothing below happens automatically on `git push`. Each is a manual step, and
skipping one produces a confusing "my change isn't live" symptom.

**`main` is the branch Vercel deploys.** A second long-lived branch `front-end`
also exists and is a trap: it was once the GitHub default, so PRs can silently
target it, get merged, and never reach production. Always base branches on
`origin/main` and point PR links at `main`. If a change appears merged but isn't
live, check which branch it landed on before debugging anything else.

**Migrations** in `supabase/migrations/` are not applied by any tooling. Paste
them into the Supabase dashboard SQL Editor.

**The Supabase CLI is not installed and is not available.** Give dashboard
click-paths, never `supabase ...` commands — those have twice ended up pasted
into the SQL editor, producing `ERROR: 42601: syntax error at or near "supabase"`.
This also means `supabase/functions/_shared/` imports do **not** work: dashboard
deploys only bundle a single function directory, so keep each Edge Function
self-contained and route sub-paths off one function rather than splitting it.

**Edge Functions** deploy by hand from Dashboard → Edge Functions. The
`Verify JWT with legacy secret` toggle matters:

| Function | Verify JWT | Why |
|---|---|---|
| `delete-account`, `instagram-connect`, `tiktok-connect` | **ON** | invoked by a logged-in user's browser |
| `meta-callbacks` | **OFF** | Meta's servers POST it with no Supabase session |

**`VITE_*` variables are inlined into the bundle at build time.** Adding one in
Vercel requires a redeploy before it takes effect. See `.env.example` for the
full list. Secrets (Meta App Secret, TikTok Client Secret) belong only in
Supabase → Edge Functions → Secrets — never in a `VITE_` var, which ships to the
browser.

Both `vercel.json` and `public/_redirects` rewrite everything to `index.html` for
client-side routing. Real files in `public/` still win (the filesystem is checked
before rewrites), which is how domain-verification files are served.

## Architecture

React 19 + Vite 8 + react-router-dom 7, with Supabase for auth, Postgres
(via PostgREST), Realtime, Storage and Edge Functions. The frontend is plain
JS/JSX — only the Deno Edge Functions are TypeScript. There is no server of our
own; the browser talks to Supabase directly, and Edge Functions exist only where
a secret or elevated privilege is required.

### Two page shells, and they must not be mixed

This is the single most common source of visual inconsistency.

- **App shell** — `AppSidebar` + `AppTopBar`, colors from
  `components/appColors`. For authenticated workspace pages (Dashboard,
  Settings, My Profile, Messages, Manage Campaigns, Saved).
- **Marketing shell** — `MarketingNavBar` + `Footer`, with a *local* `colors`
  object defined in each page (navy `#0b1c30`, gray `#434654`, blue `#2563eb`).
  For public pages: Landing, Campaigns Browse, Discover Creators, legal pages.

A public route wearing the app shell looks like a stranger landed in someone
else's dashboard — that was a real bug on `/discover`. If a page is reachable
without logging in, it gets the marketing shell.

`MarketingNavBar` reads `useAuth()` internally; it takes no `isLoggedIn` prop.

### Auth

`AuthProvider` (`assets/context/AuthContext.jsx`) holds the Supabase session plus
the matching `profiles` row, exposed through `useAuth()`: `user`, `session`,
`profile`, `role`, `isLoggedIn`, `loading`, `refreshProfile`.

`role` **defaults to `"brand"`** when there is no profile — check `isLoggedIn`
before trusting it.

`ProtectedRoute` gates genuinely account-only pages. Browsing is deliberately
public: `/`, `/campaigns`, `/discover`, `/discover-brands`, `/creator/:id`,
`/terms`, `/privacy`. Those pages handle guests themselves.

The guest pattern throughout is **gate the transaction, not the information**:
show the button, and redirect to `/login` on click (`handleRequireLogin`) rather
than hiding it. One deliberate exception — a creator's `handle` is hidden from
guests, because the handle *is* the contact method and exposing it invites
brands to bypass the platform.

### The `profiles` table has two traps

**1. Never `select("*")`.** Use `PROFILE_COLUMNS` from `utils/profileColumns.js`.
Token columns are revoked from `anon`/`authenticated`, and Postgres expands `*`
to every column including revoked ones, then refuses the whole query. A column
added to `profiles` must be added to `PROFILE_COLUMNS` too or it silently won't
load.

**2. New columns are invisible and unwritable by default.**
`20260814_lock_instagram_token.sql` revoked *table-level* SELECT/UPDATE and
replaced them with explicit column lists. Anything added later needs naming in a
`GRANT` to be readable. For credentials that's the desired behaviour — leave them
out. Note that table-level and column-level grants are independent: a
`REVOKE SELECT (col)` is a no-op while a table-level `GRANT SELECT` exists.

Connection markers (`instagram_business_account_id`, `tiktok_open_id`) are
granted for SELECT but **never for UPDATE** — the UI trusts them to display
"verified", so a client-writable marker would make the badge self-certified.

### OAuth connections

Instagram and TikTok follow the same shape: the browser gets a single-use
authorization code, a dedicated callback route (`/instagram/callback`,
`/tiktok/callback`) hands it to an Edge Function, and only that function holds
the secret. The browser never holds a token.

Differences that matter:

- TikTok's access token lives **24 hours** (Instagram's long-lived token: 60
  days), so TikTok stores a refresh token and `refresh` genuinely refreshes.
  TikTok may rotate the refresh token — store whatever comes back.
- TikTok requires `state` and uses `client_key`, not `client_id`. Scopes are
  comma-separated. The state check is a real CSRF defence, not paperwork: without
  it a crafted callback link can bind an attacker's TikTok account to a victim's
  profile.
- `meta-callbacks` verifies Meta's `signed_request` HMAC with
  `crypto.subtle.verify` over the raw payload string. That signature is the
  *entire* auth boundary for those endpoints — verify before touching any row,
  and match accounts on the id the platform signed.

Disconnecting clears credentials and the marker but **keeps** the follower count:
it was real when fetched, and the UI drops back to "Self-reported" on its own.

### External services

`utils/searchApi.js` calls a **separate repository** — the Kollab search service
(FastAPI + Weaviate, deployed on Railway, `VITE_SEARCH_API_URL`). It is not in
this repo. It returns ranked profile IDs, not profile objects, because the API
carries only a few fields while cards need avatars and stats; `orderByIds()`
re-orders rows fetched from Supabase.

Search costs real money — each query embeds through OpenAI. **Fire it on submit
only, never per keystroke.** Handle `SEARCH_STATUS.RATE_LIMITED` and
`UNAVAILABLE` by falling back to plain browsing rather than showing a broken
state.

## Conventions

- **One PR per fix.** Never push follow-up commits to a branch whose PR is
  already open or merged — PRs here get merged fast and stranded work is common.
- Dropdowns and overlays that must escape a scroll container use `createPortal`
  with `position: fixed`, and close on `mousedown` outside.
- Niche badge colors come from the shared `components/nicheStyles` map.
- Stats helpers live in `utils/creatorStats.js`. `sortByStatDesc` sorts nulls to
  the end rather than treating them as zero — a creator who hasn't reported a
  number is not a creator with zero.
- Legal pages are raw HTML imported with Vite's `?raw` and rendered via
  `dangerouslySetInnerHTML` in `LegalPage.jsx`. Those files are the source of
  record (the Termly source was deleted), so edit them directly. Never point that
  component at user-supplied content.

## Known rough edges

- Two pieces described above are **deployed but not yet merged to `main`**:
  `meta-callbacks` (live, deployed by hand) and the TikTok connection
  (`tiktok-connect`, `/tiktok/callback`, `20260817_tiktok_connection.sql`). If
  they aren't in the tree, check for an open PR before assuming they're missing.

- `CampaignsBrowse.jsx` renders fabricated stats ("1,200+ ACTIVE CREATORS", etc.)
  above the footer. Real numbers or removal is pending.
- `index.html` has a single `<title>kollab</title>`, no meta description and no
  Open Graph tags, so every route shares them. There is no SSR or prerendering,
  so SEO on creator profiles does not currently work.
- Filter chips on Campaigns Browse ("Category", "Platform", …) are decorative.
- Instagram and TikTok are both pending platform App Review, so only the owner
  and added testers can complete a connection.
