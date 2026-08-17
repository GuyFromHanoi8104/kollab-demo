// Every column on `profiles` except instagram_access_token.
//
// That column is REVOKEd from anon/authenticated (see the
// 20260814_lock_instagram_token migration), because profiles has public
// SELECT for guest browsing and a long-lived Meta token must not be
// world-readable. Postgres expands `select=*` to every column including the
// revoked one and then refuses the whole query, so callers that used to ask
// for `*` list the columns instead.
//
// Anything added to profiles later needs adding here too, otherwise it simply
// won't load -- a missing field rather than a broken page, but confusing if
// you don't know to look.
export const PROFILE_COLUMNS = [
  "id",
  "role",
  "name",
  "avatar_url",
  "created_at",
  "company_name",
  "website",
  "industry",
  "handle",
  "bio",
  "niche",
  "location",
  "tiktok_followers",
  "tiktok_avg_views",
  "instagram_followers",
  "instagram_avg_views",
  "engagement_rate",
  "stats_verified",
  "stats_updated_at",
  "notify_new_applications",
  "notify_campaign_updates",
  // Safe to expose: an account id and a timestamp, no credential. Needed on
  // the client to tell a verified connection from a self-report.
  "instagram_business_account_id",
  "instagram_connected_at",
  // Same for TikTok. Its two token columns are deliberately absent -- see
  // 20260817_tiktok_connection; they are never granted to anon/authenticated,
  // so naming them here would break every query on this list.
  "tiktok_open_id",
  "tiktok_connected_at",
].join(", ");
