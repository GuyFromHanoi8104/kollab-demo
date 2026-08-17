# Meta / Instagram specifics

## Which API this is

**Instagram API with Instagram Login** — not Facebook Login for Business.

This matters because the project migrated between them. The Facebook flow
required every creator to own a Facebook Page, link Instagram to it, and hold
Advanced Access before anyone but the app's own testers could connect. For a
creator marketplace that's a signup-killing amount of friction: plenty of
Instagram creators have no Facebook Page and no reason to make one. It also
depended on `GET /me/accounts`, which returned an empty list on a real,
correctly-linked account, because enumerating Pages and reading one by id are
authorised differently.

Instagram Login authenticates against the professional account directly. No
Pages, no enumeration, no chooser.

Consequence for credentials: the **Instagram** App ID and Secret (from
Instagram → API setup with Instagram login) are *different values* from the
Facebook App ID and Secret. Swapping them fails in confusing ways.

## Scope

`instagram_business_basic` — the only one requested. It covers
`GET /me?fields=user_id,username,followers_count`.

Advanced Access is required because Kollab serves Instagram accounts it doesn't
own or manage. Standard Access only covers accounts with a role on the app.

## Where things live in the dashboard

Redirect URIs, the Deauthorize Callback URL and the Data Deletion Request URL
are all in the same place: **Instagram → API setup with Instagram login → Step 3
"Set up Instagram business login" → Business login settings**.

## The two privacy callbacks

Meta requires both before granting Advanced Access. Both are served by the
single `meta-callbacks` Edge Function:

- `POST /meta-callbacks/deauthorize` — fires when someone removes Kollab in
  their Instagram settings. Mirrors the in-app Disconnect.
- `POST /meta-callbacks/data-deletion` — erases everything Kollab received from
  Instagram and returns `{ url, confirmation_code }`.
- `GET /meta-callbacks/data-deletion?code=...` — the human-readable status page
  Meta requires, which must explain the status of the request "including a
  legitimate justification for any refusal to delete".

Both POSTs carry a `signed_request` and **no** Supabase session, so the
HMAC-SHA256 signature is the entire security boundary. It is verified with
`crypto.subtle.verify` over the raw payload string before any row is touched,
and accounts are matched on the id Meta signed. The function must be deployed
with Verify JWT **off**, or Supabase rejects Meta's POST first.

The status page deliberately states that the Kollab account itself is out of
scope — the person created it directly on Kollab and Meta never supplied it.
That's the "legitimate justification" language Meta asks for.

## Testing the callbacks for real

Forged-signature tests prove the checks reject bad input, but they can't prove
Meta's actual payload format matches. The real test is to remove Kollab from
Instagram → Settings → Apps and websites, then check the function logs for:

```
deauthorize: cleared 1 profile(s)
```

Worth doing before submitting rather than after a rejection.

## Business verification, current plan

Kollab is not a registered company. The plan already decided: submit the user's
uncle's existing Vietnamese insurance company now, then in December 2026 register
their own holding company, re-verify, and remove the uncle's company. Accepted
cost is roughly a one-month maintenance notice on the connection feature during
migration, with creators self-reporting meanwhile.

The liability objection was raised and the user reaffirmed. Treat it as settled.

Outstanding: Terms and Privacy name only "Kollab" with no legal entity. They
need the registered name, number and address, copied from the same document
submitted to Meta so the strings match.

## Audience insights

Meta *can* supply follower demographics, via an insights permission beyond the
one currently requested. TikTok cannot at all. Don't design a UI promising both.
