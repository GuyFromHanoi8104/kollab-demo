// Client for the Kollab search service (FastAPI + Weaviate).
//
// Returns a ranked list of profile IDs rather than profile objects: the API
// only carries id/name/role/handle/bio/niche/location, while the cards on
// Discover also need avatars, follower counts, engagement and campaign
// totals. Callers map the IDs back onto rows they already loaded from
// Supabase, so ranking comes from search and the card data stays complete.
//
// Never throws. Search is an enhancement over browsing that already works,
// so every failure resolves to a status the caller can fall back from.

const SEARCH_API_URL =
  import.meta.env.VITE_SEARCH_API_URL || "https://kollab-production.up.railway.app";

// The endpoint embeds the query through OpenAI and runs a vector search, so
// it is slower than a local filter but should never hang the UI.
const TIMEOUT_MS = 12000;

export const SEARCH_STATUS = {
  OK: "ok",
  RATE_LIMITED: "rate_limited",
  UNAVAILABLE: "unavailable",
};

/**
 * Full result rows: profile_id, name, role, handle, bio, niche, location,
 * distance. Used where there is no locally loaded row to enrich from -- the
 * landing page dropdown only needs a name and a niche, and never loaded the
 * full creator list to begin with.
 *
 * @param {string} query  Free-text search.
 * @param {"creator"|"brand"} role
 * @returns {Promise<{status: string, results: object[], message: string}>}
 */
export async function searchProfiles(query, role, { limit = 25 } = {}) {
  const trimmed = (query || "").trim();
  if (!trimmed) return { status: SEARCH_STATUS.OK, results: [], message: "" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${SEARCH_API_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: trimmed, role, limit }),
      signal: controller.signal,
    });

    if (res.status === 429) {
      return {
        status: SEARCH_STATUS.RATE_LIMITED,
        results: [],
        message: "Too many searches in a row. Give it a minute and try again.",
      };
    }
    if (!res.ok) {
      return {
        status: SEARCH_STATUS.UNAVAILABLE,
        results: [],
        message: "Search is unavailable right now — browsing everyone instead.",
      };
    }

    const data = await res.json();
    return { status: SEARCH_STATUS.OK, results: data.results || [], message: "" };
  } catch {
    // Network failure, DNS, CORS rejection, or the 12s abort. Guests should
    // still be able to browse if the search service is down or out of
    // credit, so this is a soft notice rather than an error state.
    return {
      status: SEARCH_STATUS.UNAVAILABLE,
      results: [],
      message: "Search is unavailable right now — browsing everyone instead.",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ranked IDs only, for callers that already hold the full rows and just need
 * the ordering (Discover Creators / Discover Brands).
 */
export async function searchProfileIds(query, role, opts) {
  const { status, results, message } = await searchProfiles(query, role, opts);
  return { status, ids: results.map((r) => r.profile_id), message };
}

/**
 * Reorders already-loaded rows to match the search ranking.
 * Drops IDs with no local row (e.g. a profile created since this page
 * loaded) rather than rendering a half-empty card.
 */
export function orderByIds(rows, ids, getId = (row) => row.id) {
  const byId = new Map(rows.map((row) => [getId(row), row]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}
