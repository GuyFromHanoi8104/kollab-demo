import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppSidebar from "../components/AppSidebar";
import AppTopBar, { Breadcrumb } from "../components/AppTopBar";
import { appColors } from "../components/appColors";
import { useAuth } from "../context/useAuth";
import { supabase } from "../../supabaseClient";

function LocationIcon({ color }) {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
      <path d="M6 13S1 8.4 1 5a5 5 0 0 1 10 0c0 3.4-5 8-5 8Z" stroke={color} strokeWidth="1.3" />
      <circle cx="6" cy="5" r="1.6" stroke={color} strokeWidth="1.3" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg width="18" height="16" viewBox="0 0 18 16" fill="none">
      <path d="M9 15S1 10.2 1 5.4A3.9 3.9 0 0 1 9 3.2a3.9 3.9 0 0 1 8 2.2C17 10.2 9 15 9 15Z" fill="#ba1a1a" />
    </svg>
  );
}

// Followers/engagement have no real data source yet (needs a TikTok/Instagram
// API integration -- separate future task), same as Discover Creators. Show
// an honest placeholder rather than inventing numbers for real people.
function StatPlaceholder({ label }) {
  return (
    <div style={{ background: appColors.primaryLighter, borderRadius: 16, padding: 16, flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 700, color: appColors.gray, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontWeight: 600, color: appColors.grayLight, fontSize: 13, marginTop: 6 }}>Not yet available</div>
    </div>
  );
}

function SavedCreatorCard({ creator, onUnsave }) {
  const niches = creator.niche || [];
  return (
    <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 24, overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ height: 200, background: "linear-gradient(135deg, #cbd5e1, #94a3b8)", position: "relative" }}>
        <button
          type="button"
          onClick={() => onUnsave(creator.id)}
          aria-label="Remove from saved"
          style={{ position: "absolute", right: 16, top: 16, backdropFilter: "blur(4px)", background: "rgba(255,255,255,0.9)", border: "none", borderRadius: 9999, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <HeartIcon />
        </button>
      </div>
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
        <div>
          <div style={{ color: appColors.navy, fontSize: 16, fontWeight: 700 }}>{creator.name}</div>
          <div style={{ color: appColors.gray, fontSize: 14 }}>{creator.handle || "—"}</div>
          {niches.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {niches.map((tag) => (
                <span key={tag} style={{ background: appColors.primaryLight, color: appColors.primary, fontWeight: 700, fontSize: 12, borderRadius: 9999, padding: "4px 12px" }}>{tag}</span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <StatPlaceholder label="Followers" />
          <StatPlaceholder label="Engagement" />
        </div>

        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <LocationIcon color={appColors.gray} />
          <span style={{ color: appColors.gray, fontSize: 12, fontWeight: 600 }}>{creator.location || "Location not set"}</span>
        </div>

        <Link
          to={`/creator/${creator.id}`}
          style={{ background: appColors.primary, border: "none", borderRadius: 12, padding: "16px 0", fontWeight: 700, color: "white", fontSize: 16, textAlign: "center", textDecoration: "none", display: "block", marginTop: "auto" }}
        >
          View Full Profile
        </Link>
      </div>
    </div>
  );
}

export default function SavedCreators() {
  const { user } = useAuth();
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real saved_profiles rows joined to profiles client-side (same pattern
  // used throughout the app), scoped to role "creator" since this page is
  // specifically the brand-side "Saved Creators" list.
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data: savedRows } = await supabase.from("saved_profiles").select("saved_profile_id").eq("owner_id", user.id);
      const ids = (savedRows ?? []).map((r) => r.saved_profile_id);
      if (ids.length === 0) {
        if (active) {
          setCreators([]);
          setLoading(false);
        }
        return;
      }
      const { data: profileRows } = await supabase.from("profiles").select("*").in("id", ids).eq("role", "creator");
      if (!active) return;
      setCreators(profileRows ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const handleUnsave = async (id) => {
    setCreators((prev) => prev.filter((c) => c.id !== id));
    await supabase.from("saved_profiles").delete().eq("owner_id", user.id).eq("saved_profile_id", id);
  };

  return (
    <div
      className="kollab-saved-creators"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: appColors.bg, minHeight: "100vh", textAlign: "left" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { margin: 0; background: white; }
        #root { max-width: none; margin: 0; padding: 0; width: 100%; }
        .kollab-saved-creators, .kollab-saved-creators *, .kollab-saved-creators *::before, .kollab-saved-creators *::after {
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .kollab-saved-creators-main {
            margin-left: 0 !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
            padding-top: 80px !important;
          }
          .kollab-saved-creators-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <AppSidebar activeItem="saved" />
      <AppTopBar left={<Breadcrumb text="Workspace /" current="Saved Creators" />} />

      <main className="kollab-saved-creators-main" style={{ marginLeft: 256, paddingTop: 96, paddingBottom: 64, paddingLeft: 32, paddingRight: 32, display: "flex", flexDirection: "column", gap: 32 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h1 style={{ fontWeight: 600, color: appColors.navy, fontSize: 36, letterSpacing: -0.72, margin: 0 }}>Saved Creators</h1>
          <p style={{ color: appColors.grayLight, fontSize: 16, margin: 0 }}>Creators you've bookmarked ({creators.length}).</p>
        </div>

        {loading ? (
          <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: 64, textAlign: "center", color: appColors.grayLight }}>
            Loading saved creators…
          </div>
        ) : creators.length > 0 ? (
          <div className="kollab-saved-creators-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {creators.map((creator) => (
              <SavedCreatorCard key={creator.id} creator={creator} onUnsave={handleUnsave} />
            ))}
          </div>
        ) : (
          <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: 64, textAlign: "center", color: appColors.grayLight }}>
            No creators saved yet. <Link to="/discover" style={{ color: appColors.primary, fontWeight: 700 }}>Browse Discover Creators</Link> to save some.
          </div>
        )}
      </main>
    </div>
  );
}
