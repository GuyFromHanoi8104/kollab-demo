# TikTok specifics

## The sandbox requirement, and why it reorders everything

TikTok requires that an app which hasn't been approved before demonstrates the
integration **in a sandbox environment**. That means the integration has to
already work before the demo video can exist, so the review form is the *last*
step, not the first.

The order is: create app → verify domain → create sandbox and add a target user
→ **build and test the integration** → record → trim scopes → submit.

If the user is filling in the demo-video upload before the integration works,
stop them — there's nothing to record.

Sandbox setup: Sandbox settings → Target users → Add account, then log in with
the TikTok account and accept the developer terms. Up to 5 sandboxes per app and
10 target users. Results can take an hour to appear, so start it early.

## Scopes

- `user.info.basic` — mandatory, added by default. Since February 2024 it carries
  only `open_id`, `union_id`, avatar URLs and `display_name`. **`follower_count`
  was moved out of it**, which is the trap: submitting with just this scope gets
  approved and then can't read the one number the feature exists for.
- `user.info.stats` — `follower_count`, `following_count`, `likes_count`,
  `video_count`. This is the one that matters.

Nothing else is requested. `user.info.profile` (bio, username, `is_verified`,
`profile_deep_link`) is tempting and deliberately omitted: the UI doesn't display
those fields, and demoing data the app doesn't use invites questions.

`video.list` is also omitted. It would be the honest route to average views, but
whether it returns `view_count` is **unconfirmed** — the Display API docs
reachable so far list only `id`, `title`, `video_description`, `duration`,
`cover_image_url`, `embed_link` and `share_url`. Check the field reference before
committing to it. Until then `tiktok_avg_views` stays self-reported, because
`user.info.stats` gives total likes and video count, not per-video views, so an
average can't be derived honestly.

## Endpoints

```
Authorize:  https://www.tiktok.com/v2/auth/authorize/
            client_key, response_type=code, scope (COMMA separated),
            redirect_uri, state
Token:      POST https://open.tiktokapis.com/v2/oauth/token/
            form-encoded; client_key, client_secret, grant_type, code,
            redirect_uri
User info:  GET https://open.tiktokapis.com/v2/user/info/?fields=...
            Authorization: Bearer <token>
            Response: { data: { user: {...} }, error: { code, message, log_id } }
            Success is error.code === "ok", not the absence of the key.
```

Three differences from Meta that cause confusing failures:

- **`client_key`, not `client_id`.** A wrong param name surfaces as a generic
  error page after the user has already logged in.
- **Scopes are comma-separated**, not space-separated.
- **`state` is required**, and it's a real CSRF defence rather than paperwork:
  without verifying it, a crafted callback link can complete the OAuth dance and
  bind an attacker's TikTok account to a victim's Kollab profile, handing them a
  verified follower count they don't own.

## Token lifetimes drive the schema

The access token lives **24 hours**; the refresh token lives 365 days. Instagram's
long-lived token lasts 60 days, so TikTok is structurally different: a refresh
token is mandatory, and "refresh" genuinely spends it rather than reusing a
stored access token. TikTok may rotate the refresh token on use — store whatever
comes back, and keep the old one if the response omits it.

## Sandbox versus production credentials

A sandbox client key is prefixed `sbaw` (the current one is
`sbaw0r0q4qmxqtj9io`). Production issues a **different** key, so going live means
updating both the Supabase secret and the Vercel `VITE_TIKTOK_CLIENT_KEY`, then
redeploying. The failure looks like a generic auth error, so it's worth
remembering.

## Domain verification

Two options: URL prefix (file upload) or domain (DNS TXT record). Domain
verification covers the domain and its subdomains, which is what you want since
Terms, Privacy and the Web/Desktop URL all need verifying.

DNS for `appkollab.com` is at **Namecheap** (nameservers `registrar-servers.com`)
→ Domain List → Manage → Advanced DNS → Add New Record → TXT.

The Host field is the usual failure: `@` for the apex, `www` for
`www.appkollab.com`. Typing the full domain there creates
`appkollab.com.appkollab.com`, which fails silently and looks identical in the UI.

Verify propagation against a public resolver before clicking Verify, since a
local resolver can be stale:

```bash
nslookup -type=TXT www.appkollab.com 8.8.8.8
```

## Review timelines

TikTok publishes no review timeline and gives no guarantees, unlike Meta which is
slow but predictable. That argues for starting TikTok earlier rather than later.

## What TikTok cannot do

Audience demographics — age, gender, location — are **absent from the Display
API entirely**. They exist only in TikTok Studio (visible to the account owner),
Ads Manager, and the Business API, none of which a Login Kit app can reach. The
Research API has them but is for academic institutions.

So the "Audience insights coming soon" card can only ever be half-filled from
Instagram. Don't promise TikTok demographics.
