import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MarketingNavBar from "../components/MarketingNavBar";
import Footer from "../components/Footer";
import { useAuth } from "../context/useAuth";
import { supabase } from "../../supabaseClient";
import { NICHE_STYLES } from "../components/nicheStyles";
import { formatVND } from "../../utils/currency";

const colors = {
  navy: "#0b1c30",
  gray: "#434654",
  grayLight: "#737686",
  blue: "#2563eb",
  border: "rgba(195,197,215,0.4)",
};

const FILTER_CHIPS = ["Category", "Platform", "Budget", "Location", "Campaign Type"];

const STATS = [
  { value: "1,200+", label: "ACTIVE CREATORS" },
  { value: "150+", label: "ACTIVE CAMPAIGNS" },
  { value: "80+", label: "PARTNER BRANDS" },
];

function formatBudget(campaign) {
  const { budget_min: min, budget_max: max } = campaign;
  if (min != null && max != null) return `${formatVND(min)} – ${formatVND(max)}`;
  if (max != null) return `Up to ${formatVND(max)}`;
  if (min != null) return `From ${formatVND(min)}`;
  return "Budget TBD";
}

function formatDeadline(dateStr, { long = false } = {}) {
  if (!dateStr) return "No deadline";
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", long ? { month: "long", day: "numeric", year: "numeric" } : { month: "short", day: "numeric" });
}

function isUrgent(dateStr) {
  if (!dateStr) return false;
  const deadline = new Date(`${dateStr}T00:00:00`);
  const daysLeft = (deadline - new Date()) / (1000 * 60 * 60 * 24);
  return daysLeft <= 7;
}

// Real campaigns don't carry brand name/location/tags directly -- those
// come from the joined brand profile (fetched separately, see the effect
// below) or from real columns that just need reshaping (platforms -> tags,
// niche -> category/color). Keeping this as one mapping function means
// OpportunityCard and the Featured section below need zero changes to
// their own JSX/props.
function toOpportunityView(campaign, brandsById) {
  const brandProfile = brandsById[campaign.brand_id];
  const brandName = brandProfile?.company_name || brandProfile?.name || "Brand";
  const style = NICHE_STYLES[campaign.niche] ?? { bg: "#e5eeff", color: "#1550d3" };
  return {
    id: campaign.id,
    brand: brandName,
    location: brandProfile?.location ? brandProfile.location.toUpperCase() : "VIETNAM",
    title: campaign.name,
    description: campaign.brief || "No campaign brief provided yet.",
    tags: campaign.platforms ?? [],
    budget: formatBudget(campaign),
    deadline: formatDeadline(campaign.deadline),
    deadlineLong: formatDeadline(campaign.deadline, { long: true }),
    urgent: isUrgent(campaign.deadline),
    category: campaign.niche,
    gradient: `linear-gradient(135deg, ${style.bg}, ${style.color})`,
    logoBg: style.bg,
    logoColor: style.color,
    logoInitial: brandName.charAt(0).toUpperCase(),
  };
}

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
    <svg width="11" height="14" viewBox="0 0 11 14" fill="none">
      <path d="M5.5 13S1 8.4 1 5a4.5 4.5 0 0 1 9 0c0 3.4-4.5 8-4.5 8Z" stroke={color} strokeWidth="1.2" />
      <circle cx="5.5" cy="5" r="1.4" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}
function BookmarkIcon({ filled }) {
  return (
    <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
      <path d="M1 1h12v16l-6-4-6 4V1Z" stroke={colors.navy} strokeWidth="1.4" fill={filled ? colors.blue : "none"} style={{ transition: "fill 150ms ease-out" }} />
    </svg>
  );
}
function SortChevron() {
  return (
    <svg width="9" height="6" viewBox="0 0 9 6" fill="none">
      <path d="M1 1l3.5 3.5L8 1" stroke={colors.navy} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ArrowRight({ color }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6h8M6 2l4 4-4 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 2l14 14M16 2L2 16" stroke={colors.gray} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function OpportunityCard({ opp, saved, onToggleSave, applied, onApply, busy, isLoggedIn, role, onRequireLogin, onViewDetails }) {
  const isBrand = isLoggedIn && role === "brand";

  const handleApplyClick = () => {
    if (applied || isBrand || busy) return;
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }
    onApply(opp.id);
  };
  return (
    <div style={{ background: "white", border: `1px solid ${colors.border}`, borderRadius: 24, boxShadow: "0px 12px 32px -8px rgba(37,99,235,0.08)", overflow: "hidden", flex: "1 1 340px", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 224, background: opp.gradient, position: "relative" }}>
        <span style={{ position: "absolute", left: 16, top: 17, backdropFilter: "blur(6px)", background: "rgba(255,255,255,0.9)", border: "1px solid rgba(37,99,235,0.1)", borderRadius: 8, padding: "4px 13px", fontWeight: 700, color: colors.blue, fontSize: 12 }}>
          {opp.category}
        </span>
      </div>
      <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ background: opp.logoBg, border: `1px solid ${colors.border}`, borderRadius: 16, width: 44, height: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: colors.blue }}>
              {opp.logoInitial}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: colors.navy, fontSize: 15 }}>{opp.brand}</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                <LocationIcon color={colors.grayLight} />
                <span style={{ color: colors.grayLight, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{opp.location}</span>
              </div>
            </div>
          </div>
          <button type="button" onClick={() => onToggleSave(opp.id)} aria-label="Save opportunity" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <BookmarkIcon filled={saved} />
          </button>
        </div>

        <h4 style={{ fontWeight: 800, color: colors.navy, fontSize: 19, margin: 0 }}>{opp.title}</h4>
        <p style={{ color: colors.gray, fontSize: 14, lineHeight: "23px", margin: 0 }}>{opp.description}</p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {opp.tags.map((tag) => (
            <span key={tag} style={{ background: "#eff4ff", border: "1px solid rgba(195,197,215,0.1)", borderRadius: 8, padding: "5px 11px", fontWeight: 700, color: colors.gray, fontSize: 11 }}>{tag}</span>
          ))}
        </div>

        <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: "auto", paddingTop: 25, display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: colors.grayLight, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Budget Range</div>
            <div style={{ color: colors.navy, fontWeight: 800, fontSize: 16 }}>{opp.budget}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: colors.grayLight, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Deadline</div>
            <div style={{ color: opp.urgent ? "#ba1a1a" : colors.gray, fontWeight: 800, fontSize: 16 }}>{opp.deadline}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            onClick={handleApplyClick}
            disabled={applied || isBrand || busy}
            style={{
              background: applied ? "#dcfce7" : isBrand ? colors.border : colors.blue, border: "none", borderRadius: 16, padding: "16px 0", flex: 1,
              fontWeight: 700, color: applied ? "#16a34a" : isBrand ? colors.grayLight : "white", fontSize: 16, cursor: applied || isBrand || busy ? "default" : "pointer",
              opacity: busy ? 0.7 : 1,
              transition: "background-color 200ms ease-out, color 200ms ease-out",
            }}
          >
            {applied ? "Applied ✓" : isBrand ? "Creators Only" : busy ? "Applying…" : "Apply"}
          </button>
          <button
            type="button"
            onClick={() => onViewDetails(opp)}
            style={{ background: "white", border: `1px solid ${colors.border}`, borderRadius: 16, padding: "16px 24px", fontWeight: 700, color: colors.navy, fontSize: 16, cursor: "pointer" }}
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
}

// Shared by both click targets on this page (the grid's OpportunityCard and
// the Featured Opportunity section) -- same visual pattern as Discover
// Brands' Brand Profile modal (rounded-24 card, dim backdrop, top-right
// close button), reusing this page's own marketing palette. Apply here
// calls the exact same onApply/onRequireLogin passed down from
// CampaignsBrowse rather than a separate copy, so "Applied ✓" and the
// role-gating stay in sync with the rest of the page.
function CampaignDetailsModal({ opp, applied, onApply, busy, isBrand, isLoggedIn, onRequireLogin, onClose }) {
  const handleApplyClick = () => {
    if (applied || isBrand || busy) return;
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }
    onApply(opp.id);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: colors.navy, opacity: 0.45 }} />
      <div style={{ position: "relative", background: "white", borderRadius: 24, width: "100%", maxWidth: 560, padding: 40, display: "flex", flexDirection: "column", gap: 24, boxShadow: "0px 25px 50px -12px rgba(0,0,0,0.25)", maxHeight: "85vh", overflowY: "auto", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ background: opp.logoBg, border: `1px solid ${colors.border}`, borderRadius: 16, width: 48, height: 48, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: opp.logoColor, fontSize: 18 }}>
              {opp.logoInitial}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: colors.navy, fontSize: 15 }}>{opp.brand}</div>
              <span style={{ display: "inline-block", marginTop: 4, background: "#eff4ff", borderRadius: 8, padding: "3px 10px", fontWeight: 700, color: colors.blue, fontSize: 11 }}>{opp.category}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
            <CloseIcon />
          </button>
        </div>

        <h2 style={{ fontWeight: 800, color: colors.navy, fontSize: 24, lineHeight: "30px", margin: 0 }}>{opp.title}</h2>

        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: colors.grayLight, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Budget Range</div>
            <div style={{ color: colors.navy, fontWeight: 800, fontSize: 18 }}>{opp.budget}</div>
          </div>
          <div>
            <div style={{ color: colors.grayLight, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Deadline</div>
            <div style={{ color: opp.urgent ? "#ba1a1a" : colors.navy, fontWeight: 800, fontSize: 18 }}>{opp.deadlineLong}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {opp.tags.map((tag) => (
            <span key={tag} style={{ background: "#eff4ff", border: "1px solid rgba(195,197,215,0.1)", borderRadius: 8, padding: "5px 11px", fontWeight: 700, color: colors.gray, fontSize: 11 }}>{tag}</span>
          ))}
        </div>

        <div>
          <div style={{ color: colors.grayLight, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Campaign Brief</div>
          <p style={{ color: colors.gray, fontSize: 14, lineHeight: "24px", margin: 0, whiteSpace: "pre-wrap" }}>{opp.description}</p>
        </div>

        <button
          type="button"
          onClick={handleApplyClick}
          disabled={applied || isBrand || busy}
          style={{
            background: applied ? "#dcfce7" : isBrand ? colors.border : colors.blue, border: "none", borderRadius: 16, padding: "16px 0",
            fontWeight: 700, color: applied ? "#16a34a" : isBrand ? colors.grayLight : "white", fontSize: 16, cursor: applied || isBrand || busy ? "default" : "pointer",
            opacity: busy ? 0.7 : 1,
            transition: "background-color 200ms ease-out, color 200ms ease-out",
          }}
        >
          {applied ? "Applied ✓" : isBrand ? "Creators Only" : busy ? "Applying…" : "Apply"}
        </button>
      </div>
    </div>
  );
}

export default function CampaignsBrowse() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(new Set());
  const [searchText, setSearchText] = useState("");

  // This was missing entirely -- MarketingNavBar defaults isLoggedIn to
  // false when not passed a prop, so this page always showed the logged-out
  // header regardless of actual session state. Real bug, not a stale file.
  const { user, isLoggedIn, role } = useAuth();

  const [campaigns, setCampaigns] = useState([]);
  const [brands, setBrands] = useState({});
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [featuredAppsCount, setFeaturedAppsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState(null);
  const [applyError, setApplyError] = useState("");
  const [viewingOpp, setViewingOpp] = useState(null);

  // This table's select RLS is public, so this loads for logged-out guests
  // too. Brand names/locations come from a separate profiles query (client-
  // side join) rather than relying on Supabase relationship-embedding being
  // configured. Re-runs on login/role change since the "already applied"
  // check only makes sense -- and is only fetched -- for logged-in creators.
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data: campaignRows } = await supabase
        .from("campaigns")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      const rows = campaignRows ?? [];

      const brandIds = [...new Set(rows.map((c) => c.brand_id))];
      const brandsById = {};
      if (brandIds.length > 0) {
        const { data: profileRows } = await supabase.from("profiles").select("id, name, company_name, location").in("id", brandIds);
        (profileRows ?? []).forEach((p) => {
          brandsById[p.id] = p;
        });
      }

      let appliedSet = new Set();
      if (user && role === "creator" && rows.length > 0) {
        const { data: appRows } = await supabase
          .from("applications")
          .select("campaign_id")
          .eq("creator_id", user.id)
          .in("campaign_id", rows.map((c) => c.id));
        appliedSet = new Set((appRows ?? []).map((a) => a.campaign_id));
      }

      let featuredCount = 0;
      if (rows.length > 0) {
        const { count } = await supabase.from("applications").select("*", { count: "exact", head: true }).eq("campaign_id", rows[0].id);
        featuredCount = count ?? 0;
      }

      if (!active) return;
      setCampaigns(rows);
      setBrands(brandsById);
      setAppliedIds(appliedSet);
      setFeaturedAppsCount(featuredCount);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user, role]);

  const handleRequireLogin = () => navigate("/login");

  // Applying is a creator-only action -- brands manage campaigns, they
  // don't apply to them (established rule). Guests get sent to log in
  // rather than being able to fake-apply anonymously.
  const isBrand = isLoggedIn && role === "brand";

  const handleApply = async (campaignId) => {
    if (!user) return;
    setApplyingId(campaignId);
    setApplyError("");
    const { error } = await supabase.from("applications").insert({ campaign_id: campaignId, creator_id: user.id, status: "pending" });
    setApplyingId(null);
    if (error) {
      setApplyError("Couldn't submit your application. Please try again.");
      return;
    }
    setAppliedIds((prev) => new Set(prev).add(campaignId));
  };

  const toggleSave = (id) => {
    setSaved((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const featuredCampaign = campaigns[0] ?? null;
  const featuredView = featuredCampaign ? toOpportunityView(featuredCampaign, brands) : null;
  const restViews = campaigns.slice(1).map((c) => toOpportunityView(c, brands));

  return (
    <div
      className="kollab-campaigns-browse"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: "white", textAlign: "left", position: "relative" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { margin: 0; background: white; }
        #root { max-width: none; margin: 0; padding: 0; width: 100%; }
        .kollab-campaigns-browse, .kollab-campaigns-browse *, .kollab-campaigns-browse *::before, .kollab-campaigns-browse *::after {
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .kollab-campaigns-hero {
            padding: 96px 16px 0 16px !important;
          }
          .kollab-campaigns-heading {
            font-size: 32px !important;
            letter-spacing: -0.8px !important;
          }
          .kollab-campaigns-search-input {
            padding-right: 16px !important;
          }
          .kollab-campaigns-search-btn {
            display: none !important;
          }
          .kollab-campaigns-featured-split {
            flex-direction: column !important;
          }
          .kollab-campaigns-featured-content {
            padding: 24px !important;
          }
          .kollab-campaigns-featured-meta {
            gap: 24px !important;
            flex-wrap: wrap !important;
          }
          .kollab-campaigns-featured-actions {
            flex-direction: column !important;
          }
          .kollab-campaigns-featured-actions button {
            width: 100% !important;
          }
          .kollab-campaigns-new-opps-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .kollab-campaigns-cta {
            padding: 40px 24px !important;
          }
          .kollab-campaigns-cta h2 {
            font-size: 32px !important;
          }
          .kollab-campaigns-stats {
            flex-direction: column !important;
            gap: 32px !important;
          }
        }
      `}</style>

      <MarketingNavBar activeTab="campaigns" />

      <div className="kollab-campaigns-hero" style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", padding: "128px 24px 0 24px" }}>
        <h1 className="kollab-campaigns-heading" style={{ fontWeight: 800, color: colors.navy, fontSize: 56, letterSpacing: -1.5, textAlign: "center", margin: 0 }}>Discover Campaigns</h1>
        <p style={{ color: colors.gray, fontSize: 18, textAlign: "center", maxWidth: 672, margin: 0 }}>Browse collaboration opportunities from leading brands across Vietnam.</p>

        <div style={{ position: "relative", maxWidth: 768, width: "100%", marginTop: 20 }}>
          <div style={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)" }}>
            <SearchIcon color={colors.grayLight} />
          </div>
          <input
            type="text"
            className="kollab-campaigns-search-input"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search brands, industries, or keywords..."
            style={{ width: "100%", height: 64, background: "white", colorScheme: "light", border: `1px solid ${colors.border}`, borderRadius: 16, boxShadow: "0px 12px 32px -8px rgba(37,99,235,0.08)", padding: "0 130px 0 65px", fontSize: 16, color: colors.navy, outline: "none", boxSizing: "border-box" }}
          />
          <button type="button" className="kollab-campaigns-search-btn" style={{ position: "absolute", right: 8, top: 8, bottom: 8, background: colors.blue, border: "none", borderRadius: 16, padding: "0 32px", fontWeight: 700, color: "white", fontSize: 16, cursor: "pointer" }}>
            Search
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "center", maxWidth: 1024, marginTop: 20 }}>
          <button type="button" style={{ background: colors.blue, border: "none", borderRadius: 9999, padding: "10px 20px", fontWeight: 600, color: "white", fontSize: 14, cursor: "pointer", boxShadow: "0px 4px 6px -1px rgba(37,99,235,0.2)" }}>
            All Filters
          </button>
          {FILTER_CHIPS.map((chip) => (
            <button key={chip} type="button" style={{ background: "white", border: `1px solid ${colors.border}`, borderRadius: 9999, padding: "11px 21px", fontWeight: 500, color: colors.gray, fontSize: 14, cursor: "pointer" }}>
              {chip}
            </button>
          ))}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: 16 }}>
            <span style={{ color: colors.gray, fontSize: 14 }}>Sort By:</span>
            <span style={{ color: colors.navy, fontWeight: 700, fontSize: 14 }}>Newest First</span>
            <SortChevron />
          </div>
        </div>
      </div>

      {featuredView && (
        <div style={{ maxWidth: 1280, margin: "48px auto 0 auto", padding: "0 24px" }}>
          <div className="kollab-campaigns-featured-split" style={{ background: "white", border: `1px solid ${colors.border}`, borderRadius: 24, boxShadow: "0px 12px 32px -8px rgba(37,99,235,0.08)", overflow: "hidden", display: "flex" }}>
            <div className="kollab-campaigns-featured-content" style={{ flex: 1, padding: 56, display: "flex", flexDirection: "column", gap: 24 }}>
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center", background: "#dbeafe", borderRadius: 8, padding: "6px 14px", fontWeight: 700, color: colors.blue, fontSize: 12, letterSpacing: 1.2, width: "fit-content" }}>
                FEATURED OPPORTUNITY
              </span>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ background: featuredView.logoBg, border: "1px solid rgba(195,197,215,0.4)", borderRadius: 16, width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: featuredView.logoColor, fontSize: 20 }}>{featuredView.logoInitial}</div>
                <span style={{ fontWeight: 700, color: colors.navy, fontSize: 17 }}>{featuredView.brand}</span>
              </div>
              <h2 style={{ fontWeight: 800, color: colors.navy, fontSize: 30, lineHeight: "36px", margin: 0 }}>{featuredView.title}</h2>
              <p style={{ color: colors.gray, fontSize: 16, lineHeight: "26px", margin: 0 }}>{featuredView.description}</p>
              <div className="kollab-campaigns-featured-meta" style={{ display: "flex", gap: 48 }}>
                <div>
                  <div style={{ color: colors.grayLight, fontSize: 11, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase" }}>Estimated Budget</div>
                  <div style={{ color: colors.blue, fontWeight: 800, fontSize: 24 }}>{featuredView.budget}</div>
                </div>
                <div>
                  <div style={{ color: colors.grayLight, fontSize: 11, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase" }}>Application Deadline</div>
                  <div style={{ color: colors.navy, fontWeight: 800, fontSize: 24 }}>{formatDeadline(featuredCampaign.deadline, { long: true })}</div>
                </div>
              </div>
              <div className="kollab-campaigns-featured-actions" style={{ display: "flex", gap: 16 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (appliedIds.has(featuredView.id) || isBrand || applyingId === featuredView.id) return;
                    if (!isLoggedIn) {
                      handleRequireLogin();
                      return;
                    }
                    handleApply(featuredView.id);
                  }}
                  disabled={appliedIds.has(featuredView.id) || isBrand || applyingId === featuredView.id}
                  style={{
                    background: appliedIds.has(featuredView.id) ? "#dcfce7" : isBrand ? colors.border : colors.blue, border: "none", borderRadius: 16, padding: "17px 40px",
                    fontWeight: 700, color: appliedIds.has(featuredView.id) ? "#16a34a" : isBrand ? colors.grayLight : "white", fontSize: 16, cursor: appliedIds.has(featuredView.id) || isBrand ? "default" : "pointer",
                    opacity: applyingId === featuredView.id ? 0.7 : 1,
                    transition: "background-color 200ms ease-out, color 200ms ease-out",
                  }}
                >
                  {appliedIds.has(featuredView.id) ? "Applied ✓" : isBrand ? "Creators Only" : applyingId === featuredView.id ? "Applying…" : "Apply Now"}
                </button>
                <button type="button" onClick={() => setViewingOpp(featuredView)} style={{ background: "white", border: `1px solid ${colors.border}`, borderRadius: 16, padding: "17px 41px", fontWeight: 700, color: colors.navy, fontSize: 16, cursor: "pointer" }}>View Details</button>
              </div>
            </div>
            <div style={{ flex: 1, position: "relative", background: featuredView.gradient, minHeight: 320 }}>
              <div style={{ position: "absolute", right: 32, bottom: 32, backdropFilter: "blur(6px)", background: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 16, padding: "11px 21px", display: "flex", gap: 12, alignItems: "center", boxShadow: "0px 20px 25px -5px rgba(0,0,0,0.1)" }}>
                <div style={{ background: "#712ae2", width: 10, height: 10, borderRadius: 9999 }} />
                <span style={{ fontWeight: 700, color: colors.navy, fontSize: 14 }}>{featuredAppsCount} Application{featuredAppsCount === 1 ? "" : "s"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="kollab-campaigns-new-opps-header" style={{ maxWidth: 1280, margin: "56px auto 0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h3 style={{ fontWeight: 800, color: colors.navy, fontSize: 30, letterSpacing: -0.75, margin: 0 }}>New Opportunities</h3>
          <p style={{ color: colors.gray, fontSize: 16, margin: "4px 0 0 0" }}>Freshly posted campaigns tailored for your niche.</p>
        </div>
        <button type="button" style={{ background: "none", border: "none", display: "flex", gap: 8, alignItems: "center", color: colors.blue, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
          View All <ArrowRight color={colors.blue} />
        </button>
      </div>

      {applyError && (
        <div style={{ maxWidth: 1280, margin: "24px auto 0 auto", padding: "0 24px" }}>
          <div style={{ color: "#ba1a1a", fontSize: 14, fontWeight: 600, textAlign: "center" }}>{applyError}</div>
        </div>
      )}

      <div style={{ maxWidth: 1280, margin: "40px auto 0 auto", padding: "0 24px 56px 24px", display: "flex", flexWrap: "wrap", gap: 32, justifyContent: "center" }}>
        {(() => {
          if (loading) {
            return <div style={{ width: "100%", textAlign: "center", color: colors.grayLight, fontSize: 14, padding: 40 }}>Loading campaigns…</div>;
          }
          if (campaigns.length === 0) {
            return <div style={{ width: "100%", textAlign: "center", color: colors.grayLight, fontSize: 14, padding: 40 }}>No active campaigns right now — check back soon.</div>;
          }

          const query = searchText.trim().toLowerCase();
          const filteredOpportunities = query
            ? restViews.filter(
                (opp) =>
                  opp.brand.toLowerCase().includes(query) ||
                  opp.title.toLowerCase().includes(query) ||
                  opp.category.toLowerCase().includes(query)
              )
            : restViews;

          return filteredOpportunities.length > 0 ? (
            filteredOpportunities.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opp={opp}
                saved={saved.has(opp.id)}
                onToggleSave={toggleSave}
                applied={appliedIds.has(opp.id)}
                onApply={handleApply}
                busy={applyingId === opp.id}
                isLoggedIn={isLoggedIn}
                role={role}
                onRequireLogin={handleRequireLogin}
                onViewDetails={setViewingOpp}
              />
            ))
          ) : (
            <div style={{ width: "100%", textAlign: "center", color: colors.grayLight, fontSize: 14, padding: 40 }}>
              {query ? `No campaigns match "${searchText}".` : "No additional opportunities right now — check back soon."}
            </div>
          );
        })()}
      </div>

      {!(isLoggedIn && role === "creator") && (
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div className="kollab-campaigns-cta" style={{ background: "#1e3a8a", borderRadius: 40, padding: 80, display: "flex", flexDirection: "column", gap: 24, alignItems: "center" }}>
            <h2 style={{ fontWeight: 800, color: "white", fontSize: 48, textAlign: "center", margin: 0 }}>Find brand collaborations faster.</h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 18, textAlign: "center", maxWidth: 672, margin: 0 }}>
              Join thousands of creators in Vietnam who are already scaling their career with Kollab's direct-to-brand marketplace.
            </p>
            <Link to="/signup" style={{ background: colors.blue, border: "none", borderRadius: 16, padding: "20px 48px", fontWeight: 700, color: "white", fontSize: 16, cursor: "pointer", boxShadow: "0px 25px 50px -12px rgba(0,0,0,0.2)", textDecoration: "none", display: "inline-block" }}>
              Create Free Creator Account
            </Link>
          </div>
        </div>
      )}

      <div className="kollab-campaigns-stats" style={{ maxWidth: 1280, margin: "0 auto", padding: "65px 24px", display: "flex", gap: 64, justifyContent: "center", borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}` }}>
        {STATS.map((stat) => (
          <div key={stat.label} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ color: colors.blue, fontWeight: 800, fontSize: 48 }}>{stat.value}</div>
            <div style={{ color: colors.gray, fontWeight: 700, fontSize: 14, letterSpacing: 2.8, textTransform: "uppercase", marginTop: 12 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <Footer />

      {viewingOpp && (
        <CampaignDetailsModal
          opp={viewingOpp}
          applied={appliedIds.has(viewingOpp.id)}
          busy={applyingId === viewingOpp.id}
          isBrand={isBrand}
          isLoggedIn={isLoggedIn}
          onApply={handleApply}
          onRequireLogin={handleRequireLogin}
          onClose={() => setViewingOpp(null)}
        />
      )}
    </div>
  );
}