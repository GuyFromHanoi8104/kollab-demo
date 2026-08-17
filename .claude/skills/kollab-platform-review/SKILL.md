---
name: kollab-platform-review
description: Preparing Kollab's Meta/Instagram and TikTok app review submissions — permission justifications, use-case and step-by-step answers, demo screencast shot lists, business verification, and the prerequisites that silently fail a submission. Use this skill whenever the user mentions app review, advanced access, business verification, a screencast or demo video, permission scopes like instagram_business_basic or user.info.stats, a reviewer, a rejection, or asks what a platform is asking them for. Also use it when a platform form field needs filling in, since the answers must stay consistent with what the app actually does.
---

# Kollab platform review submissions

Review submissions fail for boring reasons far more often than substantive ones:
a test account with the wrong role, a URL behind a login, a scope requested but
not demonstrated. The work is mostly making sure a stranger can reach the
feature and see it work.

Two rules cover most of it:

**The submission must describe what the app actually does.** Before writing any
answer, read the relevant UI and copy the real labels. A reviewer follows the
step-by-step literally, so "click Connect Instagram" must match the button text
character for character. Grep the page rather than recalling it.

**Only request scopes you will demonstrate on video.** Every extra scope is
something a reviewer looks for and doesn't find. That delays or fails the
review, and it costs nothing to add a scope later when there's a UI using it.

## Business Verification is a different process from App Review

These get conflated constantly, including by the user. They live in different
products and have different failure modes:

- **App Review** — in the App Dashboard. Permissions, use case, screencasts.
- **Business Verification** — in Meta Business Manager (Security Centre → Start
  Verification). Confirms a registered legal entity stands behind the app.

Advanced Access needs **both**, and attempting App Review before verification
clears is the standard sequencing mistake. Verification wants official documents
for a registered entity and commonly sits in review for a week or more.

Meta does **not** require the company's registered business activity to match
what the app does — a holding company or an unrelated entity is fine. What it
checks obsessively is that submitted details match the registration certificate
character for character.

TikTok is different: business verification there is described as mandatory for
mini games, mini dramas and monetisation features, not for Login Kit scopes, and
individual developer accounts exist. Don't tell the user they need a company for
TikTok without checking.

## Prerequisites that silently fail a submission

Check these before writing anything, because each produces a rejection with no
useful explanation:

- **The test account's role.** Kollab gates the Instagram and TikTok connection
  UI on `role === "creator"`. A brand test account leaves the reviewer unable to
  find the feature at all. This is the highest-value thing on this list.
- **App is in Live mode.** In Development, only app roles and added testers can
  complete OAuth, so a reviewer using their own account just hits an error.
- **Every submitted URL resolves publicly**, with no login and no redirect
  surprises. Verify with `curl`, and check the exact host — `www` versus bare
  domain has broken this project's redirect URIs before.
- **A professional (Business or Creator) platform account** is available for the
  recording; personal accounts can't complete these flows.

## The three answers platforms ask for

Most forms want some version of these. Keep them consistent with each other —
reviewers compare the public description against the justification.

**1. Can the app be loaded and tested externally?** Give the URL, state that no
install or allowlist is needed, provide test credentials, and say where in the
app the feature lives. Add anything non-obvious the reviewer needs, such as
requiring their own professional account to complete the connection.

**2. Use case and step-by-step.** The use case explains *why* the app needs this
data at all — this is the part reviewers actually weigh. Lead with the problem,
not the feature. Kollab's is: brands make spending decisions based on audience
size, creators currently type their own follower counts, and a brand has no way
to tell an accurate number from an inflated one.

The step-by-step is a script a reviewer follows literally. Number the steps,
name the real buttons, and include the disconnect step at the end — it
demonstrates the deletion path rather than just claiming it.

**3. Permission justification.** For each scope, state plainly: what endpoint is
called, what is stored, what is shown, and what is *not* done. The strongest
argument available to Kollab is how little it asks for, so lead with that. Then
list the deletion routes concretely — in-app disconnect, the platform's
deauthorize callback, and the data deletion callback.

## The demo recording

One continuous take, no cuts. A reviewer is checking that the permission screen
and the resulting data are genuinely connected, so an edit between those two
moments is the most common reason a recording is rejected.

Shot order that satisfies this:

1. Logged-out landing page, URL bar visible
2. Log in with the submitted test credentials
3. The feature's page, paused on the **before** state long enough to read it
4. Click the connect button
5. The platform's authorization screen **in full** — no cuts, no speed-up, the
   permission text legible
6. Approve, and land back on the app's own domain
7. Paused on the **after** state — the new number and the verified badge
8. Disconnect, and confirm the dialog
9. Paused on the badge being gone

What gets recordings rejected: cutting between the connect click and the
permission screen; hiding or cropping the URL bar; speeding up footage; showing
a mockup or staging build; skipping the disconnect step.

## Platform specifics

Read the relevant file when working on that platform:

- `references/meta.md` — Instagram Login, the callbacks, business verification
- `references/tiktok.md` — Login Kit, sandbox requirement, scope situation

## What can't be done for the user

Be direct about this rather than attempting it: creating test accounts (requires
entering a password), recording the video (requires their real platform account),
and pressing submit. Do everything else — draft every answer, build the shot
list, verify every URL resolves — and hand over a submission that only needs
those three human steps.
