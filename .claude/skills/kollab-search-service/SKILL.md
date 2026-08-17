---
name: kollab-search-service
description: Working on Kollab's semantic search — the separate FastAPI + Weaviate + OpenAI service that powers Discover Creators, Discover Brands and the landing hero. Use this skill whenever the user mentions search relevance, ranking, embeddings, Weaviate, ingestion, the search API, Railway, or says search results look wrong or search is down. Essential because the service lives in a DIFFERENT repository from the frontend, so looking for it in the Kollab frontend repo finds only the thin client and leads to wrong conclusions.
---

# Kollab search service

Search is not in the frontend repo. Reading `src/utils/searchApi.js` and
concluding you've found the search implementation is the trap this skill exists
to prevent — that file is a thin HTTP client.

| | |
|---|---|
| **Service** | `C:\Cpp files\kollab-search-service` |
| **Deployed** | Railway → `https://kollab-production.up.railway.app` |
| **Stack** | FastAPI over Weaviate, embeddings via OpenAI `text-embedding-3-small` |
| **Git** | a friend's repo (`namdenn/kollab`), plus a fork. Work sits on branch `feat/weaviate-profile-ingest`; **no PR has been opened** |
| **Frontend client** | `src/utils/searchApi.js` (`VITE_SEARCH_API_URL`) |

Code lives under `Search Engine/src/agentic_rag_example/utils/` in that repo:
`ingest_kollab_profiles.py`, `search_profiles.py`, `api.py`,
`test_search_relevance.py`, and `ingest_kollab_campaigns.py` (written, blocked —
see below).

## The client returns IDs, not profiles

`searchProfileIds()` returns ranked profile IDs, and `orderByIds()` re-orders
rows fetched separately from Supabase. This looks like a detour but is
deliberate: the API carries only a handful of fields while cards need avatars,
stats and verification markers. Fetching full profiles from Supabase and merely
*ordering* by the search result keeps one source of truth for profile data.

Handle `SEARCH_STATUS.RATE_LIMITED` and `SEARCH_STATUS.UNAVAILABLE` by falling
back to plain unfiltered browsing with a visible notice. A search outage should
degrade the page, not break it.

## Every query costs money

Each search embeds the query through OpenAI. So searches fire **on submit only**
— Enter or the button — never per keystroke. If asked to add live/as-you-type
search, raise the cost before building it.

The same applies while testing: don't sweep dozens of queries casually. When
verifying a change, pick a handful of cases that discriminate between good and
bad ranking.

## Tuning relevance: measure, don't reason

Hybrid search blends vector and keyword scoring via
`HYBRID_ALPHA` (env `SEARCH_HYBRID_ALPHA`, currently **0.4**). 1.0 is pure
vector, 0.0 pure keyword.

That value was chosen by sweeping 0.25 through 0.65 against three sets of cases —
name lookups, the fixture suite, and queries with no lexical overlap — not by
picking a number that sounded balanced. Do the same for any future change:
`test_search_relevance.py` holds fixture-based cases with per-case rank
tolerance.

**A hypothesis that was tested and disproved:** field boosting (`name^4`,
`name^8`) produced byte-identical results. Weaviate's hybrid fuses *ranks*, not
raw BM25 scores, so boosting a field's weight inside the keyword query doesn't
move the fused ordering. Don't re-attempt it expecting a different answer.

## Ingestion

`ingest_kollab_profiles.py` reads real profiles from Supabase and writes them to
Weaviate. Supports `--recreate` and `--dry-run`.

**`profiles.niche` is a Postgres `text[]`, not text.** An early version called
`.strip()` on it and crashed the moment real niches existed. The column maps to a
Weaviate `TEXT_ARRAY` property via `_text_list()`. Any new array column needs the
same treatment.

Note that `skip_vectorization` excludes a property from the embedding but **not**
from the inverted index, so a skipped field still affects keyword matching.

## Two standing operational risks

**Weaviate sandbox expiry — 14 days.** The free sandbox expires and takes the
index with it. Recovery is one rerun of `ingest_kollab_profiles.py`, so no data
is permanently lost, but search returns nothing until someone notices. There is
no long-term plan yet; if the user reports "search finds nothing", check the
cluster before debugging ranking.

**Railway trial — $5 / 30 days.** Search stops when it lapses.

## Campaign search is blocked

`ingest_kollab_campaigns.py` is written and ready, but the free Weaviate tier
allows **one collection**, already used by profiles. So campaign search on
Discover Campaigns is still a client-side substring filter, not semantic. That's
a tier limit, not a missing feature — don't rewrite the script to work around it.

## Biggest lever on quality

Creator bios are empty across the board. Search quality is limited by input, not
algorithm: an early test had all distances identical (0.782643) because no
profile had any text. Once real niches and locations existed, "fitness and
lifestyle creator in Hanoi" ranked the right creator first, and "gym and workout
content" correctly inferred FITNESS.

So when asked to improve relevance, check what text the profiles actually contain
before touching alpha or the query pipeline.

## API shape

FastAPI with `lifespan` for pooled Weaviate connections, `slowapi` rate limiting,
`RequestValidationError` mapped to 400, and CORS. `client_ip()` reads the
**rightmost** `X-Forwarded-For` entry, because Railway appends the real client
and trusting the leftmost value would let a caller spoof their rate-limit key.
`/health` echoes the resolved `rate_limit_key`, which makes that behaviour
verifiable in production.

Lifespan records startup errors rather than raising, so a Weaviate outage yields
a service that reports its problem instead of a container that won't boot.

Deployed via Dockerfile (not Railpack) with `$PORT` injection and target-port
mapping.
