// Shared helpers for the five self-reported creator stat columns
// (tiktok_followers, tiktok_avg_views, instagram_followers,
// instagram_avg_views, engagement_rate) -- used anywhere those numbers are
// displayed or sorted, so the null-vs-zero handling stays consistent.

export function formatCount(n) {
  if (n == null) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export function formatEngagement(n) {
  if (n == null) return null;
  return `${n}%`;
}

// Null only when neither platform value is reported -- distinct from a real
// reported value of 0, which should still sort/display as a real number.
function combineNullable(a, b) {
  if (a == null && b == null) return null;
  return (a ?? 0) + (b ?? 0);
}

export function combinedFollowers(profile) {
  return combineNullable(profile.tiktok_followers, profile.instagram_followers);
}

export function combinedAvgViews(profile) {
  return combineNullable(profile.tiktok_avg_views, profile.instagram_avg_views);
}

export function hasAnyStats(profile) {
  return (
    profile.tiktok_followers != null ||
    profile.tiktok_avg_views != null ||
    profile.instagram_followers != null ||
    profile.instagram_avg_views != null ||
    profile.engagement_rate != null
  );
}

// Nulls (not-yet-reported) always sort to the end, regardless of direction --
// there's nothing to rank them by, so they shouldn't be treated as zero.
export function sortByStatDesc(list, getValue) {
  return [...list].sort((a, b) => {
    const av = getValue(a);
    const bv = getValue(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return bv - av;
  });
}
