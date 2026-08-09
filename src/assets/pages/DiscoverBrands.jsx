import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppSidebar from "../components/AppSidebar";
import AppTopBar, { Breadcrumb } from "../components/AppTopBar";
import { appColors } from "../components/appColors";
import PremiumAIPanel from "../components/PremiumAIPanel";
import AvatarImage from "../components/AvatarImage";
import { useAuth } from "../context/useAuth";
import { supabase } from "../../supabaseClient";
import { formatRelativeTime } from "../../utils/relativeTime";

// Rotates a few muted background tints across cards purely for visual
// variety -- not tied to any real brand data.
const LOGO_BACKGROUNDS = ["#fff7ed", "#e5eeff", "#fef3c7", "#dbeafe"];

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
function SaveIcon({ filled }) {
  return (
    <svg width="18" height="16" viewBox="0 0 18 16" fill="none">
      <path
        d="M9 15S1 10.2 1 5.4A3.9 3.9 0 0 1 9 3.2a3.9 3.9 0 0 1 8 2.2C17 10.2 9 15 9 15Z"
        stroke={appColors.gray}
        strokeWidth="1.5"
        fill={filled ? "#ba1a1a" : "none"}
        style={{ transition: "fill 150ms ease-out" }}
      />
    </svg>
  );
}
function ChevronRight({ color }) {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
      <path d="M1 1l5 5-5 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SortChevron() {
  return (
    <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
      <path d="M1 1l5 5 5-5" stroke={appColors.primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 2l14 14M16 2L2 16" stroke={appColors.gray} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function AvatarSquare({ initial, size = 48, radius = 12, avatarUrl }) {
  return (
    <AvatarImage
      url={avatarUrl}
      size={size}
      radius={radius}
      fallback={
        <div
          style={{
            background: "#e2e8f0", width: size, height: size, borderRadius: radius, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: appColors.grayLight,
          }}
        >
          {initial}
        </div>
      }
    />
  );
}

function BrandCard({ brand, saved, onToggleSave, onViewProfile }) {
  return (
    <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 24, overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ background: brand.logoBg, border: `1px solid ${appColors.border}`, borderRadius: 16, width: 56, height: 56, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: appColors.primary, fontSize: 20, overflow: "hidden" }}>
              <AvatarImage url={brand.avatarUrl} size="100%" radius={16} fallback={brand.name?.charAt(0).toUpperCase()} />
            </div>
            <div>
              <div style={{ color: appColors.navy, fontSize: 16, fontWeight: 700 }}>{brand.name}</div>
              <div style={{ color: appColors.gray, fontSize: 14 }}>{brand.industry || "Industry not set"}</div>
            </div>
          </div>
          <button type="button" onClick={() => onToggleSave(brand.id)} aria-label="Save brand" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <SaveIcon filled={saved} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ background: appColors.primaryLighter, borderRadius: 16, padding: 16, flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: appColors.gray, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" }}>ACTIVE CAMPAIGNS</div>
            <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 24, letterSpacing: -0.24, marginTop: 4 }}>{brand.activeCampaigns}</div>
          </div>
          <div style={{ background: appColors.primaryLighter, borderRadius: 16, padding: 16, flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: appColors.gray, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" }}>CREATORS WORKED WITH</div>
            <div style={{ fontWeight: 600, color: appColors.grayLight, fontSize: 13, marginTop: 6 }}>Not yet available</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <LocationIcon color={appColors.gray} />
            <span style={{ color: appColors.gray, fontSize: 12, fontWeight: 600, letterSpacing: 0.24 }}>{brand.location || "Location not set"}</span>
          </div>
          <span style={{ color: appColors.gray, fontSize: 12, fontWeight: 600, letterSpacing: 0.24 }}>Avg. Budget: Not yet available</span>
        </div>

        <button type="button" onClick={() => onViewProfile(brand)} style={{ background: appColors.primary, border: "none", borderRadius: 12, padding: "16px 0", fontWeight: 700, color: "white", fontSize: 16, cursor: "pointer", marginTop: "auto" }}>
          View Brand Profile
        </button>
      </div>
    </div>
  );
}

export default function DiscoverBrands() {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState(new Set());
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [activeIndustries, setActiveIndustries] = useState(new Set());
  const [sortBy, setSortBy] = useState("relevance"); // "relevance" | "campaigns"
  const [profileBrand, setProfileBrand] = useState(null);

  const { isLoggedIn, role, user } = useAuth();

  // Active campaign counts are real -- fetched separately and tallied
  // client-side per brand_id, same pattern used for applications counts in
  // ManageCampaigns.jsx. Creators-worked-with and avg budget have no real
  // data source yet (no completed-collaboration tracking), so they stay
  // placeholders.
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data: brandRows } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "brand")
        .order("created_at", { ascending: false });

      const rows = brandRows ?? [];
      const ids = rows.map((b) => b.id);
      const counts = {};
      if (ids.length > 0) {
        const { data: campaignRows } = await supabase
          .from("campaigns")
          .select("brand_id")
          .eq("status", "active")
          .in("brand_id", ids);
        (campaignRows ?? []).forEach((c) => {
          counts[c.brand_id] = (counts[c.brand_id] || 0) + 1;
        });
      }

      if (!active) return;
      setBrands(
        rows.map((b, i) => ({
          id: b.id,
          name: b.company_name || b.name,
          industry: b.industry,
          location: b.location,
          avatarUrl: b.avatar_url,
          activeCampaignsNum: counts[b.id] || 0,
          activeCampaigns: String(counts[b.id] || 0),
          logoBg: LOGO_BACKGROUNDS[i % LOGO_BACKGROUNDS.length],
        }))
      );
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Saved state -- seeded from real saved_profiles rows so the heart icon
  // reflects reality on load instead of resetting to unfilled every visit.
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

  // Recently viewed brands -- sourced from profile_views rows this user
  // created by opening a brand's profile modal, joined to profiles
  // client-side, filtered to brand profiles since that's what this page's
  // sidebar is about.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) {
        setRecentlyViewed([]);
        return;
      }
      const { data: viewRows } = await supabase
        .from("profile_views")
        .select("viewed_profile_id, viewed_at")
        .eq("viewer_id", user.id)
        .order("viewed_at", { ascending: false })
        .limit(20);
      const rows = viewRows ?? [];
      const ids = rows.map((r) => r.viewed_profile_id);
      if (ids.length === 0) {
        if (active) setRecentlyViewed([]);
        return;
      }
      const { data: profileRows } = await supabase.from("profiles").select("id, name, company_name, avatar_url").in("id", ids).eq("role", "brand");
      const profilesById = {};
      (profileRows ?? []).forEach((p) => {
        profilesById[p.id] = p;
      });
      const merged = rows
        .filter((r) => profilesById[r.viewed_profile_id])
        .slice(0, 5)
        .map((r) => ({
          id: r.viewed_profile_id,
          name: profilesById[r.viewed_profile_id].company_name || profilesById[r.viewed_profile_id].name,
          avatarUrl: profilesById[r.viewed_profile_id].avatar_url,
          time: formatRelativeTime(r.viewed_at),
        }));
      if (active) setRecentlyViewed(merged);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const ALL_INDUSTRIES = [...new Set(brands.map((b) => b.industry).filter(Boolean))];
  const SORT_OPTIONS = ["relevance", "campaigns"];
  const SORT_LABELS = { relevance: "Relevance", campaigns: "Most Active Campaigns" };

  const toggleIndustry = (ind) => {
    setActiveIndustries((prev) => {
      const next = new Set(prev);
      next.has(ind) ? next.delete(ind) : next.add(ind);
      return next;
    });
  };
  const cycleSort = () => {
    const i = SORT_OPTIONS.indexOf(sortBy);
    setSortBy(SORT_OPTIONS[(i + 1) % SORT_OPTIONS.length]);
  };

  const visibleBrands = brands
    .filter((b) => activeIndustries.size === 0 || activeIndustries.has(b.industry))
    .sort((a, b) => {
      if (sortBy === "campaigns") return b.activeCampaignsNum - a.activeCampaignsNum;
      return 0;
    });

  // Saving requires an account -- gate the action (not the button's
  // visibility, since guests should still be able to see what saving does).
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
      if (!error) {
        setSavedIds((prev) => new Set(prev).add(id));
      }
    }
  };

  // Opening a brand's profile modal counts as a "view" -- upsert-on-conflict
  // so re-viewing just bumps viewed_at instead of creating duplicates.
  // Skipped silently for guests (no viewer_id to attach it to). The sidebar
  // is updated optimistically since, unlike CreatorProfile.jsx, the view
  // happens in a modal on this same mounted page rather than a navigation
  // that would naturally trigger a refetch on return.
  const handleViewProfile = (brand) => {
    setProfileBrand(brand);
    if (user) {
      // supabase-js query builders are lazy thenables -- the request is
      // only actually sent once awaited/then-ed, so this can't be dropped
      // as a bare fire-and-forget call without silently doing nothing.
      supabase.from("profile_views").upsert(
        { viewer_id: user.id, viewed_profile_id: brand.id },
        { onConflict: "viewer_id,viewed_profile_id" }
      ).then();
      setRecentlyViewed((prev) => {
        const withoutThis = prev.filter((item) => item.id !== brand.id);
        return [{ id: brand.id, name: brand.name, avatarUrl: brand.avatarUrl, time: "Just now" }, ...withoutThis].slice(0, 5);
      });
    }
  };

  const handleRecentClick = (profileId) => {
    const brand = brands.find((b) => b.id === profileId);
    if (brand) handleViewProfile(brand);
  };

  const savedBrands = brands.filter((b) => savedIds.has(b.id));

  return (
    <div
      className="kollab-discover-brands"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: appColors.bg, minHeight: "100vh", textAlign: "left" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { margin: 0; background: white; }
        #root { max-width: none; margin: 0; padding: 0; width: 100%; }
        .kollab-discover-brands, .kollab-discover-brands *, .kollab-discover-brands *::before, .kollab-discover-brands *::after {
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .kollab-discover-brands-main {
            margin-left: 0 !important;
            flex-direction: column !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
            padding-top: 80px !important;
          }
          .kollab-discover-brands-grid {
            grid-template-columns: 1fr !important;
          }
          .kollab-discover-brands-aside {
            width: 100% !important;
          }
        }
      `}</style>

      {/* NOTE: reusing the brand-side AppSidebar shell for visual consistency
          since a creator-specific sidebar doesn't exist yet (that's the
          bigger "role split" task still pending). No matching nav item
          highlights here on purpose -- this page doesn't belong to the
          current brand-oriented nav. */}
      <AppSidebar activeItem={role === "creator" ? "discover-brands" : null} />
      <AppTopBar left={<Breadcrumb text="Workspace /" current="Discover Brands" />} />

      <main className="kollab-discover-brands-main" style={{ marginLeft: 256, paddingTop: 96, paddingBottom: 64, paddingLeft: 32, paddingRight: 32, display: "flex", gap: 32 }}>
        <div style={{ flex: "1 1 640px", maxWidth: 640, minWidth: 0, display: "flex", flexDirection: "column", gap: 48 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h1 style={{ fontWeight: 600, color: appColors.navy, fontSize: 36, lineHeight: "44px", letterSpacing: -0.72, margin: 0 }}>Discover Brands</h1>
              <p style={{ color: appColors.gray, fontSize: 18, lineHeight: "28px", opacity: 0.8, margin: "8px 0 0 0" }}>
                {isLoggedIn
                  ? "See who else is building with Kollab, and explore partnership trends across industries."
                  : "Browse brands actively looking for creators like you."}
              </p>
            </div>

            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)" }}>
                <SearchIcon color={appColors.grayLight} />
              </div>
              <input
                type="text"
                placeholder="Search brands by name, industry, or keywords..."
                style={{
                  background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, boxShadow: "0px 1px 2px 0px rgba(0,0,0,0.05)",
                  width: "100%", height: 64, padding: "0 25px 0 65px", fontSize: 16, color: appColors.navy, outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {ALL_INDUSTRIES.map((ind) => {
                  const active = activeIndustries.has(ind);
                  return (
                    <button
                      key={ind}
                      type="button"
                      onClick={() => toggleIndustry(ind)}
                      style={{
                        background: active ? appColors.primary : "white",
                        border: `1px solid ${active ? appColors.primary : appColors.border}`,
                        borderRadius: 9999, padding: "9px 17px", fontWeight: 500, fontSize: 14, cursor: "pointer",
                        color: active ? "white" : appColors.navy,
                        transition: "background-color 200ms ease-out, border-color 200ms ease-out, color 200ms ease-out",
                      }}
                    >
                      {ind}
                    </button>
                  );
                })}
                {activeIndustries.size > 0 && (
                  <button type="button" onClick={() => setActiveIndustries(new Set())} style={{ background: "none", border: "none", color: appColors.grayLight, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Clear
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.9 }}>
                <span style={{ color: appColors.gray, fontSize: 14, fontWeight: 500 }}>Sort by:</span>
                <button type="button" onClick={cycleSort} style={{ background: "none", border: "none", display: "flex", gap: 8, alignItems: "center", cursor: "pointer", padding: 0 }}>
                  <span style={{ color: appColors.primary, fontWeight: 700, fontSize: 16 }}>{SORT_LABELS[sortBy]}</span>
                  <SortChevron />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: 48, textAlign: "center", color: appColors.grayLight, fontSize: 14 }}>
              Loading brands…
            </div>
          ) : visibleBrands.length > 0 ? (
            <div className="kollab-discover-brands-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
              {visibleBrands.map((brand) => (
                <BrandCard key={brand.id} brand={brand} saved={savedIds.has(brand.id)} onToggleSave={toggleSave} onViewProfile={handleViewProfile} />
              ))}
            </div>
          ) : (
            <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: 48, textAlign: "center", color: appColors.grayLight, fontSize: 14 }}>
              {brands.length === 0 ? "No brands have signed up yet." : "No brands match these filters."}
            </div>
          )}
        </div>

        <aside className="kollab-discover-brands-aside" style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: 32 }}>
          <PremiumAIPanel subject="brands" />

          {isLoggedIn ? (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontWeight: 700, color: appColors.gray, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", padding: "0 8px" }}>Recently Viewed</div>
                {recentlyViewed.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {recentlyViewed.map((item) => (
                      <div key={item.id} onClick={() => handleRecentClick(item.id)} style={{ display: "flex", gap: 12, alignItems: "center", padding: 12, borderRadius: 16, cursor: "pointer" }}>
                        <AvatarSquare initial={item.name?.charAt(0).toUpperCase()} size={48} radius={12} avatarUrl={item.avatarUrl} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 14 }}>{item.name}</div>
                          <div style={{ color: appColors.gray, fontSize: 11 }}>{item.time}</div>
                        </div>
                        <ChevronRight color={appColors.grayLight} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: appColors.grayLight, fontSize: 13, padding: "0 8px" }}>No profiles viewed yet.</div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontWeight: 700, color: appColors.gray, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", padding: "0 8px" }}>Saved ({savedBrands.length})</div>
                {savedBrands.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {savedBrands.slice(0, 5).map((b) => (
                      <div key={b.id} onClick={() => handleViewProfile(b)} style={{ display: "flex", gap: 12, alignItems: "center", padding: 12, borderRadius: 16, cursor: "pointer" }}>
                        <AvatarSquare initial={b.name?.charAt(0).toUpperCase()} size={48} radius={12} avatarUrl={b.avatarUrl} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 14 }}>{b.name}</div>
                        </div>
                        <ChevronRight color={appColors.grayLight} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: appColors.grayLight, fontSize: 13, padding: "0 8px" }}>No saved brands yet.</div>
                )}
              </div>
            </>
          ) : (
            <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: 24, textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ color: appColors.gray, fontSize: 14, margin: 0 }}>Create a free account to save brands and track your browsing history.</p>
              <Link to="/signup" style={{ background: appColors.primary, borderRadius: 12, padding: "12px 0", fontWeight: 700, color: "white", fontSize: 14, textDecoration: "none" }}>
                Sign Up Free
              </Link>
            </div>
          )}
        </aside>
      </main>

      {profileBrand && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={() => setProfileBrand(null)} style={{ position: "absolute", inset: 0, background: appColors.navy, opacity: 0.45 }} />
          <div style={{ position: "relative", background: "white", borderRadius: 24, width: "100%", maxWidth: 440, padding: 32, display: "flex", flexDirection: "column", gap: 20, boxShadow: "0px 25px 50px -12px rgba(0,0,0,0.25)", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ background: profileBrand.logoBg, border: `1px solid ${appColors.border}`, borderRadius: 16, width: 56, height: 56, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: appColors.primary, fontSize: 20, overflow: "hidden" }}>
                  <AvatarImage url={profileBrand.avatarUrl} size="100%" radius={16} fallback={profileBrand.name?.charAt(0).toUpperCase()} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 18 }}>{profileBrand.name}</div>
                  <div style={{ color: appColors.grayLight, fontSize: 13 }}>{profileBrand.industry || "Industry not set"} · {profileBrand.location || "Location not set"}</div>
                </div>
              </div>
              <button type="button" onClick={() => setProfileBrand(null)} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <CloseIcon />
              </button>
            </div>

            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ background: appColors.primaryLighter, borderRadius: 16, padding: 16, flex: 1 }}>
                <div style={{ fontWeight: 700, color: appColors.gray, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" }}>ACTIVE CAMPAIGNS</div>
                <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 24 }}>{profileBrand.activeCampaigns}</div>
              </div>
              <div style={{ background: appColors.primaryLighter, borderRadius: 16, padding: 16, flex: 1 }}>
                <div style={{ fontWeight: 700, color: appColors.gray, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" }}>CREATORS WORKED WITH</div>
                <div style={{ fontWeight: 600, color: appColors.grayLight, fontSize: 13, marginTop: 6 }}>Not yet available</div>
              </div>
            </div>

            <div>
              <div style={{ color: appColors.grayLight, fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Average Budget</div>
              <div style={{ color: appColors.grayLight, fontSize: 14, fontWeight: 600, marginTop: 4 }}>Not yet available</div>
            </div>

            <button type="button" onClick={() => setProfileBrand(null)} style={{ background: appColors.primary, border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 700, color: "white", fontSize: 14, cursor: "pointer" }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
