import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import MarketingNavBar from "../components/MarketingNavBar";
import Footer from "../components/Footer";
import AvatarImage from "../components/AvatarImage";
import { useAuth } from "../context/useAuth";
import { supabase } from "../../supabaseClient";
import { PROFILE_COLUMNS } from "../../utils/profileColumns";
import { SEARCH_STATUS, orderByIds, searchProfileIds } from "../../utils/searchApi";
import { NICHE_STYLES } from "../components/nicheStyles";
import { combinedFollowers, formatCount, formatEngagement, hasAnyStats, sortByStatDesc } from "../../utils/creatorStats";

// Public marketing page, not a workspace page. This used to render inside the
// app shell (AppSidebar + AppTopBar) despite /discover being a public route,
// so a visitor clicking "KOLs" in the marketing nav was dropped into what
// looked like somebody else's dashboard. Campaigns Browse was already the
// right shape for a public browse page; this now matches it.
//
// Deliberately dropped along with the app shell: the 320px aside (Premium AI
// panel, Recently Viewed, Saved Lists) and the compare tray. Those are
// account-scoped workspace features that don't belong on a page whose main
// job is letting a stranger evaluate creators and then sign up. Saved
// creators already have their own page at /saved.
//
// What a guest can and can't see follows one rule: gate the transaction, not
// the information. Names, niches, locations, bios, follower counts and
// verification status are all public -- that's what earns a brand's trust
// before they have an account, and what a search engine could index. The
// handle is NOT public, because on this platform the handle *is* the contact
// method, and handing it to an anonymous visitor invites them to go DM the
// creator on Instagram instead of hiring them here.

const colors = {
  navy: "#0b1c30",
  gray: "#434654",
  grayLight: "#737686",
  blue: "#2563eb",
  border: "rgba(195,197,215,0.4)",
};

const SORT_OPTIONS = ["relevance", "engagement", "followers"];
const SORT_LABELS = {
  relevance: "Relevance",
  engagement: "Highest Engagement",
  followers: "Most Followers",
};

function SearchIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.5" />
      <path d="M16 16l-3.5-3.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function LocationIcon({ color }) {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
      <path d="M6 13S1 8.4 1 5a5 5 0 0 1 10 0c0 3.4-5 8-5 8Z" stroke={color} strokeWidth="1.3" />
      <circle cx="6" cy="5" r="1.6" stroke={color} strokeWidth="1.3" />
    </svg>
  );
}

function EyeIcon({ color }) {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
      <path d="M1 6s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z" stroke={color} strokeWidth="1.3" />
      <circle cx="8" cy="6" r="2" stroke={color} strokeWidth="1.3" />
    </svg>
  );
}

function SaveIcon({ filled }) {
  return (
    <svg width="18" height="16" viewBox="0 0 18 16" fill="none">
      <path
        d="M9 15S1 10.2 1 5.4A3.9 3.9 0 0 1 9 3.2a3.9 3.9 0 0 1 8 2.2C17 10.2 9 15 9 15Z"
        stroke={colors.gray}
        strokeWidth="1.5"
        fill={filled ? "#ba1a1a" : "none"}
        style={{ transition: "fill 150ms ease-out" }}
      />
    </svg>
  );
}

function SortChevron() {
  return (
    <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
      <path d="M1 1l5 5 5-5" stroke={colors.blue} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function nicheStyle(tag) {
  return NICHE_STYLES[tag] ?? { bg: "#e5eeff", color: "#1550d3" };
}

/** Verified means the number came from the platform's own API, not the creator. */
function StatsProvenance({ creator }) {
  if (!hasAnyStats(creator)) {
    return (
      <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
        <EyeIcon color={colors.gray} />
        <span style={{ color: colors.gray, fontSize: 12, fontWeight: 600 }}>Stats not yet available</span>
      </span>
    );
  }
  // instagram_business_account_id is the marker instagram-connect writes, and
  // the only honest basis for calling a number verified here.
  const verified = !!creator.instagram_business_account_id || !!creator.stats_verified;
  return verified ? (
    <span style={{ color: "#16a34a", fontWeight: 700, fontSize: 12 }}>✓ Verified via Instagram</span>
  ) : (
    <span style={{ color: colors.grayLight, fontWeight: 600, fontSize: 12 }}>Self-reported</span>
  );
}

function StatBlock({ label, value }) {
  return (
    <div style={{ background: "#f6f8ff", borderRadius: 16, padding: 16, flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 700, color: colors.grayLight, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      {value != null ? (
        <div style={{ fontWeight: 800, color: colors.navy, fontSize: 20, marginTop: 4 }}>{value}</div>
      ) : (
        <div style={{ fontWeight: 600, color: colors.grayLight, fontSize: 13, marginTop: 6 }}>Not yet available</div>
      )}
    </div>
  );
}

function CreatorCard({ creator, saved, onToggleSave, isLoggedIn }) {
  const niches = creator.niche || [];
  const initial = creator.name?.charAt(0)?.toUpperCase() ?? "?";
  return (
    <div
      style={{
        background: "white",
        border: `1px solid ${colors.border}`,
        borderRadius: 24,
        boxShadow: "0px 12px 32px -8px rgba(37,99,235,0.08)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        width: 384,
        maxWidth: "100%",
      }}
    >
      <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", minWidth: 0 }}>
            <div style={{ width: 56, height: 56, borderRadius: 9999, background: "#e2e8f0", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: colors.grayLight }}>
              <AvatarImage url={creator.avatar_url} size="100%" radius={9999} fallback={initial} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: colors.navy, fontSize: 17, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {creator.name || "Unnamed creator"}
              </div>
              {/* The handle is the contact route, so it stays behind the
                  account wall -- see the note at the top of this file. */}
              {isLoggedIn && creator.handle && (
                <div style={{ color: colors.gray, fontSize: 14, marginTop: 2 }}>{creator.handle}</div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onToggleSave(creator.id)}
            aria-label={saved ? "Remove from saved" : "Save creator"}
            style={{ background: "#f6f8ff", border: "none", borderRadius: 9999, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <SaveIcon filled={saved} />
          </button>
        </div>

        {niches.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {niches.map((tag) => {
              const style = nicheStyle(tag);
              return (
                <span key={tag} style={{ background: style.bg, color: style.color, fontWeight: 700, fontSize: 12, borderRadius: 9999, padding: "5px 13px" }}>
                  {tag}
                </span>
              );
            })}
          </div>
        )}

        <p style={{ color: colors.gray, fontSize: 14, lineHeight: "22px", margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", minHeight: 22 }}>
          {creator.bio || "No bio yet."}
        </p>

        <div style={{ display: "flex", gap: 16 }}>
          <StatBlock label="Followers" value={formatCount(combinedFollowers(creator))} />
          <StatBlock label="Engagement" value={formatEngagement(creator.engagement_rate)} />
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <StatsProvenance creator={creator} />
          <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
            <LocationIcon color={colors.gray} />
            <span style={{ color: colors.gray, fontSize: 12, fontWeight: 600 }}>{creator.location || "Location not set"}</span>
          </span>
        </div>

        <Link
          to={`/creator/${creator.id}`}
          style={{ background: colors.blue, borderRadius: 12, padding: "15px 0", fontWeight: 700, color: "white", fontSize: 16, textAlign: "center", textDecoration: "none", display: "block", marginTop: "auto" }}
        >
          View Full Profile
        </Link>
      </div>
    </div>
  );
}

export default function DiscoverCreators() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();

  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState(new Set());
  const [activeTags, setActiveTags] = useState(new Set());
  const [sortBy, setSortBy] = useState("relevance");

  // searchIds === null means "no search active" -- the page falls back to the
  // full list plus tag filtering.
  const [searchParams] = useSearchParams();
  const [searchText, setSearchText] = useState(searchParams.get("q") || "");
  const [searchIds, setSearchIds] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchNotice, setSearchNotice] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("role", "creator")
        .order("created_at", { ascending: false });
      if (!active) return;
      setCreators(data ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Saved hearts reflect real saved_profiles rows rather than resetting every
  // visit. Guests have nowhere to persist this, so the set stays empty.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) {
        setSavedIds(new Set());
        return;
      }
      const { data } = await supabase.from("saved_profiles").select("saved_profile_id").eq("owner_id", user.id);
      if (!active) return;
      setSavedIds(new Set((data ?? []).map((r) => r.saved_profile_id)));
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const runSearch = async (raw) => {
    const trimmed = (raw ?? searchText).trim();
    if (!trimmed) {
      setSearchIds(null);
      setSearchNotice("");
      return;
    }
    setSearching(true);
    setSearchNotice("");
    const { status, ids, message } = await searchProfileIds(trimmed, "creator");
    if (status === SEARCH_STATUS.OK) {
      setSearchIds(ids);
    } else {
      // Rate limited or unreachable: keep browsing working rather than showing
      // a broken state, and say why.
      setSearchIds(null);
      setSearchNotice(message);
    }
    setSearching(false);
  };

  // A ?q= handed over by the landing page's search should run once on arrival.
  // Each search embeds the query through OpenAI and costs real money, so this
  // fires on the initial query only -- never per keystroke.
  const seededQuery = searchParams.get("q");
  const seedRan = useRef(false);
  useEffect(() => {
    if (seedRan.current || !seededQuery?.trim()) return;
    seedRan.current = true;
    runSearch(seededQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seededQuery]);

  const toggleTag = (tag) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  const cycleSort = () => {
    setSortBy(SORT_OPTIONS[(SORT_OPTIONS.indexOf(sortBy) + 1) % SORT_OPTIONS.length]);
  };

  // Saving needs an account. The button stays visible for guests -- a control
  // you can see and click converts better than one that was never there, and
  // the click is where the ask belongs.
  const toggleSave = async (id) => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (savedIds.has(id)) {
      const { error } = await supabase.from("saved_profiles").delete().eq("owner_id", user.id).eq("saved_profile_id", id);
      if (!error) {
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } else {
      const { error } = await supabase.from("saved_profiles").insert({ owner_id: user.id, saved_profile_id: id });
      if (!error) setSavedIds((prev) => new Set(prev).add(id));
    }
  };

  const ALL_TAGS = [...new Set(creators.flatMap((c) => c.niche || []))];

  // Search only reorders/narrows the base list; tag filter and sort still
  // apply on top of whatever it returns.
  const searchActive = searchIds !== null;
  const baseCreators = searchActive ? orderByIds(creators, searchIds) : creators;
  const filtered = baseCreators.filter((c) => activeTags.size === 0 || (c.niche || []).some((t) => activeTags.has(t)));
  // Nulls (nothing reported yet) sort to the end regardless of direction, per
  // sortByStatDesc -- they are not treated as zero.
  const visibleCreators =
    sortBy === "engagement"
      ? sortByStatDesc(filtered, (c) => c.engagement_rate)
      : sortBy === "followers"
      ? sortByStatDesc(filtered, (c) => combinedFollowers(c))
      : filtered;

  return (
    <div
      className="kollab-discover"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: "white", textAlign: "left", position: "relative" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { margin: 0; background: white; }
        #root { max-width: none; margin: 0; padding: 0; width: 100%; }
        .kollab-discover, .kollab-discover *, .kollab-discover *::before, .kollab-discover *::after {
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .kollab-discover-hero { padding: 96px 16px 0 16px !important; }
          .kollab-discover-heading { font-size: 32px !important; letter-spacing: -0.8px !important; }
          /* The button used to be display:none here, which left no way to run
             a search on a phone at all -- this page only searches on submit,
             so the only remaining trigger was the keyboard's Go key, which
             isn't discoverable and isn't reliable across Android keyboards.
             It shrinks instead of disappearing. */
          .kollab-discover-search-input { padding-right: 104px !important; }
          .kollab-discover-search-btn { padding: 0 18px !important; font-size: 14px !important; }
          .kollab-discover-cta { padding: 40px 24px !important; }
          .kollab-discover-cta h2 { font-size: 32px !important; }
        }
      `}</style>

      <MarketingNavBar activeTab="kols" />

      <div className="kollab-discover-hero" style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", padding: "128px 24px 0 24px" }}>
        <h1 className="kollab-discover-heading" style={{ fontWeight: 800, color: colors.navy, fontSize: 56, letterSpacing: -1.5, textAlign: "center", margin: 0 }}>
          Discover Creators
        </h1>
        <p style={{ color: colors.gray, fontSize: 18, textAlign: "center", maxWidth: 672, margin: 0 }}>
          Find creators across Vietnam by niche, audience and location — with follower counts verified by Instagram.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch();
          }}
          style={{ position: "relative", maxWidth: 768, width: "100%", marginTop: 20 }}
        >
          <div style={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)" }}>
            <SearchIcon color={colors.grayLight} />
          </div>
          <input
            type="search"
            // Makes a phone keyboard show a Search key rather than a newline,
            // so the implicit form submit is at least offered as well.
            enterKeyHint="search"
            className="kollab-discover-search-input"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              // Emptying the box restores the full list immediately -- no
              // request needed to get back to browsing.
              if (!e.target.value.trim()) {
                setSearchIds(null);
                setSearchNotice("");
              }
            }}
            placeholder="Try “fitness creator in Hanoi” or a creator's name…"
            style={{ width: "100%", height: 64, background: "white", colorScheme: "light", border: `1px solid ${colors.border}`, borderRadius: 16, boxShadow: "0px 12px 32px -8px rgba(37,99,235,0.08)", padding: "0 130px 0 65px", fontSize: 16, color: colors.navy, outline: "none" }}
          />
          <button
            type="submit"
            className="kollab-discover-search-btn"
            disabled={searching}
            style={{ position: "absolute", right: 8, top: 8, bottom: 8, background: colors.blue, border: "none", borderRadius: 16, padding: "0 32px", fontWeight: 700, color: "white", fontSize: 16, cursor: searching ? "default" : "pointer", opacity: searching ? 0.7 : 1 }}
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </form>

        {searchNotice && (
          <p style={{ color: colors.grayLight, fontSize: 14, textAlign: "center", margin: 0, maxWidth: 672 }}>{searchNotice}</p>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "center", maxWidth: 1024, marginTop: 20 }}>
          {ALL_TAGS.map((tag) => {
            const active = activeTags.has(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                style={{
                  background: active ? colors.blue : "white",
                  border: active ? "none" : `1px solid ${colors.border}`,
                  borderRadius: 9999,
                  padding: active ? "11px 21px" : "10px 20px",
                  fontWeight: active ? 700 : 500,
                  color: active ? "white" : colors.gray,
                  fontSize: 14,
                  cursor: "pointer",
                  boxShadow: active ? "0px 4px 6px -1px rgba(37,99,235,0.2)" : "none",
                }}
              >
                {tag}
              </button>
            );
          })}
          <button
            type="button"
            onClick={cycleSort}
            style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: 16, background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <span style={{ color: colors.gray, fontSize: 14 }}>Sort By:</span>
            <span style={{ color: colors.navy, fontWeight: 700, fontSize: 14 }}>{SORT_LABELS[sortBy]}</span>
            <SortChevron />
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "48px auto 0 auto", padding: "0 24px 56px 24px", display: "flex", flexWrap: "wrap", gap: 32, justifyContent: "center" }}>
        {loading ? (
          <div style={{ width: "100%", textAlign: "center", color: colors.grayLight, fontSize: 14, padding: 40 }}>Loading creators…</div>
        ) : visibleCreators.length > 0 ? (
          visibleCreators.map((creator) => (
            <CreatorCard
              key={creator.id}
              creator={creator}
              saved={savedIds.has(creator.id)}
              onToggleSave={toggleSave}
              isLoggedIn={isLoggedIn}
            />
          ))
        ) : (
          <div style={{ width: "100%", textAlign: "center", color: colors.grayLight, fontSize: 14, padding: 40 }}>
            {searchActive
              ? `No creators match “${searchText.trim()}”.`
              : activeTags.size > 0
              ? "No creators in those niches yet."
              : "No creators on Kollab yet — check back soon."}
          </div>
        )}
      </div>

      {/* Creators already have an account, so the signup pitch would be noise. */}
      {!isLoggedIn && (
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div className="kollab-discover-cta" style={{ background: "#1e3a8a", borderRadius: 40, padding: 80, display: "flex", flexDirection: "column", gap: 24, alignItems: "center" }}>
            <h2 style={{ fontWeight: 800, color: "white", fontSize: 48, textAlign: "center", margin: 0 }}>Work with creators you can verify.</h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 18, textAlign: "center", maxWidth: 672, margin: 0 }}>
              Create a free brand account to message creators, send campaign invites and keep every collaboration in one place.
            </p>
            <Link
              to="/signup"
              style={{ background: colors.blue, borderRadius: 16, padding: "20px 48px", fontWeight: 700, color: "white", fontSize: 16, boxShadow: "0px 25px 50px -12px rgba(0,0,0,0.2)", textDecoration: "none", display: "inline-block" }}
            >
              Create Free Brand Account
            </Link>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
