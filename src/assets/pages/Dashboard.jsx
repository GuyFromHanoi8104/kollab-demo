import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AppSidebar from "../components/AppSidebar";
import AppTopBar, { SearchBox } from "../components/AppTopBar";
import { appColors } from "../components/appColors";
import AvatarImage from "../components/AvatarImage";
import Footer from "../components/Footer";
import ReviewApplicationModal from "../components/ReviewApplicationModal";
import { useAuth } from "../context/useAuth";
import { supabase } from "../../supabaseClient";
import { formatVND } from "../../utils/currency";
import { PROFILE_COLUMNS } from "../../utils/profileColumns";
import { NICHE_STYLES } from "../components/nicheStyles";
import { combinedFollowers, formatCount, formatEngagement } from "../../utils/creatorStats";
import { formatRelativeTime } from "../../utils/relativeTime";

// applications.created_at -> a relative "NEW" / "2D AGO" style badge, since
// there's no real "seen/unseen" column to key off of.
function applicationBadge(createdAt) {
  const hours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  if (hours < 24) return { badge: "NEW", badgeBg: "#dce1ff", badgeColor: appColors.primary };
  const days = Math.floor(hours / 24);
  return { badge: `${days}D AGO`, badgeBg: appColors.primaryLight, badgeColor: appColors.grayLight };
}

// InstagramLogo and TikTokLogo lived here purely for the Connected Accounts
// card, which a brand never had any use for. Removed with it.

// Matches the creator-side limit in MyProfile, so the two upload paths behave
// the same way rather than one silently accepting what the other rejects.
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const STAT_ICON_BG = {
  campaigns: "#dce1ff",
  invites: "#eaddff",
  applications: "#ffdcc6",
  saved: appColors.primaryLight,
};

const CAMPAIGN_STATUS_META = {
  active: { label: "Active", color: "#16a34a", dot: "#22c55e" },
  paused: { label: "Paused", color: "#ea580c", dot: "#f97316" },
  closed: { label: "Closed", color: appColors.grayLight, dot: appColors.border },
};

function campaignBudget(c) {
  const { budget_min: min, budget_max: max } = c;
  if (min != null && max != null) return `${formatVND(min)} – ${formatVND(max)}`;
  if (max != null) return `Up to ${formatVND(max)}`;
  if (min != null) return `From ${formatVND(min)}`;
  return "Budget TBD";
}

// "Recommended" has to mean something checkable. A brand's industry is drawn
// from the same niche vocabulary creators pick from, so a creator working in
// the brand's industry is a real match and one in the same city is a weaker
// one. Where the brand has set neither there is nothing to match on, so the
// list falls back to the best-documented creators -- and the subheading says
// which of the two you are looking at rather than claiming both.
function recommendationScore(creator, brand) {
  const industry = (brand?.industry || "").trim().toLowerCase();
  const nicheMatch = industry && (creator.niche || []).some((n) => n.toLowerCase() === industry);
  const sameCity =
    !!creator.location &&
    !!brand?.location &&
    creator.location.trim().toLowerCase() === brand.location.trim().toLowerCase();
  return (nicheMatch ? 2 : 0) + (sameCity ? 1 : 0);
}

function StatCard({ stat }) {
  return (
    <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, boxShadow: "0px 10px 40px -10px rgba(21,80,211,0.08)", flex: 1, minWidth: 0, padding: "25px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, boxSizing: "border-box" }}>
      <div style={{ background: stat.iconBg, borderRadius: 12, width: 48, height: 48 }} />
      <span style={{ fontWeight: 700, color: stat.badgeColor, fontSize: 12, letterSpacing: 0.24, whiteSpace: "nowrap" }}>{stat.badge}</span>
      <span style={{ fontWeight: 700, color: appColors.navy, fontSize: 48, letterSpacing: -1.2 }}>{stat.value}</span>
      <span style={{ color: appColors.grayLight, fontSize: 14, textAlign: "center" }}>{stat.label}</span>
    </div>
  );
}

function CreatorCard({ creator }) {
  return (
    <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, boxShadow: "0px 10px 40px -10px rgba(21,80,211,0.08)", padding: 25, display: "flex", flexDirection: "column", gap: 16, minWidth: 230, boxSizing: "border-box", flexShrink: 0 }}>
      <div style={{ background: "#e2e8f0", borderRadius: 12, width: 230, height: 160, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <AvatarImage
          url={creator.avatarUrl}
          size="100%"
          radius={12}
          fallback={<span style={{ fontWeight: 700, color: appColors.grayLight, fontSize: 32 }}>{creator.initial}</span>}
        />
      </div>
      <div>
        <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 14 }}>{creator.name}</div>
        <div style={{ fontWeight: 600, color: appColors.grayLight, fontSize: 12, letterSpacing: 0.24 }}>{creator.role}</div>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <div>
          <div style={{ fontWeight: 700, color: appColors.grayLight, fontSize: 10, textTransform: "uppercase" }}>Followers</div>
          <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 14 }}>{creator.followers}</div>
        </div>
        <div>
          <div style={{ fontWeight: 700, color: appColors.grayLight, fontSize: 10, textTransform: "uppercase" }}>Engagement</div>
          <div style={{ fontWeight: 700, color: appColors.primary, fontSize: 14 }}>{creator.engagement}</div>
        </div>
      </div>
      <Link
        to={`/creator/${creator.id}`}
        style={{ background: appColors.primaryLighter, borderRadius: 12, padding: "8px 0", fontWeight: 700, color: appColors.primary, fontSize: 14, textAlign: "center", textDecoration: "none", display: "block" }}
      >
        View Profile
      </Link>
    </div>
  );
}

function ApplicationCard({ app, onReview, saved, onToggleSave }) {
  return (
    <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, boxShadow: "0px 10px 40px -10px rgba(21,80,211,0.08)", flex: 1, minWidth: 0, padding: 24, display: "flex", gap: 16, alignItems: "center", boxSizing: "border-box" }}>
      <div style={{ background: "#e2e8f0", borderRadius: 16, width: 80, height: 80, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <AvatarImage url={app.avatarUrl} size="100%" radius={16} fallback={<span style={{ fontWeight: 700, color: appColors.grayLight, fontSize: 24 }}>{app.initial}</span>} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 14 }}>{app.name}</div>
            <div style={{ fontWeight: 600, color: appColors.grayLight, fontSize: 12, letterSpacing: 0.24 }}>Category: {app.category}</div>
          </div>
          <span style={{ background: app.badgeBg, color: app.badgeColor, fontWeight: 700, fontSize: 10, borderRadius: 4, padding: "4px 8px", flexShrink: 0 }}>{app.badge}</span>
        </div>
        <div style={{ display: "flex", gap: 16, margin: "12px 0" }}>
          <span style={{ fontWeight: 700, color: appColors.navy, fontSize: 12 }}>{app.followers}</span>
          <span style={{ fontWeight: 700, color: appColors.navy, fontSize: 12 }}>{app.following}</span>
          <span style={{ fontWeight: 700, color: appColors.navy, fontSize: 12 }}>{app.er} ER</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => onReview(app)} style={{ background: appColors.primary, border: "none", borderRadius: 12, padding: "12px 16px", fontWeight: 700, color: "white", fontSize: 12, letterSpacing: 0.24, cursor: "pointer", flex: 1, whiteSpace: "nowrap" }}>
            Review Application
          </button>
          <button
            type="button"
            onClick={() => onToggleSave(app.id)}
            aria-label="Save"
            style={{ background: saved ? "#fee2e2" : appColors.primaryLighter, border: "none", borderRadius: 12, padding: "0 16px", cursor: "pointer", color: saved ? "#ba1a1a" : appColors.navy, transition: "background-color 200ms ease-out, color 200ms ease-out" }}
          >
            {saved ? "♥" : "♡"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, profile, refreshProfile } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [reviewingApp, setReviewingApp] = useState(null);
  const [savedApplications, setSavedApplications] = useState(new Set());
  const [campaignAppCounts, setCampaignAppCounts] = useState({});
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const avatarInputRef = useRef(null);
  const [overview, setOverview] = useState({
    campaigns: [], invitesSent: 0, savedCount: 0, recommended: [], activity: [], matchedOnProfile: false, loading: true,
  });

  // Applications don't carry the applying creator's name/niche directly --
  // joined through profiles, client-side (same pattern used for campaigns
  // <-> profiles and applications <-> profiles in the last three commits).
  // Scoped to campaigns this brand owns, matching the "owner-restricted"
  // spirit of the RLS policies already in place.
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoadingApps(true);
      const { data: campaignRows } = await supabase.from("campaigns").select("id").eq("brand_id", user.id);
      const campaignIds = (campaignRows ?? []).map((c) => c.id);

      if (campaignIds.length === 0) {
        if (active) {
          setApplications([]);
          setLoadingApps(false);
        }
        return;
      }

      const { data: appRows } = await supabase
        .from("applications")
        .select("*")
        .in("campaign_id", campaignIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      const apps = appRows ?? [];

      const creatorIds = [...new Set(apps.map((a) => a.creator_id))];
      const creatorsById = {};
      if (creatorIds.length > 0) {
        const { data: profileRows } = await supabase.from("profiles").select("id, name, niche, avatar_url").in("id", creatorIds);
        (profileRows ?? []).forEach((p) => {
          creatorsById[p.id] = p;
        });
      }

      if (!active) return;
      setApplications(
        apps.map((a) => {
          const creator = creatorsById[a.creator_id];
          const name = creator?.name || "Creator";
          return {
            id: a.id,
            name,
            initial: name.charAt(0).toUpperCase(),
            avatarUrl: creator?.avatar_url,
            category: creator?.niche?.length ? creator.niche.join(" & ") : "General",
            followers: "—",
            following: "—",
            er: "—",
            note: a.note,
            ...applicationBadge(a.created_at),
          };
        })
      );
      setLoadingApps(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  // Everything the page shows about this brand, in one pass. Counts come from
  // the rows themselves rather than a count query because the same rows are
  // needed for the campaign table and the activity feed anyway.
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const [{ data: campaignRows }, { data: savedRows }, { data: creatorRows }] = await Promise.all([
        supabase.from("campaigns").select("*").eq("brand_id", user.id).order("created_at", { ascending: false }),
        supabase.from("saved_profiles").select("saved_profile_id").eq("owner_id", user.id),
        supabase.from("profiles").select(PROFILE_COLUMNS).eq("role", "creator"),
      ]);
      const campaigns = campaignRows ?? [];
      const campaignIds = campaigns.map((c) => c.id);
      const campaignNameById = Object.fromEntries(campaigns.map((c) => [c.id, c.name]));

      // Invitations carry campaign_id, not brand_id, so "sent by this brand"
      // means "attached to one of this brand's campaigns".
      let invitesSent = 0;
      let appRows = [];
      if (campaignIds.length > 0) {
        const [{ data: invites }, { data: apps }] = await Promise.all([
          supabase.from("invitations").select("id").in("campaign_id", campaignIds),
          supabase
            .from("applications")
            .select("id, campaign_id, creator_id, status, created_at")
            .in("campaign_id", campaignIds)
            .order("created_at", { ascending: false }),
        ]);
        invitesSent = (invites ?? []).length;
        appRows = apps ?? [];
      }

      const appCountByCampaign = appRows.reduce((acc, a) => {
        acc[a.campaign_id] = (acc[a.campaign_id] ?? 0) + 1;
        return acc;
      }, {});

      const creators = creatorRows ?? [];
      const creatorsById = Object.fromEntries(creators.map((c) => [c.id, c]));
      const scored = creators.map((c) => ({ creator: c, score: recommendationScore(c, profile) }));
      const matchedOnProfile = scored.some(({ score }) => score > 0);
      const recommended = scored
        .sort((a, b) => b.score - a.score || combinedFollowers(b.creator) - combinedFollowers(a.creator))
        .slice(0, 6)
        .map(({ creator }) => creator);

      // Real activity: who applied to what, and when. The old feed invented a
      // campaign milestone and a login location, neither of which the app
      // tracks -- applications are the one thing that genuinely happens here.
      const activity = appRows.slice(0, 6).map((a) => ({
        id: a.id,
        title: creatorsById[a.creator_id]?.name || "A creator",
        detail: `Applied to ${campaignNameById[a.campaign_id] || "one of your campaigns"}`,
        time: formatRelativeTime(a.created_at),
        dot: a.status === "pending" ? appColors.primary : appColors.border,
        dim: a.status !== "pending",
      }));

      if (!active) return;
      setOverview({
        campaigns, invitesSent, savedCount: (savedRows ?? []).length,
        recommended, activity, matchedOnProfile, loading: false,
      });
      setCampaignAppCounts(appCountByCampaign);
    })();
    return () => { active = false; };
  }, [user, profile]);

  // Brands had no way to set a profile picture at all -- the creator side has
  // had one since Edit Profile existed. Uploads straight through rather than
  // sitting behind a modal, because there is exactly one field to change.
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // so the same file can be picked again after an error
    if (!file || !user) return;
    setAvatarError("");
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("Image must be under 5MB.");
      return;
    }
    setAvatarUploading(true);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file);
    if (uploadError) {
      setAvatarUploading(false);
      setAvatarError("Couldn't upload that photo. Please try again.");
      return;
    }
    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: saveError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrlData.publicUrl })
      .eq("id", user.id);
    setAvatarUploading(false);
    if (saveError) {
      setAvatarError("Uploaded, but couldn't save it to your profile.");
      return;
    }
    await refreshProfile();
  };

  const toggleSaveApplication = (id) => {
    setSavedApplications((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Returns { error } (Supabase's own convention) so the modal can surface
  // a real failure instead of always showing the success state.
  const handleDecision = async (id, decision) => {
    const status = decision === "accepted" ? "accepted" : "declined";
    const { error } = await supabase.from("applications").update({ status }).eq("id", id);
    if (!error) {
      setApplications((prev) => prev.filter((a) => a.id !== id));
    }
    return { error };
  };

  return (
    <div
      className="kollab-dashboard"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: appColors.bg, minHeight: "100vh", textAlign: "left" }}
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
        .kollab-dashboard, .kollab-dashboard *, .kollab-dashboard *::before, .kollab-dashboard *::after {
          box-sizing: border-box;
        }
        .kollab-scroll-row {
          scrollbar-width: thin;
          scrollbar-color: ${appColors.border} transparent;
        }
        .kollab-scroll-row::-webkit-scrollbar {
          height: 6px;
        }
        .kollab-scroll-row::-webkit-scrollbar-thumb {
          background: ${appColors.border};
          border-radius: 9999px;
        }
        .kollab-scroll-row::-webkit-scrollbar-track {
          background: transparent;
        }
        @media (max-width: 768px) {
          .kollab-dashboard-main {
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
            padding-top: 80px !important;
          }
          .kollab-dashboard-stats-row {
            flex-direction: column !important;
          }
          .kollab-dashboard-split {
            grid-template-columns: 1fr !important;
          }
          .kollab-dashboard-apps-row {
            flex-direction: column !important;
          }
          .kollab-dashboard-aside {
            display: none !important;
          }
        }
      `}</style>

      <AppSidebar activeItem="dashboard" />
      <AppTopBar left={<SearchBox placeholder="Search creators, campaigns, or keywords..." />} />

      <main className="kollab-dashboard-main" style={{ marginLeft: 256, marginRight: 320, paddingTop: 96, paddingBottom: 64, paddingLeft: 24, paddingRight: 24, display: "flex", flexDirection: "column", gap: 48, boxSizing: "border-box" }}>
        <div style={{ background: appColors.primary, borderRadius: 16, padding: 48, boxShadow: "0px 10px 40px -10px rgba(21,80,211,0.08)", width: "100%", boxSizing: "border-box" }}>
          <h1 style={{ color: "white", fontSize: 30, lineHeight: "40px", fontWeight: 600, letterSpacing: -0.6, margin: 0 }}>
            Welcome back, {profile?.name || "there"} <span style={{ marginLeft: 4 }}>👋</span>
          </h1>
          <p style={{ color: "white", opacity: 0.9, fontSize: 18, lineHeight: "28px", maxWidth: 576, margin: "8px 0 0 0" }}>
            {/* Claimed campaigns were "performing 12% better this week". There
                is no performance data on the platform at all -- no reach, no
                impressions, no week-over-week anything -- so the number could
                only ever have been decoration on a sentence about applications. */}
            {applications.length > 0
              ? `You have ${applications.length} new creator application${applications.length === 1 ? "" : "s"} waiting for review.`
              : "No applications waiting for review right now."}
          </p>
        </div>

        <div className="kollab-dashboard-stats-row" style={{ display: "flex", gap: 24 }}>
          {[
            { label: "Active Campaigns", value: overview.campaigns.filter((c) => c.status === "active").length, badge: "Live now", badgeColor: appColors.grayLight, iconBg: STAT_ICON_BG.campaigns },
            { label: "Campaign Invites Sent", value: overview.invitesSent, badge: "All time", badgeColor: appColors.grayLight, iconBg: STAT_ICON_BG.invites },
            { label: "New KOL Applications", value: applications.length, badge: applications.length > 0 ? "Review now" : "Nothing pending", badgeColor: applications.length > 0 ? appColors.primary : appColors.grayLight, iconBg: STAT_ICON_BG.applications },
            { label: "Saved Creators", value: overview.savedCount, badge: "Active list", badgeColor: appColors.grayLight, iconBg: STAT_ICON_BG.saved },
          ].map((stat) => (
            <StatCard key={stat.label} stat={{ ...stat, value: overview.loading ? "—" : String(stat.value) }} />
          ))}
        </div>

        <div className="kollab-dashboard-split" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 32 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
            <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, boxShadow: "0px 10px 40px -10px rgba(21,80,211,0.08)", padding: 32, textAlign: "center" }}>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                aria-label={profile?.avatar_url ? "Change profile picture" : "Upload a profile picture"}
                style={{ width: 96, height: 96, borderRadius: 16, background: "#e2e8f0", margin: "0 auto 16px auto", boxShadow: "0 0 0 4px rgba(60,107,237,0.2)", border: "none", padding: 0, overflow: "hidden", cursor: avatarUploading ? "wait" : "pointer", display: "block", position: "relative" }}
              >
                <AvatarImage
                  url={profile?.avatar_url}
                  size="100%"
                  radius={16}
                  fallback={<span style={{ fontWeight: 700, color: appColors.grayLight, fontSize: 30 }}>{(profile?.company_name || profile?.name || "?").charAt(0).toUpperCase()}</span>}
                />
                <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.55)", color: "white", fontSize: 10, fontWeight: 700, padding: "3px 0", letterSpacing: 0.3 }}>
                  {avatarUploading ? "UPLOADING…" : profile?.avatar_url ? "CHANGE" : "UPLOAD"}
                </span>
              </button>
              <input type="file" accept="image/*" ref={avatarInputRef} onChange={handleAvatarChange} style={{ display: "none" }} />
              {avatarError && <div style={{ color: "#ba1a1a", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{avatarError}</div>}
              <div style={{ fontWeight: 600, color: appColors.navy, fontSize: 24, letterSpacing: -0.24 }}>{profile?.company_name || profile?.name || "Your Company"}</div>
              <span style={{ display: "inline-block", marginTop: 8, color: appColors.primary, fontWeight: 600, fontSize: 14 }}>{profile?.industry || "Industry not set"}</span>
              <div style={{ borderTop: `1px solid ${appColors.border}`, marginTop: 16, paddingTop: 17, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ color: appColors.gray, fontSize: 14 }}>{profile?.website || "No website yet"}</div>
                <div style={{ color: appColors.gray, fontSize: 14 }}>{profile?.location || "Location not set"}</div>
              </div>
            </div>

            {/* A "Connected Accounts" card sat here claiming Instagram was
                connected and offering to connect TikTok. Neither did anything,
                and neither should: connecting a social account is how a
                CREATOR gets their follower count verified. A brand has no
                follower count to verify, so the card is gone rather than
                relabelled -- the equivalent on the creator side is real and
                does real work. */}
          </div>

          <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, boxShadow: "0px 10px 40px -10px rgba(21,80,211,0.08)", overflow: "hidden", minWidth: 0 }}>
            <div style={{ borderBottom: `1px solid ${appColors.border}`, padding: "32px 32px 33px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <h2 style={{ fontWeight: 600, color: appColors.navy, fontSize: 24, letterSpacing: -0.24, margin: 0, whiteSpace: "nowrap" }}>Active Campaigns</h2>
              <Link to="/manage-campaigns" style={{ color: appColors.primary, fontWeight: 700, fontSize: 14, textDecoration: "none", whiteSpace: "nowrap" }}>View All →</Link>
            </div>
            <div className="kollab-scroll-row" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: appColors.primaryLighter, borderBottom: `1px solid ${appColors.border}` }}>
                    {["CAMPAIGN NAME", "NICHE", "BUDGET", "APPS", "STATUS"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "16px 32px", color: appColors.grayLight, fontSize: 12, fontWeight: 700, letterSpacing: 0.24, whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {overview.campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: "32px", textAlign: "center", color: appColors.grayLight, fontSize: 14 }}>
                        {overview.loading ? "Loading campaigns…" : "No campaigns yet — create one to start receiving applications."}
                      </td>
                    </tr>
                  ) : overview.campaigns.map((c) => {
                    const meta = CAMPAIGN_STATUS_META[c.status] ?? CAMPAIGN_STATUS_META.closed;
                    const nicheStyle = NICHE_STYLES[c.niche] ?? { bg: "#e5eeff", color: "#1550d3" };
                    const apps = campaignAppCounts[c.id] ?? 0;
                    return (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${appColors.border}` }}>
                      <td style={{ padding: "20px 32px", fontWeight: 700, color: appColors.navy, fontSize: 14 }}>{c.name}</td>
                      <td style={{ padding: "20px 32px" }}>
                        {c.niche && <span style={{ background: nicheStyle.bg, color: nicheStyle.color, fontWeight: 700, fontSize: 10, borderRadius: 9999, padding: "2.5px 12px", textTransform: "uppercase" }}>{c.niche}</span>}
                      </td>
                      <td style={{ padding: "20px 32px", color: appColors.navy, fontSize: 16, whiteSpace: "nowrap" }}>{campaignBudget(c)}</td>
                      <td style={{ padding: "20px 32px", color: appColors.navy, fontSize: 14 }}>{apps}</td>
                      <td style={{ padding: "20px 32px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: meta.color, fontWeight: 700, fontSize: 14 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 9999, background: meta.dot }} />
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <h2 style={{ fontWeight: 600, color: appColors.navy, fontSize: 24, letterSpacing: -0.24, margin: 0 }}>Recommended Creators</h2>
              <p style={{ color: appColors.grayLight, fontSize: 14, margin: "4px 0 0 0" }}>
                {/* Claimed "recent searches" as an input. Search history isn't
                    stored anywhere, so this now names only what it actually
                    matched on -- and says so plainly when it matched nothing. */}
                {overview.matchedOnProfile
                  ? "Matched to your industry and location"
                  : "Set your industry and location in Settings to get matched creators"}
              </p>
            </div>
          </div>
          <div className="kollab-scroll-row" style={{ display: "flex", gap: 24, overflowX: "auto", paddingBottom: 8 }}>
            {overview.loading ? (
              <div style={{ color: appColors.grayLight, fontSize: 14, padding: 8 }}>Loading creators…</div>
            ) : overview.recommended.length === 0 ? (
              <div style={{ color: appColors.grayLight, fontSize: 14, padding: 8 }}>No creators on Kollab yet.</div>
            ) : overview.recommended.map((c) => (
              <CreatorCard
                key={c.id}
                creator={{
                  id: c.id,
                  name: c.name || "Unnamed creator",
                  role: (c.niche || []).join(" & ") || c.location || "Creator",
                  followers: formatCount(combinedFollowers(c)) ?? "—",
                  engagement: formatEngagement(c.engagement_rate) ?? "—",
                  initial: (c.name || "?").charAt(0).toUpperCase(),
                  avatarUrl: c.avatar_url,
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontWeight: 600, color: appColors.navy, fontSize: 24, letterSpacing: -0.24, margin: 0 }}>Recent KOL Applications</h2>
            <a href="#" style={{ color: appColors.primary, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>See all {applications.length}</a>
          </div>
          {loadingApps ? (
            <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: 40, textAlign: "center", color: appColors.grayLight, fontSize: 14 }}>
              Loading applications…
            </div>
          ) : applications.length > 0 ? (
            <div className="kollab-dashboard-apps-row" style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
              {applications.map((app) => (
                <ApplicationCard key={app.id} app={app} onReview={setReviewingApp} saved={savedApplications.has(app.id)} onToggleSave={toggleSaveApplication} />
              ))}
            </div>
          ) : (
            <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: 40, textAlign: "center", color: appColors.grayLight, fontSize: 14 }}>
              No new applications to review right now.
            </div>
          )}
        </div>

        <Footer />
      </main>

      <aside
        className="kollab-dashboard-aside"
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          height: "100vh",
          width: 320,
          background: "white",
          borderLeft: `1px solid ${appColors.border}`,
          padding: "88px 24px 32px 25px",
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        <h3 style={{ color: appColors.primary, fontSize: 24, letterSpacing: -0.24, fontWeight: 600, margin: 0 }}>Activity</h3>
        <p style={{ color: appColors.grayLight, fontSize: 12, letterSpacing: 0.24, fontWeight: 600, margin: "0 0 28px 0" }}>Recent Updates</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {!overview.loading && overview.activity.length === 0 && (
            <div style={{ color: appColors.grayLight, fontSize: 13 }}>
              Nothing yet. Applications to your campaigns will show up here.
            </div>
          )}
          {overview.activity.map((item) => (
            <div key={item.id} style={{ display: "flex", gap: 16, opacity: item.dim ? 0.7 : 1 }}>
              <div style={{ width: 8, height: 8, borderRadius: 9999, background: item.dot, marginTop: 8, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 14 }}>{item.title}</div>
                <div style={{ fontWeight: 600, color: appColors.gray, fontSize: 12, letterSpacing: 0.24 }}>{item.detail}</div>
                <div style={{ color: appColors.grayLight, fontSize: 10, marginTop: 4 }}>{item.time}</div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {reviewingApp && (
        <ReviewApplicationModal
          applicant={reviewingApp}
          onClose={() => setReviewingApp(null)}
          onDecision={handleDecision}
        />
      )}
    </div>
  );
}