import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppSidebar from "../components/AppSidebar";
import AppTopBar, { SearchBox } from "../components/AppTopBar";
import { appColors } from "../components/appColors";
import { useAuth } from "../context/useAuth";
import { supabase } from "../../supabaseClient";
import { formatVND } from "../../utils/currency";
import { combinedFollowers, formatCount, formatEngagement, hasAnyStats } from "../../utils/creatorStats";


const SIMILAR_CREATORS = [
  { name: "Tram Anh", niche: "Minimal Fashion", followers: "150K" },
  { name: "Khanh Vy", niche: "Beauty & Makeup", followers: "312K" },
  { name: "Duy Khanh", niche: "Lifestyle Vlog", followers: "98K" },
  { name: "Minh Ha", niche: "Eco-Beauty", followers: "205K" },
];

function formatDate(dateStr) {
  if (!dateStr) return "No deadline";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatBudget(campaign) {
  const { budget_min: min, budget_max: max } = campaign ?? {};
  if (min != null && max != null) return `${formatVND(min)} – ${formatVND(max)}`;
  if (max != null) return `Up to ${formatVND(max)}`;
  if (min != null) return `From ${formatVND(min)}`;
  return "Budget TBD";
}

function VerifiedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="8" fill={appColors.primary} stroke="white" strokeWidth="2" />
      <path d="M5.5 9.2l2.2 2.2 4.5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
function ShareIcon({ color }) {
  return (
    <svg width="15" height="17" viewBox="0 0 15 17" fill="none">
      <circle cx="12" cy="3" r="2.2" stroke={color} strokeWidth="1.3" />
      <circle cx="3" cy="8.5" r="2.2" stroke={color} strokeWidth="1.3" />
      <circle cx="12" cy="14" r="2.2" stroke={color} strokeWidth="1.3" />
      <path d="M5 7.3l5-2.6M5 9.7l5 2.6" stroke={color} strokeWidth="1.3" />
    </svg>
  );
}
function BookmarkIcon({ filled }) {
  return (
    <svg width="12" height="15" viewBox="0 0 12 15" fill="none">
      <path d="M1 1h10v13l-5-3.5L1 14V1Z" stroke={appColors.navy} strokeWidth="1.3" fill={filled ? appColors.primary : "none"} style={{ transition: "fill 150ms ease-out" }} />
    </svg>
  );
}
function MessageIcon({ color }) {
  return (
    <svg width="17" height="14" viewBox="0 0 17 14" fill="none">
      <path d="M1 1h15v9H5l-4 3.5V1Z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
function ArrowRight({ color }) {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
      <path d="M1 1h7v7M8 1L1 8" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
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
function EyeIcon({ color }) {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
      <path d="M1 5s2.2-4 6-4 6 4 6 4-2.2 4-6 4-6-4-6-4Z" stroke={color} strokeWidth="1.1" />
      <circle cx="7" cy="5" r="1.7" stroke={color} strokeWidth="1.1" />
    </svg>
  );
}

function AvatarPlaceholder({ size, radius, label }) {
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: "linear-gradient(135deg, #e5eeff, #c7d7ff)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: appColors.primary, fontSize: size / 3, flexShrink: 0 }}>
      {label}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: "25px", display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ color: appColors.grayLight, fontSize: 12, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase" }}>
        {label}
      </span>
      {value != null ? (
        <span style={{ color: appColors.navy, fontSize: 20, fontWeight: 700 }}>{value}</span>
      ) : (
        <span style={{ color: appColors.grayLight, fontSize: 15, fontWeight: 600 }}>
          Not yet available
        </span>
      )}
    </div>
  );
}

// These are self-reported by the creator (My Profile's Edit Profile), not
// pulled from a TikTok/Instagram API -- stats_verified just reflects
// whether someone's spot-checked the number, not that it's independently
// confirmed on every view.
function VerifiedBadge({ verified }) {
  return verified ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#16a34a", fontWeight: 700, fontSize: 12 }}>
      ✓ Verified
    </span>
  ) : (
    <span style={{ display: "inline-flex", alignItems: "center", color: appColors.grayLight, fontWeight: 600, fontSize: 12 }}>
      Self-reported
    </span>
  );
}

function EmptyStateCard({ children }) {
  return (
    <div style={{ background: appColors.bg, border: `1px dashed ${appColors.border}`, borderRadius: 16, padding: 24, textAlign: "center", color: appColors.grayLight, fontSize: 14 }}>
      {children}
    </div>
  );
}

function InviteModal({ creator, onClose }) {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setCampaignsLoading(true);
      const { data } = await supabase
        .from("campaigns")
        .select("id, name, budget_min, budget_max, deadline, platforms")
        .eq("brand_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (!active) return;
      const rows = data ?? [];
      setCampaigns(rows);
      setSelectedId(rows[0]?.id || "");
      setCampaignsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const selectedCampaign = campaigns.find((c) => c.id === selectedId);

  const handleSend = async () => {
    if (!selectedId) return;
    setSending(true);
    setSendError("");
    const { error } = await supabase.from("invitations").insert({
      campaign_id: selectedId,
      creator_id: creator.id,
      status: "pending",
    });
    setSending(false);
    if (error) {
      setSendError("Couldn't send that invitation. Please try again.");
      return;
    }
    setSent(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "#0b1c30", opacity: 0.45 }} />
      <div className="kollab-invite-modal" style={{ position: "relative", background: "white", borderRadius: 24, width: "100%", maxWidth: 480, padding: 32, display: "flex", flexDirection: "column", gap: 20, boxShadow: "0px 25px 50px -12px rgba(0,0,0,0.25)" }}>
        {sent ? (
          <div style={{ padding: "24px 0", textAlign: "center" }}>
            <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 20 }}>Invitation sent!</div>
            <p style={{ color: appColors.gray, fontSize: 14, marginTop: 8 }}>{creator.name} will be notified about {selectedCampaign?.name}.</p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 18 }}>Invite Creator to Campaign</div>
                <p style={{ color: appColors.gray, fontSize: 13, margin: "4px 0 0 0" }}>Invite {creator.name} to collaborate on one of your campaigns.</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <CloseIcon />
              </button>
            </div>

            <div style={{ background: appColors.primaryLighter, borderRadius: 16, padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
              <AvatarPlaceholder size={48} radius={9999} label={creator.name?.charAt(0).toUpperCase()} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 14 }}>{creator.name} {creator.handle}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                  {creator.niche.map((t) => (
                    <span key={t} style={{ background: "white", color: appColors.primary, fontWeight: 700, fontSize: 10, borderRadius: 9999, padding: "2px 8px" }}>{t}</span>
                  ))}
                </div>
                {hasAnyStats(creator.stats) && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, fontSize: 12 }}>
                    {combinedFollowers(creator.stats) != null && (
                      <span style={{ color: appColors.navy, fontWeight: 700 }}>{formatCount(combinedFollowers(creator.stats))} followers</span>
                    )}
                    {creator.stats.engagement_rate != null && (
                      <span style={{ color: appColors.navy, fontWeight: 700 }}>{formatEngagement(creator.stats.engagement_rate)} engagement</span>
                    )}
                    <VerifiedBadge verified={!!creator.stats.stats_verified} />
                  </div>
                )}
              </div>
            </div>

            {campaignsLoading ? (
              <div style={{ color: appColors.grayLight, fontSize: 13, textAlign: "center", padding: "8px 0" }}>Loading your active campaigns…</div>
            ) : campaigns.length === 0 ? (
              <div style={{ background: appColors.bg, border: `1px solid ${appColors.border}`, borderRadius: 12, padding: 16, textAlign: "center" }}>
                <p style={{ color: appColors.gray, fontSize: 13, margin: 0 }}>You don't have any active campaigns yet. Activate a campaign before inviting creators.</p>
                <Link to="/manage-campaigns" style={{ color: appColors.primary, fontWeight: 700, fontSize: 13 }}>Go to Manage Campaigns</Link>
              </div>
            ) : (
              <>
                <div>
                  <label style={{ fontWeight: 700, color: appColors.gray, fontSize: 12, letterSpacing: 0.24 }}>Select Campaign</label>
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    style={{ width: "100%", marginTop: 6, background: "white", border: `1px solid ${appColors.border}`, borderRadius: 12, padding: "12px 16px", fontSize: 14, color: appColors.navy }}
                  >
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ background: appColors.bg, border: `1px solid ${appColors.border}`, borderRadius: 12, padding: 16, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, fontSize: 13 }}>
                  <div><div style={{ color: appColors.grayLight, fontSize: 10, textTransform: "uppercase", fontWeight: 700 }}>Budget</div><div style={{ color: appColors.navy, fontWeight: 600 }}>{formatBudget(selectedCampaign)}</div></div>
                  <div><div style={{ color: appColors.grayLight, fontSize: 10, textTransform: "uppercase", fontWeight: 700 }}>Platform</div><div style={{ color: appColors.navy, fontWeight: 600 }}>{selectedCampaign?.platforms?.length ? selectedCampaign.platforms.join(" & ") : "Not specified"}</div></div>
                  <div><div style={{ color: appColors.grayLight, fontSize: 10, textTransform: "uppercase", fontWeight: 700 }}>Deadline</div><div style={{ color: appColors.navy, fontWeight: 600 }}>{formatDate(selectedCampaign?.deadline)}</div></div>
                </div>
              </>
            )}

            {sendError && <div style={{ color: "#ba1a1a", fontSize: 13, fontWeight: 600 }}>{sendError}</div>}

            <div className="kollab-invite-modal-actions" style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button type="button" onClick={onClose} style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 12, padding: "12px 24px", fontWeight: 600, color: appColors.gray, fontSize: 14, cursor: "pointer" }}>Cancel</button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || campaignsLoading || campaigns.length === 0}
                style={{
                  background: appColors.primary, border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 700, color: "white", fontSize: 14,
                  cursor: sending || campaignsLoading || campaigns.length === 0 ? "not-allowed" : "pointer",
                  opacity: sending || campaignsLoading || campaigns.length === 0 ? 0.6 : 1,
                  display: "flex", gap: 8, alignItems: "center", justifyContent: "center",
                }}
              >
                {sending ? "Sending…" : "Send Invitation"} <ArrowRight color="white" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CreatorProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saved, setSaved] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [portfolioFilter, setPortfolioFilter] = useState("All Content");
  const [linkCopied, setLinkCopied] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setNotFound(false);
      const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (!active) return;
      if (!data) {
        setNotFound(true);
      } else {
        setProfile(data);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // Viewing a profile is public; inviting a creator to a campaign requires
  // an account. Gate the action, not the page.
  const { isLoggedIn, role, user } = useAuth();

  const handleInviteClick = () => {
    if (isLoggedIn) {
      setModalOpen(true);
    } else {
      navigate("/login");
    }
  };

  // Finds the existing brand<->creator conversation (not tied to any
  // campaign, since this page has no campaign context) or creates one, then
  // hands off to Messages with it pre-selected -- which also puts mobile
  // straight into the thread view rather than the conversation list.
  const handleMessageClick = async () => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    if (!user || !profile || messageLoading) return;
    setMessageLoading(true);
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("brand_id", user.id)
      .eq("creator_id", profile.id)
      .is("campaign_id", null)
      .maybeSingle();

    let conversationId = existing?.id;
    if (!conversationId) {
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({ brand_id: user.id, creator_id: profile.id })
        .select("id")
        .single();
      setMessageLoading(false);
      if (error) return;
      conversationId = created.id;
    } else {
      setMessageLoading(false);
    }
    navigate("/messages", { state: { conversationId } });
  };

  // Record a real "view" and seed the real saved state whenever a logged-in
  // user lands on someone else's profile. Guests have no viewer_id to
  // attach a view to, so this is skipped silently for them.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!user || !profile || user.id === profile.id) {
        setSaved(false);
        return;
      }
      await supabase.from("profile_views").upsert(
        { viewer_id: user.id, viewed_profile_id: profile.id },
        { onConflict: "viewer_id,viewed_profile_id" }
      );
      const { data } = await supabase
        .from("saved_profiles")
        .select("id")
        .eq("owner_id", user.id)
        .eq("saved_profile_id", profile.id)
        .maybeSingle();
      if (active) setSaved(!!data);
    })();
    return () => {
      active = false;
    };
  }, [user, profile]);

  const handleToggleSave = async () => {
    if (!user || !profile) return;
    if (saved) {
      const { error } = await supabase.from("saved_profiles").delete().eq("owner_id", user.id).eq("saved_profile_id", profile.id);
      if (!error) setSaved(false);
    } else {
      const { error } = await supabase.from("saved_profiles").insert({ owner_id: user.id, saved_profile_id: profile.id });
      if (!error) setSaved(true);
    }
  };

  const displayName = profile?.name || "Unnamed creator";
  const handle = profile?.handle || "";
  const niches = profile?.niche || [];
  const location = profile?.location || "Location not set";
  const bio = profile?.bio || "This creator hasn't added a bio yet.";

  return (
    <div
      className="kollab-creator-profile"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: appColors.bg, minHeight: "100vh", textAlign: "left" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { margin: 0; background: white; }
        #root { max-width: none; margin: 0; padding: 0; width: 100%; }
        .kollab-creator-profile, .kollab-creator-profile *, .kollab-creator-profile *::before, .kollab-creator-profile *::after {
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .kollab-creator-profile-main {
            margin-left: 0 !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
            padding-top: 80px !important;
          }
          .kollab-creator-profile-split {
            grid-template-columns: 1fr !important;
          }
          .kollab-creator-profile-hero {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .kollab-creator-profile-insights-row {
            flex-direction: column !important;
          }
          .kollab-creator-profile-similar-row {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
          }
          .kollab-creator-profile-info-grid {
            grid-template-columns: 1fr !important;
          }
          .kollab-creator-profile-stats {
            grid-template-columns: 1fr 1fr !important;
          }
          .kollab-invite-modal {
            padding: 20px !important;
          }
          .kollab-invite-modal-actions {
            flex-direction: column-reverse !important;
          }
          .kollab-invite-modal-actions button {
            width: 100% !important;
            justify-content: center !important;
          }
        }
        .kollab-scroll-row {
          scrollbar-width: thin;
          scrollbar-color: ${appColors.border} transparent;
        }
        .kollab-scroll-row::-webkit-scrollbar { height: 6px; }
        .kollab-scroll-row::-webkit-scrollbar-thumb { background: ${appColors.border}; border-radius: 9999px; }
        .kollab-scroll-row::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <AppSidebar activeItem="discover" />
      <AppTopBar left={<SearchBox placeholder="Search creators, niches, or keywords..." />} />

      {loading ? (
        <main className="kollab-creator-profile-main" style={{ marginLeft: 256, paddingTop: 96, paddingLeft: 32, paddingRight: 32 }}>
          <div style={{ maxWidth: 1280, color: appColors.grayLight, fontSize: 14, textAlign: "center", padding: 48 }}>Loading creator profile…</div>
        </main>
      ) : notFound ? (
        <main className="kollab-creator-profile-main" style={{ marginLeft: 256, paddingTop: 96, paddingLeft: 32, paddingRight: 32 }}>
          <div style={{ maxWidth: 1280, background: "white", border: `1px solid ${appColors.border}`, borderRadius: 24, padding: 48, textAlign: "center" }}>
            <h1 style={{ fontWeight: 700, color: appColors.navy, fontSize: 24, margin: 0 }}>Creator not found</h1>
            <p style={{ color: appColors.grayLight, fontSize: 14, marginTop: 8 }}>This profile doesn't exist or may have been removed.</p>
            <Link to="/discover" style={{ display: "inline-block", marginTop: 16, background: appColors.primary, borderRadius: 12, padding: "12px 24px", fontWeight: 700, color: "white", fontSize: 14, textDecoration: "none" }}>
              Back to Discover Creators
            </Link>
          </div>
        </main>
      ) : (
      <main className="kollab-creator-profile-main" style={{ marginLeft: 256, paddingTop: 96, paddingBottom: 64, paddingLeft: 32, paddingRight: 32 }}>
        <div className="kollab-creator-profile-split" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, maxWidth: 1280 }}>
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
            <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 24, padding: 33, boxShadow: "0px 20px 40px -10px rgba(79,124,255,0.08)" }}>
              <div className="kollab-creator-profile-hero" style={{ display: "flex", gap: 32 }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{ border: `4px solid ${appColors.bg}`, borderRadius: 24, boxShadow: "0px 10px 15px -3px rgba(0,0,0,0.1)" }}>
                    <AvatarPlaceholder size={160} radius={20} label={displayName.charAt(0).toUpperCase()} />
                  </div>
                  <div style={{ position: "absolute", bottom: -8, right: -8, background: appColors.primary, border: "4px solid white", borderRadius: 9999, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <VerifiedIcon />
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <h1 style={{ fontWeight: 800, color: appColors.navy, fontSize: 36, letterSpacing: -0.9, margin: 0 }}>{displayName}</h1>
                    {handle && <div style={{ color: appColors.primary, fontWeight: 600, fontSize: 16, marginTop: 6 }}>{handle}</div>}
                    {niches.length > 0 && (
                      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                        {niches.map((tag) => (
                          <span key={tag} style={{ background: appColors.primaryLight, color: appColors.primary, fontWeight: 600, fontSize: 12, borderRadius: 9999, padding: "6px 16px" }}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <p style={{ color: appColors.gray, fontSize: 16, lineHeight: "26px", margin: 0, maxWidth: 672 }}>{bio}</p>

                  <div className="kollab-creator-profile-info-grid" style={{ borderTop: `1px solid ${appColors.border}`, paddingTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}><LocationIcon color={appColors.grayLight} /><span style={{ color: appColors.grayLight, fontSize: 14 }}>{location}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {hasAnyStats(profile) && (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <VerifiedBadge verified={!!profile.stats_verified} />
                </div>
              )}
              <div className="kollab-creator-profile-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                <StatCard label="TIKTOK FOLLOWERS" value={formatCount(profile.tiktok_followers)} />
                <StatCard label="TIKTOK AVG VIEWS" value={formatCount(profile.tiktok_avg_views)} />
                <StatCard label="IG FOLLOWERS" value={formatCount(profile.instagram_followers)} />
                <StatCard label="IG AVG VIEWS" value={formatCount(profile.instagram_avg_views)} />
                <StatCard label="ENGAGEMENT" value={formatEngagement(profile.engagement_rate)} />
              </div>
            </div>

            <div className="kollab-creator-profile-insights-row" style={{ display: "flex", gap: 24 }}>
              <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: 25, flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 24 }}>
                <h3 style={{ fontWeight: 700, color: appColors.navy, fontSize: 24, letterSpacing: -0.24, margin: 0 }}>Audience Insights</h3>
                <EmptyStateCard>Audience insights aren't available yet -- this needs a connected TikTok/Instagram account.</EmptyStateCard>
              </div>

              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: 25, flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                  <h3 style={{ fontWeight: 700, color: appColors.navy, fontSize: 24, letterSpacing: -0.24, margin: 0 }}>Platforms</h3>
                  <EmptyStateCard>No connected platforms yet.</EmptyStateCard>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontWeight: 700, color: appColors.navy, fontSize: 24, letterSpacing: -0.24, margin: 0 }}>Recent Collaborations</h3>
              </div>
              <EmptyStateCard>No collaboration history yet.</EmptyStateCard>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontWeight: 700, color: appColors.navy, fontSize: 24, letterSpacing: -0.24, margin: 0 }}>Campaign Portfolio</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  {["All Content", "TikTok", "Reels"].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setPortfolioFilter(tab)}
                      style={{
                        background: portfolioFilter === tab ? appColors.primary : "white",
                        border: `1px solid ${portfolioFilter === tab ? appColors.primary : appColors.border}`,
                        borderRadius: 9999, padding: "7px 13px", fontWeight: 600, fontSize: 12,
                        color: portfolioFilter === tab ? "white" : appColors.grayLight, cursor: "pointer",
                        transition: "background-color 200ms ease-out, border-color 200ms ease-out, color 200ms ease-out",
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <EmptyStateCard>This creator hasn't added any portfolio content yet.</EmptyStateCard>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h3 style={{ fontWeight: 700, color: appColors.navy, fontSize: 24, letterSpacing: -0.24, margin: 0 }}>Testimonials</h3>
              <EmptyStateCard>No testimonials yet.</EmptyStateCard>
            </div>
          </div>

          {/* Right column -- sticky contact card */}
          <div style={{ minWidth: 0 }}>
            <div style={{ position: "sticky", top: 96, background: "white", border: `1px solid ${appColors.border}`, borderRadius: 24, padding: 25, boxShadow: "0px 20px 40px -10px rgba(79,124,255,0.08)", display: "flex", flexDirection: "column", gap: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ background: "#22c55e", width: 10, height: 10, borderRadius: 9999 }} />
                  <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 14 }}>Available for campaigns</span>
                </div>
                <button type="button" onClick={handleShare} aria-label="Share profile" style={{ background: appColors.bg, border: `1px solid ${appColors.border}`, borderRadius: 9999, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <ShareIcon color={appColors.gray} />
                </button>
                {linkCopied && (
                  <span style={{ position: "absolute", top: 46, right: 0, background: appColors.navy, color: "white", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 8, whiteSpace: "nowrap" }}>
                    Link copied!
                  </span>
                )}
              </div>

              {role === "brand" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <button
                    type="button"
                    onClick={handleInviteClick}
                    style={{ background: appColors.primary, border: "none", borderRadius: 16, padding: "16px 0", fontWeight: 700, color: "white", fontSize: 16, cursor: "pointer", boxShadow: "0px 10px 15px -3px rgba(21,80,211,0.2), 0px 4px 6px -4px rgba(21,80,211,0.2)" }}
                  >
                    Invite to Campaign
                  </button>
                  <div style={{ display: "flex", gap: 16 }}>
                    <button type="button" onClick={handleToggleSave} style={{ flex: 1, background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: "13px 0", display: "flex", gap: 8, alignItems: "center", justifyContent: "center", fontWeight: 700, color: appColors.navy, fontSize: 16, cursor: "pointer" }}>
                      <BookmarkIcon filled={saved} /> {saved ? "Saved" : "Save"}
                    </button>
                    <button type="button" onClick={handleMessageClick} disabled={messageLoading} style={{ flex: 1, background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: "13px 0", display: "flex", gap: 8, alignItems: "center", justifyContent: "center", fontWeight: 700, color: appColors.navy, fontSize: 16, cursor: messageLoading ? "not-allowed" : "pointer", opacity: messageLoading ? 0.6 : 1 }}>
                      <MessageIcon color={appColors.navy} /> {messageLoading ? "Opening…" : "Message"}
                    </button>
                  </div>
                </div>
              ) : (
                // Discover Creators is view-only for the creator role for now
                // -- no creator-to-creator connect/message feature has been
                // designed yet, so nothing actionable is shown here rather
                // than a half-built feature.
                <div style={{ background: appColors.bg, border: `1px solid ${appColors.border}`, borderRadius: 16, padding: 20, textAlign: "center", color: appColors.grayLight, fontSize: 14 }}>
                  You're viewing this profile. Brand accounts can invite creators to campaigns from here.
                </div>
              )}

              <div style={{ background: appColors.primaryLighter, borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 11 }}>
                <span style={{ color: appColors.grayLight, fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Campaign Preferences</span>
                <p style={{ color: appColors.gray, fontSize: 14, lineHeight: "23px", margin: 0 }}>No campaign preferences shared yet.</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1280, marginTop: 32, paddingBottom: 48, display: "flex", flexDirection: "column", gap: 32 }}>
          <h3 style={{ fontWeight: 700, color: appColors.navy, fontSize: 24, letterSpacing: -0.24, margin: 0 }}>Similar Creators You Might Like</h3>
          <div className="kollab-creator-profile-similar-row" style={{ display: "flex", gap: 24 }}>
            {SIMILAR_CREATORS.map((c) => (
              <div key={c.name} style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: 21, flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ border: `2px solid ${appColors.bg}`, borderRadius: 16 }}>
                  <AvatarPlaceholder size={80} radius={14} label={c.name[0]} />
                </div>
                <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 16, marginTop: 12 }}>{c.name}</div>
                <div style={{ color: appColors.grayLight, fontSize: 12 }}>{c.niche}</div>
                <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 8 }}>
                  <EyeIcon color={appColors.navy} />
                  <span style={{ color: appColors.navy, fontWeight: 700, fontSize: 14 }}>{c.followers}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      )}

      {modalOpen && profile && <InviteModal creator={{ id: profile.id, name: displayName, handle, niche: niches, stats: profile }} onClose={() => setModalOpen(false)} />}
    </div>
  );
}
