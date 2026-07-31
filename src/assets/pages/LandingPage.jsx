import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import MarketingNavBar from "../components/MarketingNavBar";
import AvatarImage from "../components/AvatarImage";
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

const STATS = [
  { value: "1000+", label: "Active KOLs", tint: "rgba(219,225,255,0.5)" },
  { value: "Diverse", label: "Industries Covered", tint: "rgba(37,99,235,0.12)" },
  { value: "Secure", label: "Payment Guarantee", tint: "rgba(218,226,253,0.5)" },
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

function SearchCard({ mode, onModeChange }) {
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

      <div className="kollab-search-row" style={{ display: "flex", gap: 12, width: "100%" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "rgba(115,118,134,0.6)" }}>🔍</span>
          <input
            type="text"
            placeholder="Search by name, category, platform..."
            style={{
              background: "rgba(255,255,255,0.8)",
              borderRadius: 16,
              boxShadow: "0px 0px 0px 1px rgba(195,198,215,0.3)",
              width: "100%",
              padding: "19px 24px 20px 48px",
              fontSize: 18,
              color: colors.gray,
              border: "none",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        <button
          type="button"
          className="kollab-search-button"
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
            cursor: "pointer",
          }}
        >
          Search
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 700, color: colors.gray, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase" }}>Trending:</span>
        {TRENDING_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
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

function HeroVisual() {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.5)",
        borderRadius: 48,
        boxShadow: "0px 25px 50px -12px rgba(0,0,0,0.25)",
        overflow: "hidden",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        className="kollab-hero-visual-inner"
        style={{
          height: 334,
          width: "100%",
          position: "relative",
          background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.4), transparent)" }} />
        <button
          type="button"
          aria-label="Play video"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              backdropFilter: "blur(6px)",
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 80,
              height: 80,
              fontSize: 28,
              color: "white",
            }}
          >
            ▶
          </span>
        </button>
      </div>
    </div>
  );
}

function StatsBar() {
  return (
    <div className="kollab-stats-bar" style={{ borderTop: "1px solid rgba(195,198,215,0.1)", display: "flex", gap: 40, justifyContent: "center", width: "100%", paddingTop: 49, paddingBottom: 48 }}>
      {STATS.map((stat) => (
        <div key={stat.label} style={{ display: "flex", gap: 20, alignItems: "center", width: 234 }}>
          <div style={{ backdropFilter: "blur(2px)", background: stat.tint, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 16, flexShrink: 0, width: 56, height: 56 }} />
          <div>
            <p style={{ fontWeight: 700, color: colors.navy, fontSize: 24, lineHeight: "32px", margin: 0 }}>{stat.value}</p>
            <p style={{ fontWeight: 500, color: colors.gray, fontSize: 12, lineHeight: "16px", margin: 0 }}>{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
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
          .kollab-hero-visual-inner {
            height: 200px !important;
          }
          .kollab-stats-bar {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 24px !important;
          }
          .kollab-stats-bar > div {
            width: 100% !important;
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
          <HeroVisual />
          <StatsBar />
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

      <Footer />
    </div>
  );
}