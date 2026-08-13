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
 * @param {string} query  Free-text search.
 * @param {"creator"|"brand"} role
 * @returns {Promise<{status: string, ids: string[], message: string}>}
 */
export async function searchProfileIds(query, role, { limit = 25 } = {}) {
  const trimmed = (query || "").trim();
  if (!trimmed) return { status: SEARCH_STATUS.OK, ids: [], message: "" };

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
        ids: [],
        message: "Too many searches in a row. Give it a minute and try again.",
      };
    }
    if (!res.ok) {
      return {
        status: SEARCH_STATUS.UNAVAILABLE,
        ids: [],
        message: "Search is unavailable right now — browsing everyone instead.",
      };
    }

    const data = await res.json();
    return {
      status: SEARCH_STATUS.OK,
      ids: (data.results || []).map((r) => r.profile_id),
      message: "",
    };
  } catch {
    // Network failure, DNS, CORS rejection, or the 12s abort. Guests should
    // still be able to browse if the search service is down or out of
    // credit, so this is a soft notice rather than an error state.
    return {
      status: SEARCH_STATUS.UNAVAILABLE,
      ids: [],
      message: "Search is unavailable right now — browsing everyone instead.",
    };
  } finally {
    clearTimeout(timer);
  }
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
