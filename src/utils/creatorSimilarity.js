// Scoring for "Similar Creators You Might Like" on a creator's profile.
//
// Computed locally rather than through the search service on purpose. That
// service embeds every query through OpenAI, which costs money per call --
// reasonable for a search someone typed, wasteful on every profile view. And
// "similar" here is structured rather than free-text: shared niches and the
// same city are exactly what a brand means by it, so a scored comparison over
// columns we already have is cheaper and more predictable than a vector search.
//
// Niches outweigh location because two fitness creators in different cities are
// a closer match for a campaign than two unrelated creators in the same one.
export const NICHE_WEIGHT = 2;
export const LOCATION_WEIGHT = 1;

/** How well `candidate` matches `subject`. 0 means no overlap at all. */
export function similarityScore(candidate, subject) {
  const subjectNiches = new Set(subject?.niche || []);
  const shared = (candidate?.niche || []).filter((n) => subjectNiches.has(n)).length;
  const sameLocation =
    !!candidate?.location &&
    !!subject?.location &&
    candidate.location.trim().toLowerCase() === subject.location.trim().toLowerCase();
  return shared * NICHE_WEIGHT + (sameLocation ? LOCATION_WEIGHT : 0);
}

/**
 * Rank `candidates` by similarity to `subject`, keeping only genuine matches.
 *
 * Zero-score candidates are dropped rather than used as padding: filling four
 * slots with unrelated people would make the heading above them a lie. Ties
 * break on follower count so the more useful of two equal matches leads.
 */
export function rankBySimilarity(candidates, subject, { limit = 4, getFollowers = () => 0 } = {}) {
  return (candidates || [])
    .filter((c) => c && c.id !== subject?.id)
    .map((creator) => ({ creator, score: similarityScore(creator, subject) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || (getFollowers(b.creator) ?? 0) - (getFollowers(a.creator) ?? 0))
    .slice(0, limit)
    .map(({ creator }) => creator);
}
