import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SEARCH_STATUS, searchProfiles } from "../../utils/searchApi";
import Footer from "../components/Footer";
import MarketingNavBar from "../components/MarketingNavBar";
import AvatarImage from "../components/AvatarImage";
import { useAuth } from "../context/useAuth";
import { supabase } from "../../supabaseClient";

const colors = {
  navy: "#191c1e",
  gray: "#434655",
  blue: "#2563eb",
  blueDark: "#004ac6",
};

const TRENDING_TAGS = ["Beauty", "Tech", "Lifestyle", "Fitness"];

// Cycled by index for real rows, matching the visual variety the old mock
// data had per-item instead of one flat color for every row.
const ROW_TINTS = ["rgba(37,99,235,0.1)", "rgba(37,99,235,0.16)", "rgba(101,109,132,0.1)"];

// Replaces the old stats row, which claimed "1000+ Active KOLs" and a
// "Secure Payment Guarantee" -- neither is true today (6 creators, no
// payments feature), and its three icon tiles were empty divs that rendered
// as blank grey squares. Steps describe what the product actually does, and
// cover both sides of the marketplace since brands and creators both land here.
const STEPS = [
  {
    n: "1",
    title: "Search",
    body: "Brands browse creators by niche, followers and engagement. Creators browse open campaigns.",
  },
  {
    n: "2",
    title: "Compare & invite",
    body: "Line up creators side by side on real numbers, then invite the ones that fit the brief.",
  },
  {
    n: "3",
    title: "Apply & collaborate",
    body: "Creators apply to campaigns they want. Agree the details and track it all in one place.",
  },
];

function SearchModeToggle({ mode, onChange }) {
  const btnStyle = (active) => ({
    padding: "10.5px 32px 11.5px",
    borderRadius: 9999,
    fontWeight: 600,
    fontSize: 14,
    letterSpacing: 0.28,
    border: active ? "none" : "1px solid rgba(195,198,215,0.3)",
    background: active ? colors.blue : "rgba(255,255,255,0.5)",
    color: active ? "white" : colors.gray,
    boxShadow: active ? "0px 4px 6px -1px rgba(37,99,235,0.3), 0px 2px 4px -2px rgba(37,99,235,0.3)" : "none",
    cursor: "pointer",
    transition: "background-color 200ms ease-out, border-color 200ms ease-out, color 200ms ease-out, box-shadow 200ms ease-out",
  });
  return (
    <div style={{ display: "flex", gap: 16, width: "100%" }}>
      <button type="button" onClick={() => onChange("kols")} style={btnStyle(mode === "kols")}>Find KOLs</button>
      <button type="button" onClick={() => onChange("campaigns")} style={btnStyle(mode === "campaigns")}>Find Campaigns</button>
    </div>
  );
}

const DROPDOWN_LIMIT = 4;

function SearchResultRow({ result, onPick }) {
  const initial = (result.name || "?").charAt(0).toUpperCase();
  const meta = [(result.niche || []).join(" · "), result.location].filter(Boolean).join(" — ");
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // keep focus so blur doesn't close first
      onClick={() => onPick(result)}
      style={{
        display: "flex", gap: 12, alignItems: "center", width: "100%", textAlign: "left",
        background: "none", border: "none", borderBottom: "1px solid rgba(195,198,215,0.25)",
        padding: "12px 16px", cursor: "pointer",
      }}
    >
      <span
        style={{
          width: 34, height: 34, borderRadius: 9999, flexShrink: 0, background: "#dce1ff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, color: "#1550d3", fontSize: 14,
        }}
      >
        {initial}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 700, color: colors.navy, fontSize: 14 }}>
          {result.name || "Unnamed"}
        </span>
        <span style={{ display: "block", color: "#737686", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {meta || "No niche set yet"}
        </span>
      </span>
    </button>
  );
}

function SearchCard({ mode, onModeChange }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null); // null = no search run yet
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState("");
  const boxRef = useRef(null);

  // Same click-outside approach as NotificationBell rather than a backdrop
  // element, which would need to out-rank everything else on the page.
  useEffect(() => {
    if (results === null && !notice) return;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setResults(null);
        setNotice("");
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [results, notice]);

  // Only on Enter or the Search button -- never per keystroke, since each
  // call embeds the query through OpenAI and costs real money.
  // Takes an optional override so a Trending chip can search its own tag
  // immediately -- setQuery is async, so reading `query` back on the next line
  // would search whatever was there before the click.
  const runSearch = async (raw) => {
    const trimmed = (raw ?? query).trim();
    if (!trimmed) return;

    // Campaigns are not in the search index (Weaviate holds profiles only),
    // so this hands the query to the campaigns page's own filter instead of
    // pretending to semantically search something that isn't indexed.
    if (mode === "campaigns") {
      navigate(`/campaigns?q=${encodeURIComponent(trimmed)}`);
      return;
    }

    setSearching(true);
    setNotice("");
    const { status, results: rows, message } = await searchProfiles(trimmed, "creator", { limit: DROPDOWN_LIMIT });
    if (status === SEARCH_STATUS.OK) {
      setResults(rows);
    } else {
      setResults(null);
      setNotice(message);
    }
    setSearching(false);
  };

  const dropdownOpen = searching || !!notice || results !== null;

  return (
    <div
      className="kollab-search-card"
      style={{
        backdropFilter: "blur(10px)",
        background: "rgba(255,255,255,0.4)",
        border: "1px solid rgba(255,255,255,0.5)",
        borderRadius: 32,
        boxShadow: "0px 8px 32px 0px rgba(31,38,135,0.07)",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        maxWidth: 896,
        width: "100%",
        padding: 33,
        boxSizing: "border-box",
      }}
    >
      <SearchModeToggle mode={mode} onChange={onModeChange} />

      <div ref={boxRef} style={{ position: "relative", width: "100%" }}>
        <div className="kollab-search-row" style={{ display: "flex", gap: 12, width: "100%" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "rgba(115,118,134,0.6)" }}>🔍</span>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value.trim()) {
                  setResults(null);
                  setNotice("");
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch();
                if (e.key === "Escape") { setResults(null); setNotice(""); }
              }}
              placeholder={mode === "kols" ? "Search creators by niche, location or keywords..." : "Search campaigns by brand, title or niche..."}
              style={{
                background: "rgba(255,255,255,0.8)",
                colorScheme: "light",
                borderRadius: 16,
                boxShadow: "0px 0px 0px 1px rgba(195,198,215,0.3)",
                width: "100%",
                padding: "19px 24px 20px 48px",
                fontSize: 18,
                color: colors.navy,
                border: "none",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            type="button"
            className="kollab-search-button"
            onClick={runSearch}
            disabled={searching}
            style={{
              background: colors.blue,
              borderRadius: 16,
              boxShadow: "0px 10px 15px -3px rgba(37,99,235,0.2), 0px 4px 6px -4px rgba(37,99,235,0.2)",
              padding: "19.5px 40px 20.5px",
              fontWeight: 600,
              color: "white",
              fontSize: 14,
              letterSpacing: 0.28,
              border: "none",
              cursor: searching ? "default" : "pointer",
              opacity: searching ? 0.7 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </div>

        {dropdownOpen && (
          <div
            style={{
              position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, zIndex: 30,
              background: "white", border: "1px solid rgba(195,198,215,0.4)", borderRadius: 16,
              boxShadow: "0px 20px 40px -10px rgba(0,0,0,0.18)", overflow: "hidden",
            }}
          >
            {searching ? (
              <div style={{ padding: 20, textAlign: "center", color: "#737686", fontSize: 14 }}>Searching creators…</div>
            ) : notice ? (
              <div style={{ padding: 20, textAlign: "center", color: "#b45309", fontSize: 14, fontWeight: 600 }}>{notice}</div>
            ) : results && results.length > 0 ? (
              <>
                {results.slice(0, DROPDOWN_LIMIT).map((r) => (
                  <SearchResultRow key={r.profile_id} result={r} onPick={(row) => navigate(`/creator/${row.profile_id}`)} />
                ))}
                <button
                  type="button"
                  onClick={() => navigate("/discover")}
                  style={{ display: "block", width: "100%", background: "none", border: "none", padding: "12px 16px", color: colors.blue, fontWeight: 700, fontSize: 13, cursor: "pointer", textAlign: "center" }}
                >
                  See all creators →
                </button>
              </>
            ) : (
              <div style={{ padding: 20, textAlign: "center", color: "#737686", fontSize: 14 }}>No creators matched that search.</div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 700, color: colors.gray, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase" }}>Trending:</span>
        {/* A shortcut into the search rather than a sticky filter, so there's
            no active state to show: it fills the box and searches, and in
            campaigns mode runSearch navigates to /campaigns?q= exactly as
            typing the same word would. */}
        {TRENDING_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => {
              setQuery(tag);
              runSearch(tag);
            }}
            style={{
              background: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(195,198,215,0.2)",
              borderRadius: 9999,
              padding: "7px 17px",
              fontWeight: 500,
              color: colors.gray,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

function Donut({ pct, size = 64, stroke = 8, color = colors.blue, track = "rgba(37,99,235,0.15)" }) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(circumference * pct) / 100} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

// Deliberately illustrative, not wired to Supabase. There are 6 creators
// today and exactly one has any stat filled in, so a live-data table would
// render as a wall of em-dashes in the hero -- the worst possible first
// impression. The columns mirror what Kollab actually stores (followers,
// engagement rate, niche) rather than the audience gender/age breakdown the
// schema has no columns for, so this stays an honest picture of the product.
// Initials instead of photos, and a "Product preview" chip, so it can't read
// as a claim about specific real creators.
const PREVIEW_ROWS = [
  { handle: "@linh.beauty", niche: "Beauty", followers: "128K", er: "6.2%", tint: "#f472b6" },
  { handle: "@minh.tech", niche: "Tech", followers: "94.3K", er: "5.1%", tint: "#2563eb" },
  { handle: "@anfitlife", niche: "Fitness", followers: "76.8K", er: "7.4%", tint: "#f59e0b" },
  { handle: "@chi.foodie", niche: "Food", followers: "61.2K", er: "4.8%", tint: "#10b981" },
  { handle: "@haadaily", niche: "Lifestyle", followers: "48.5K", er: "8.1%", tint: "#8b5cf6" },
];

function PreviewRow({ row, last }) {
  return (
    <div
      className="kollab-preview-row"
      style={{
        display: "grid",
        gridTemplateColumns: "1.7fr 0.9fr 0.9fr 1fr",
        alignItems: "center",
        gap: 12,
        padding: "11px 20px",
        borderBottom: last ? "none" : "1px solid rgba(195,198,215,0.25)",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
        <span
          style={{
            width: 28, height: 28, borderRadius: 9999, flexShrink: 0, background: row.tint,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontWeight: 700, fontSize: 11,
          }}
        >
          {row.handle.charAt(1).toUpperCase()}
        </span>
        <span style={{ fontWeight: 600, color: colors.navy, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {row.handle}
        </span>
      </div>
      <span style={{ fontWeight: 700, color: colors.navy, fontSize: 13 }}>{row.followers}</span>
      <span className="kollab-preview-er" style={{ fontWeight: 700, color: "#16a34a", fontSize: 13 }}>{row.er}</span>
      <span className="kollab-preview-niche" style={{ justifySelf: "start", background: "rgba(37,99,235,0.09)", borderRadius: 8, padding: "3px 10px", fontWeight: 600, color: colors.blue, fontSize: 11 }}>
        {row.niche}
      </span>
    </div>
  );
}

function ProductPreview() {
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div
        style={{
          background: "white",
          border: "1px solid rgba(195,198,215,0.4)",
          borderRadius: 24,
          boxShadow: "0px 25px 50px -12px rgba(21,80,211,0.18)",
          overflow: "hidden",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid rgba(195,198,215,0.3)" }}>
          <span style={{ fontWeight: 700, color: colors.navy, fontSize: 14 }}>Discover creators</span>
          <span style={{ background: "rgba(37,99,235,0.09)", borderRadius: 9999, padding: "4px 12px", fontWeight: 600, color: colors.blue, fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase" }}>
            Product preview
          </span>
        </div>

        <div
          className="kollab-preview-row kollab-preview-head"
          style={{
            display: "grid",
            gridTemplateColumns: "1.7fr 0.9fr 0.9fr 1fr",
            gap: 12,
            padding: "9px 20px",
            background: "rgba(247,249,251,0.9)",
            borderBottom: "1px solid rgba(195,198,215,0.3)",
            fontWeight: 700,
            color: colors.gray,
            fontSize: 9.5,
            letterSpacing: 0.7,
            textTransform: "uppercase",
          }}
        >
          <span>Creator</span>
          <span>Followers</span>
          <span className="kollab-preview-er">Engagement</span>
          <span className="kollab-preview-niche">Niche</span>
        </div>

        {PREVIEW_ROWS.map((row, i) => (
          <PreviewRow key={row.handle} row={row} last={i === PREVIEW_ROWS.length - 1} />
        ))}
      </div>

      {/* Overlapping campaign card -- hidden on narrow screens where it would
          cover the table instead of sitting beside it. */}
      <div
        className="kollab-preview-campaign"
        style={{
          position: "absolute",
          right: -18,
          bottom: -28,
          width: 246,
          background: "white",
          border: "1px solid rgba(195,198,215,0.4)",
          borderRadius: 20,
          boxShadow: "0px 20px 40px -10px rgba(0,0,0,0.22)",
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, color: colors.navy, fontSize: 13 }}>Summer Launch · VN</div>
          <span style={{ display: "inline-block", marginTop: 5, background: "#dcfce7", borderRadius: 6, padding: "2px 8px", fontWeight: 700, color: "#16a34a", fontSize: 10 }}>
            Active
          </span>
        </div>

        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Donut pct={62} />
            <span style={{ position: "absolute", fontWeight: 800, color: colors.navy, fontSize: 13 }}>62%</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <div>
              <div style={{ fontWeight: 800, color: colors.navy, fontSize: 16, lineHeight: 1 }}>340K</div>
              <div style={{ color: colors.gray, fontSize: 10 }}>Total reach</div>
            </div>
            <div>
              <div style={{ fontWeight: 800, color: colors.navy, fontSize: 16, lineHeight: 1 }}>8</div>
              <div style={{ color: colors.gray, fontSize: 10 }}>Creators</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <div style={{ borderTop: "1px solid rgba(195,198,215,0.25)", width: "100%", paddingTop: 44, paddingBottom: 8 }}>
      <h2 style={{ fontWeight: 800, color: colors.navy, fontSize: 22, margin: "0 0 28px 0" }}>How it works</h2>
      <div className="kollab-steps" style={{ display: "flex", gap: 32, width: "100%" }}>
        {STEPS.map((step) => (
          <div key={step.n} style={{ display: "flex", gap: 14, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
            <span
              style={{
                width: 34, height: 34, borderRadius: 12, flexShrink: 0,
                background: "rgba(37,99,235,0.1)", color: colors.blue,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 15,
              }}
            >
              {step.n}
            </span>
            <div>
              <p style={{ fontWeight: 700, color: colors.navy, fontSize: 15, lineHeight: "20px", margin: 0 }}>{step.title}</p>
              <p style={{ fontWeight: 400, color: colors.gray, fontSize: 13, lineHeight: "19px", margin: "4px 0 0 0" }}>{step.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Each panel is a full-viewport sticky block, so scrolling pins one pain
// point while the next slides up and covers it -- the stacking effect from
// the reference site. Pure CSS, no scroll listeners or observers.
const PAIN_POINTS = [
  "Still scrolling TikTok and Instagram hoping to spot the right creator?",
  "Still negotiating rates across endless DM and email threads?",
];

function PainPoints() {
  const { isLoggedIn, role } = useAuth();
  // A signed-in visitor has already "got started" -- send them to the side of
  // the marketplace they actually use rather than leaving the closing panel
  // with nothing to act on.
  const cta = !isLoggedIn
    ? { to: "/signup", label: "Get started free" }
    : role === "brand"
      ? { to: "/discover", label: "Discover creators" }
      : { to: "/campaigns", label: "Browse campaigns" };

  return (
    <section className="kollab-pain" style={{ width: "100%", position: "relative" }}>
      {PAIN_POINTS.map((line, i) => (
        <div
          key={line}
          className="kollab-pain-panel"
          style={{
            position: "sticky",
            top: 0,
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 32px",
            background: `linear-gradient(135deg, #1e3a8a 0%, ${colors.blue} 100%)`,
            boxShadow: i === 0 ? "none" : "0px -20px 40px -12px rgba(0,0,0,0.35)",
          }}
        >
          <h2
            className="kollab-pain-text"
            style={{
              fontWeight: 800,
              color: "white",
              fontSize: 52,
              lineHeight: "1.15",
              letterSpacing: -1,
              textAlign: "center",
              textTransform: "uppercase",
              maxWidth: 1000,
              margin: 0,
            }}
          >
            {line}
          </h2>
        </div>
      ))}

      <div
        className="kollab-pain-panel"
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          gap: 32,
          alignItems: "center",
          justifyContent: "center",
          padding: "0 32px",
          background: "linear-gradient(135deg, #0b1c30 0%, #1e3a8a 100%)",
          boxShadow: "0px -20px 40px -12px rgba(0,0,0,0.35)",
        }}
      >
        <h2
          className="kollab-pain-text"
          style={{
            fontWeight: 800, color: "white", fontSize: 52, lineHeight: "1.15", letterSpacing: -1,
            textAlign: "center", textTransform: "uppercase", maxWidth: 1000, margin: 0,
          }}
        >
          With Kollab, it all happens in one place.
        </h2>
        <Link
          to={cta.to}
          style={{
            background: "white", borderRadius: 16, padding: "18px 44px", fontWeight: 700,
            color: colors.blue, fontSize: 16, textDecoration: "none",
            boxShadow: "0px 25px 50px -12px rgba(0,0,0,0.3)",
          }}
        >
          {cta.label}
        </Link>
      </div>
    </section>
  );
}

function SidebarPanel({ title, viewAllTo, children }) {
  return (
    <div
      style={{
        backdropFilter: "blur(10px)",
        background: "rgba(255,255,255,0.4)",
        border: "1px solid rgba(255,255,255,0.5)",
        borderRadius: 40,
        boxShadow: "0px 8px 32px 0px rgba(31,38,135,0.07)",
        display: "flex",
        flexDirection: "column",
        gap: 32,
        width: "100%",
        padding: 33,
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        <h3 style={{ fontWeight: 700, color: colors.navy, fontSize: 24, margin: 0 }}>{title}</h3>
        {viewAllTo ? (
          <Link to={viewAllTo} style={{ fontWeight: 700, color: colors.blue, fontSize: 12, textDecoration: "none" }}>View All</Link>
        ) : (
          <a href="#" style={{ fontWeight: 700, color: colors.blue, fontSize: 12, textDecoration: "none" }}>View All</a>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%" }}>{children}</div>
    </div>
  );
}

// Follower counts/engagement rate have no real data source yet (needs a
// TikTok/Instagram API integration -- separate future task), so this row
// just doesn't claim numbers it doesn't have, rather than showing fake ones.
function FeaturedKolRow({ kol, tint }) {
  const niches = kol.niche || [];
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", width: "100%" }}>
      <div style={{ borderRadius: "50%", background: tint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: 56, height: 56, fontWeight: 700, color: colors.navy, textAlign: "center", lineHeight: 1, overflow: "hidden" }}>
        <AvatarImage url={kol.avatar_url} size="100%" radius="50%" fallback={kol.name?.charAt(0).toUpperCase()} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700, color: colors.navy, fontSize: 14, letterSpacing: 0.28, margin: 0 }}>{kol.handle || kol.name}</p>
        <p style={{ fontWeight: 500, color: colors.gray, fontSize: 12, margin: 0 }}>{niches.length > 0 ? niches.join(" & ") : "Creator"}</p>
      </div>
    </div>
  );
}

function BrandRow({ brand, tint }) {
  const displayName = brand.company_name || brand.name;
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", width: "100%" }}>
      <div style={{ borderRadius: 12, background: tint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: 48, height: 48, fontWeight: 700, color: colors.navy, textAlign: "center", lineHeight: 1, overflow: "hidden" }}>
        <AvatarImage url={brand.avatar_url} size="100%" radius={12} fallback={displayName?.charAt(0).toUpperCase()} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700, color: colors.navy, fontSize: 14, letterSpacing: 0.28, margin: 0 }}>{displayName}</p>
        <p style={{ fontWeight: 500, color: colors.gray, fontSize: 12, margin: 0 }}>{brand.industry || "Brand"}</p>
      </div>
    </div>
  );
}


export default function LandingPage() {
  const [mode, setMode] = useState("kols"); // "kols" | "campaigns"
  const [featuredCreators, setFeaturedCreators] = useState([]);
  const [activeBrands, setActiveBrands] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: creatorRows }, { data: brandRows }] = await Promise.all([
        supabase.from("profiles").select("id, name, handle, niche, avatar_url").eq("role", "creator").order("created_at", { ascending: false }).limit(3),
        supabase.from("profiles").select("id, name, company_name, industry, avatar_url").eq("role", "brand").order("created_at", { ascending: false }).limit(3),
      ]);
      if (!active) return;
      setFeaturedCreators(creatorRows ?? []);
      setActiveBrands(brandRows ?? []);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      className="kollab-landing"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 160,
        alignItems: "center",
        paddingTop: 128,
        position: "relative",
        width: "100%",
        background: "linear-gradient(90deg, rgb(247,249,251) 0%, rgb(247,249,251) 100%)",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        textAlign: "left",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body {
          margin: 0;
          background: white;
        }
        #root {
          max-width: none;
          margin: 0;
          padding: 0;
          width: 100%;
        }
        .kollab-landing, .kollab-landing *, .kollab-landing *::before, .kollab-landing *::after {
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .kollab-landing {
            gap: 64px !important;
            padding-top: 96px !important;
          }
          .kollab-hero-grid {
            grid-template-columns: 1fr !important;
            padding: 0 20px !important;
            gap: 40px !important;
          }
          .kollab-hero-grid > div {
            grid-column: span 1 !important;
          }
          .kollab-hero-heading {
            font-size: 36px !important;
            line-height: 44px !important;
            letter-spacing: -0.9px !important;
          }
          .kollab-hero-subtext {
            font-size: 16px !important;
          }
          .kollab-search-card {
            padding: 20px !important;
          }
          .kollab-search-row {
            flex-direction: column !important;
          }
          .kollab-search-button {
            width: 100% !important;
          }
          .kollab-steps {
            flex-direction: column !important;
            gap: 20px !important;
          }
          /* The overlapping campaign card would cover the table rather than
             sit beside it once the column narrows. */
          .kollab-preview-campaign {
            display: none !important;
          }
          .kollab-preview-row {
            grid-template-columns: 1.7fr 0.9fr 1fr !important;
          }
          .kollab-preview-er {
            display: none !important;
          }
        }
        @media (max-width: 480px) {
          .kollab-preview-row {
            grid-template-columns: 1.7fr 0.9fr !important;
            padding-left: 14px !important;
            padding-right: 14px !important;
          }
          .kollab-preview-niche {
            display: none !important;
          }
        }
        @media (max-width: 1024px) {
          .kollab-pain-text {
            font-size: 34px !important;
            letter-spacing: -0.6px !important;
          }
        }
        @media (max-width: 600px) {
          .kollab-pain-text {
            font-size: 26px !important;
            letter-spacing: -0.3px !important;
          }
        }
      `}</style>

      <MarketingNavBar activeTab="explore" />

      <div className="kollab-hero-grid" style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 48, width: "100%", maxWidth: 1200, padding: "0 40px", boxSizing: "border-box" }}>
        {/* Main content, 8 cols */}
        <div style={{ gridColumn: "span 8", display: "flex", flexDirection: "column", gap: 40, alignItems: "flex-start", minWidth: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
            <h1 className="kollab-hero-heading" style={{ fontWeight: 800, color: colors.navy, fontSize: 64, lineHeight: "72px", letterSpacing: -1.6, maxWidth: 768, margin: 0 }}>
              Connecting Brands with{" "}
              <span style={{ color: colors.blue }}>the Perfect KOLs</span>
            </h1>
            <p className="kollab-hero-subtext" style={{ color: colors.gray, fontSize: 18, lineHeight: "29px", maxWidth: 672, margin: 0 }}>
              The ultimate platform for fast, transparent, and efficient influencer collaboration for every campaign. Experience the future of partnership.
            </p>
          </div>

          <SearchCard mode={mode} onModeChange={setMode} />
          <ProductPreview />
          <HowItWorks />
        </div>

        {/* Sidebar, 4 cols */}
        <div style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", gap: 40, alignItems: "flex-start", minWidth: 0 }}>
          <SidebarPanel title="Featured KOLs" viewAllTo="/discover">
            {featuredCreators.length > 0 ? (
              featuredCreators.map((kol, i) => (
                <FeaturedKolRow key={kol.id} kol={kol} tint={ROW_TINTS[i % ROW_TINTS.length]} />
              ))
            ) : (
              <p style={{ color: colors.gray, fontSize: 13, margin: 0 }}>No creators have signed up yet.</p>
            )}
          </SidebarPanel>
          <SidebarPanel title="Active Brands" viewAllTo="/discover-brands">
            {activeBrands.length > 0 ? (
              activeBrands.map((brand, i) => (
                <BrandRow key={brand.id} brand={brand} tint={ROW_TINTS[i % ROW_TINTS.length]} />
              ))
            ) : (
              <p style={{ color: colors.gray, fontSize: 13, margin: 0 }}>No brands have signed up yet.</p>
            )}
          </SidebarPanel>
        </div>
      </div>

      <PainPoints />

      <Footer />
    </div>
  );
}