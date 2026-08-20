import { useEffect, useRef, useState } from "react";
import AppSidebar from "../components/AppSidebar";
import AppTopBar, { Breadcrumb } from "../components/AppTopBar";
import { appColors } from "../components/appColors";
import { NICHE_STYLES } from "../components/nicheStyles";
import AvatarImage from "../components/AvatarImage";
import { useAuth } from "../context/useAuth";
import { supabase } from "../../supabaseClient";
import { buildInstagramOAuthUrl, isInstagramConfigured } from "../../utils/instagramAuth";
import { buildTikTokOAuthUrl, isTikTokConfigured } from "../../utils/tiktokAuth";
import { formatVND } from "../../utils/currency";
import { formatCount, formatEngagement, hasAnyStats } from "../../utils/creatorStats";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

// applications.status -> display label + colors, mirroring the STATUS_META
// pattern used for campaigns.status in ManageCampaigns.jsx.
const APPLICATION_STATUS_META = {
  pending: { status: "Pending", statusColor: "#ea580c", dotColor: "#f97316" },
  accepted: { status: "Accepted", statusColor: "#16a34a", dotColor: "#22c55e" },
  declined: { status: "Declined", statusColor: appColors.grayLight, dotColor: appColors.border },
};

function formatBudget(campaign) {
  const { budget_min: min, budget_max: max } = campaign ?? {};
  if (min != null && max != null) return `${formatVND(min)} – ${formatVND(max)}`;
  if (max != null) return `Up to ${formatVND(max)}`;
  if (min != null) return `From ${formatVND(min)}`;
  return "Budget TBD";
}

function formatDate(dateStr) {
  if (!dateStr) return "No date";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Extras that don't have a `profiles` column yet (languages, response time,
// campaign preferences) -- stay mock until there's a real data source for
// them. Name/handle/bio/location/tags come from the real profile instead,
// see the component body.
const PROFILE_EXTRAS = {
  languages: "Vietnamese, English",
  memberSince: "Mar 2026",
  responseNote: "Responds within 4 hours (99% Rate)",
  quickNote: "I prefer fashion and lifestyle campaigns with 3-4 days of lead time, and I love collaborating on styling multiple looks per shoot.",
};


// AGE_DISTRIBUTION / TOP_LOCATIONS / PLATFORMS used to live here as hardcoded
// sample figures. Audience insights are out of scope for the MVP and now show
// an explicit "coming soon" state, and the platform cards read the real
// profile columns instead.
//
// Recent Collaborations used to list Uniqlo VN and Shopee Vietnam with "640K
// Reach" and "980K Reach". Neither collaboration happened and Kollab measures
// no reach at all -- it was a claim of endorsement by two of the largest
// retailers in Vietnam, on a page a brand reads to decide whether to hire.
//
// A real collaboration is a campaign this creator was accepted onto: an
// accepted application, or an accepted invitation. Reach is simply dropped,
// because there is no impressions data anywhere on the platform to replace it
// with.
//
// Content Portfolio showed four gradient placeholders captioned with view and
// comment counts that were equally invented. There is no media table and no
// upload path, so it states that it is coming rather than faking four posts.

function LocationIcon({ color }) {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
      <path d="M6 13S1 8.4 1 5a5 5 0 0 1 10 0c0 3.4-5 8-5 8Z" stroke={color} strokeWidth="1.3" />
      <circle cx="6" cy="5" r="1.6" stroke={color} strokeWidth="1.3" />
    </svg>
  );
}
function GlobeIcon({ color }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="5" stroke={color} strokeWidth="1.2" />
      <path d="M1 6h10M6 1c1.5 1.5 1.5 8.5 0 10M6 1c-1.5 1.5-1.5 8.5 0 10" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}
function CalendarIcon({ color }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="2" width="10" height="9" rx="1.5" stroke={color} strokeWidth="1.2" />
      <path d="M1 5h10M4 1v2M8 1v2" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function ClockIcon({ color }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="5" stroke={color} strokeWidth="1.2" />
      <path d="M6 3v3l2 1.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
// EyeIcon and CommentIcon lived here only to caption the fake portfolio
// tiles' view and comment counts. Removed with them.
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
function EditIcon({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M11 2l3 3-8 8-3.5 1 1-3.5 8-8Z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
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

function AvatarPlaceholder({ size, radius, label, avatarUrl }) {
  return (
    <AvatarImage
      url={avatarUrl}
      size={size}
      radius={radius}
      fallback={
        <div style={{ width: size, height: size, borderRadius: radius, background: "linear-gradient(135deg, #e5eeff, #c7d7ff)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: appColors.primary, fontSize: size / 3, flexShrink: 0 }}>
          {label}
        </div>
      }
    />
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: "25px", display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ color: appColors.grayLight, fontSize: 12, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase" }}>{label}</span>
      {value != null ? (
        <span style={{ color, fontSize: 30, fontWeight: 700 }}>{value}</span>
      ) : (
        <span style={{ color: appColors.grayLight, fontSize: 16, fontWeight: 600 }}>Not yet available</span>
      )}
    </div>
  );
}

// One card per platform. `verified` is reserved for numbers Instagram's API
// reported -- anything else is whatever the creator typed in Edit Profile, and
// is labelled as such rather than sharing the verified styling.
function PlatformCard({ name, handle, bg, followers, avgViews, verified, action }) {
  return (
    <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: 25, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
          <div style={{ background: bg, borderRadius: 12, width: 40, height: 40, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 16 }}>{name}</div>
            <div style={{ color: appColors.grayLight, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {handle}
            </div>
          </div>
        </div>
        {verified && (
          <span style={{ color: "#16a34a", fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" }}>✓ Verified</span>
        )}
      </div>

      <div style={{ display: "flex", gap: 16, justifyContent: "space-around" }}>
        {[["Followers", followers], ["Avg Views", avgViews]].map(([label, value]) => (
          <div key={label}>
            <div style={{ color: appColors.grayLight, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
            {value != null ? (
              <div style={{ color: verified ? "#16a34a" : appColors.navy, fontWeight: 700, fontSize: 16 }}>{value}</div>
            ) : (
              <div style={{ color: appColors.grayLight, fontWeight: 600, fontSize: 13 }}>—</div>
            )}
          </div>
        ))}
      </div>

      {action}
    </div>
  );
}

// Three distinct levels of trust, deliberately not collapsed into one label:
//
//   instagramVerified -- the follower number came from Instagram's own API
//     through a connection this creator authorised. Nobody typed it.
//   verified (stats_verified) -- a self-reported number a founder eyeballed
//     against the real account once. Weaker, and only as fresh as that check.
//   neither -- straight self-report.
//
// Showing the automatic one as plain "✓ Verified" would flatten a machine-
// checked figure into a human-spot-checked one and quietly overstate the
// latter.
function VerifiedBadge({ verified, instagramVerified }) {
  if (instagramVerified) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#16a34a", fontWeight: 700, fontSize: 12 }}>
        ✓ Verified via Instagram
      </span>
    );
  }
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

function InvitationCard({ invite, onRespond, busy }) {
  return (
    <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: 24, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 16 }}>{invite.campaign}</div>
        <div style={{ color: appColors.grayLight, fontSize: 13 }}>from {invite.brand}</div>
        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          <span style={{ color: appColors.gray, fontSize: 12 }}>Budget: <strong style={{ color: appColors.navy }}>{invite.budget}</strong></span>
          <span style={{ color: appColors.gray, fontSize: 12 }}>Deadline: <strong style={{ color: appColors.navy }}>{invite.deadline}</strong></span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={() => onRespond(invite.id, "declined")} disabled={busy} style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 10, padding: "10px 18px", fontWeight: 700, color: appColors.gray, fontSize: 13, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1 }}>
          Decline
        </button>
        <button type="button" onClick={() => onRespond(invite.id, "accepted")} disabled={busy} style={{ background: appColors.primary, border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, color: "white", fontSize: 13, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1 }}>
          Accept
        </button>
      </div>
    </div>
  );
}

export default function MyProfile() {
  const { user, profile, role, refreshProfile } = useAuth();
  const [applications, setApplications] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [collaborations, setCollaborations] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [respondedLog, setRespondedLog] = useState([]);
  const [respondingId, setRespondingId] = useState(null);
  const [respondError, setRespondError] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState("");
  // Draft copy of profiles.niche (a text[] column) while the modal is open.
  const [nicheDraft, setNicheDraft] = useState([]);
  const [igRefreshing, setIgRefreshing] = useState(false);
  const [igError, setIgError] = useState("");
  const [igDisconnecting, setIgDisconnecting] = useState(false);
  const [tkRefreshing, setTkRefreshing] = useState(false);
  const [tkError, setTkError] = useState("");
  const [tkDisconnecting, setTkDisconnecting] = useState(false);
  const [seededProfileId, setSeededProfileId] = useState(null);
  const [quickNote, setQuickNote] = useState(PROFILE_EXTRAS.quickNote);
  const [tiktokFollowers, setTiktokFollowers] = useState("");
  const [tiktokAvgViews, setTiktokAvgViews] = useState("");
  const [instagramFollowers, setInstagramFollowers] = useState("");
  const [instagramAvgViews, setInstagramAvgViews] = useState("");
  const [engagementRate, setEngagementRate] = useState("");
  // Tracks the stats as last known saved to the DB, so handleSaveProfile can
  // tell whether the *values* actually changed (not just whether Save was
  // clicked) -- that's what decides whether stats_verified gets reset.
  const [seededStats, setSeededStats] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarError, setAvatarError] = useState("");
  const avatarInputRef = useRef(null);

  // Seed the editable bio/stats from the real profile once it loads --
  // quickNote has no column yet, so it stays local/mock (see PROFILE_EXTRAS
  // above). Adjusting state during render (not in an effect) per React's
  // guidance for "resetting state when a prop/external value changes".
  if (profile && profile.id !== seededProfileId) {
    setSeededProfileId(profile.id);
    setBio(profile.bio || "");
    // Guarded rather than defaulted: the column is nullable, and a non-array
    // value would break every .map()/.some() that reads niche elsewhere.
    setNicheDraft(Array.isArray(profile.niche) ? profile.niche : []);
    setSeededStats({
      tiktok_followers: profile.tiktok_followers ?? null,
      tiktok_avg_views: profile.tiktok_avg_views ?? null,
      instagram_followers: profile.instagram_followers ?? null,
      instagram_avg_views: profile.instagram_avg_views ?? null,
      engagement_rate: profile.engagement_rate ?? null,
    });
    setTiktokFollowers(profile.tiktok_followers ?? "");
    setTiktokAvgViews(profile.tiktok_avg_views ?? "");
    setInstagramFollowers(profile.instagram_followers ?? "");
    setInstagramAvgViews(profile.instagram_avg_views ?? "");
    setEngagementRate(profile.engagement_rate ?? "");
  }

  // A stored instagram_business_account_id is the marker for a real
  // connection -- the token itself is never readable from the client.
  const igConnected = !!profile?.instagram_business_account_id;

  // Pull the live count on profile load, so a connected creator's number is
  // current rather than whatever was true at connection time. Fire-and-forget:
  // the stored value is already on screen, and a failed refresh (expired or
  // revoked token) should leave the page working, not blank it.
  useEffect(() => {
    if (!user || !igConnected) return;
    let active = true;
    (async () => {
      setIgRefreshing(true);
      const { data, error } = await supabase.functions.invoke("instagram-connect", {
        body: { action: "refresh" },
      });
      if (!active) return;
      setIgRefreshing(false);
      if (error || data?.error) {
        setIgError("Couldn't refresh from Instagram just now — showing the last known count.");
        return;
      }
      setIgError("");
      if (data?.followers_count != null) await refreshProfile();
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, igConnected]);

  // Clears the stored token and the verified marker. The follower number is
  // left in place: it was real when fetched, and with the connection gone the
  // UI already drops back to "Self-reported", so wiping it would blank the
  // profile for no gain. Confirmed first because it can't be undone without
  // going through Instagram's login again.
  const disconnectInstagram = async () => {
    if (!window.confirm(
      "Disconnect Instagram? Your follower count will go back to being self-reported " +
      "until you reconnect."
    )) return;

    setIgDisconnecting(true);
    setIgError("");
    const { data, error } = await supabase.functions.invoke("instagram-connect", {
      body: { action: "disconnect" },
    });
    setIgDisconnecting(false);
    if (error || data?.error) {
      setIgError("Couldn't disconnect Instagram just now. Please try again.");
      return;
    }
    await refreshProfile();
  };

  // A stored tiktok_open_id is the marker for a real TikTok connection, exactly
  // as instagram_business_account_id is for Instagram. The client cannot write
  // either one, so the badge can't be self-certified.
  const tkConnected = !!profile?.tiktok_open_id;

  // TikTok's access token lives 24 hours, so unlike Instagram this refresh is
  // near-guaranteed to be needed on every visit -- it spends the refresh token
  // rather than reusing a stored access token. Same fire-and-forget shape: the
  // stored count is already on screen and a failure shouldn't blank the page.
  useEffect(() => {
    if (!user || !tkConnected) return;
    let active = true;
    (async () => {
      setTkRefreshing(true);
      const { data, error } = await supabase.functions.invoke("tiktok-connect", {
        body: { action: "refresh" },
      });
      if (!active) return;
      setTkRefreshing(false);
      if (error || data?.error) {
        setTkError("Couldn't refresh from TikTok just now — showing the last known count.");
        return;
      }
      setTkError("");
      if (data?.follower_count != null) await refreshProfile();
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tkConnected]);

  const disconnectTikTok = async () => {
    if (!window.confirm(
      "Disconnect TikTok? Your follower count will go back to being self-reported " +
      "until you reconnect."
    )) return;

    setTkDisconnecting(true);
    setTkError("");
    const { data, error } = await supabase.functions.invoke("tiktok-connect", {
      body: { action: "disconnect" },
    });
    setTkDisconnecting(false);
    if (error || data?.error) {
      setTkError("Couldn't disconnect TikTok just now. Please try again.");
      return;
    }
    await refreshProfile();
  };

  const toggleNiche = (n) =>
    setNicheDraft((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));

  const displayName = profile?.name || "Your name";
  const handle = profile?.handle || "@add-your-handle";
  const tags = Array.isArray(profile?.niche) ? profile.niche : [];
  const location = profile?.location || "Add your location";

  // Applications and invitations don't carry the brand/campaign name
  // directly -- both join through campaigns to the owning brand's profile.
  // Fetched as separate queries and combined client-side (not relying on
  // Supabase relationship-embedding being configured), same pattern used
  // for campaigns <-> profiles in ManageCampaigns/CampaignsBrowse.
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setDataLoading(true);
      const [{ data: appRows }, { data: inviteRows }] = await Promise.all([
        supabase.from("applications").select("*").eq("creator_id", user.id).order("created_at", { ascending: false }),
        // Not filtered to pending any more: accepted invitations are
        // collaborations, and the pending ones are filtered out below.
        supabase.from("invitations").select("*").eq("creator_id", user.id).order("created_at", { ascending: false }),
      ]);
      const apps = appRows ?? [];
      const allInvites = inviteRows ?? [];
      const invites = allInvites.filter((i) => i.status === "pending");

      const campaignIds = [...new Set([...apps.map((a) => a.campaign_id), ...allInvites.map((i) => i.campaign_id)])];
      const campaignsById = {};
      if (campaignIds.length > 0) {
        const { data: campaignRows } = await supabase.from("campaigns").select("id, name, brand_id, budget_min, budget_max, deadline").in("id", campaignIds);
        (campaignRows ?? []).forEach((c) => {
          campaignsById[c.id] = c;
        });
      }

      const brandIds = [...new Set(Object.values(campaignsById).map((c) => c.brand_id))];
      const brandsById = {};
      if (brandIds.length > 0) {
        const { data: profileRows } = await supabase.from("profiles").select("id, name, company_name").in("id", brandIds);
        (profileRows ?? []).forEach((p) => {
          brandsById[p.id] = p;
        });
      }

      const brandNameFor = (campaign) => {
        const brand = campaign ? brandsById[campaign.brand_id] : null;
        return brand?.company_name || brand?.name || "Brand";
      };

      if (!active) return;
      setApplications(
        apps.map((a) => {
          const campaign = campaignsById[a.campaign_id];
          const meta = APPLICATION_STATUS_META[a.status] ?? APPLICATION_STATUS_META.pending;
          return {
            id: a.id,
            brand: brandNameFor(campaign),
            campaign: campaign?.name || "Deleted campaign",
            appliedOn: formatDate(a.created_at),
            ...meta,
          };
        })
      );
      setInvitations(
        invites.map((i) => {
          const campaign = campaignsById[i.campaign_id];
          return {
            id: i.id,
            brand: brandNameFor(campaign),
            campaign: campaign?.name || "Deleted campaign",
            budget: formatBudget(campaign),
            deadline: campaign?.deadline ? formatDate(campaign.deadline) : "No deadline",
          };
        })
      );
      // One entry per campaign: a creator who was invited and also applied to
      // the same campaign collaborated once, not twice.
      const acceptedByCampaign = new Map();
      for (const row of [...apps, ...allInvites]) {
        if (row.status !== "accepted") continue;
        const existing = acceptedByCampaign.get(row.campaign_id);
        if (!existing || new Date(row.created_at) > new Date(existing.created_at)) {
          acceptedByCampaign.set(row.campaign_id, row);
        }
      }
      setCollaborations(
        [...acceptedByCampaign.values()]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .map((row) => {
            const campaign = campaignsById[row.campaign_id];
            return {
              id: row.id,
              brand: brandNameFor(campaign),
              campaign: campaign?.name || "Deleted campaign",
              date: formatDate(row.created_at),
            };
          })
      );
      setDataLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const handleRespond = async (id, decision) => {
    const invite = invitations.find((i) => i.id === id);
    if (!invite) return;
    setRespondingId(id);
    setRespondError("");
    const status = decision === "accepted" ? "accepted" : "declined";
    const { error } = await supabase.from("invitations").update({ status }).eq("id", id);
    setRespondingId(null);
    if (error) {
      setRespondError("Couldn't update that invitation. Please try again.");
      return;
    }
    setInvitations((prev) => prev.filter((i) => i.id !== id));
    setRespondedLog((prev) => [...prev, { ...invite, decision }]);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setAvatarError("");
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("Image must be under 5MB.");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarError("");
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    let avatarUrl = profile?.avatar_url ?? null;
    if (avatarFile) {
      const path = `${user.id}/${Date.now()}-${avatarFile.name}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, avatarFile);
      if (uploadError) {
        setSaving(false);
        setAvatarError("Couldn't upload that photo. Please try again.");
        return;
      }
      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
      avatarUrl = publicUrlData.publicUrl;
    }

    const newStats = {
      tiktok_followers: tiktokFollowers === "" ? null : Number(tiktokFollowers),
      tiktok_avg_views: tiktokAvgViews === "" ? null : Number(tiktokAvgViews),
      instagram_followers: instagramFollowers === "" ? null : Number(instagramFollowers),
      instagram_avg_views: instagramAvgViews === "" ? null : Number(instagramAvgViews),
      engagement_rate: engagementRate === "" ? null : Number(engagementRate),
    };
    // A previous verification shouldn't silently carry over to a new,
    // unverified number -- only reset it if a value actually changed, not
    // just because Save was clicked (e.g. only the bio was edited).
    const prevStats = seededStats || {};
    const statsChanged = Object.keys(newStats).some((key) => newStats[key] !== (prevStats[key] ?? null));
    const payload = { bio, niche: nicheDraft, avatar_url: avatarUrl, ...newStats, stats_updated_at: new Date().toISOString() };
    if (statsChanged) payload.stats_verified = false;
    await supabase.from("profiles").update(payload).eq("id", user.id);
    await refreshProfile();
    setSeededStats(newStats);
    setSaving(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    setEditModalOpen(false);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  return (
    <div
      className="kollab-my-profile"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: appColors.bg, minHeight: "100vh", textAlign: "left" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { margin: 0; background: white; }
        #root { max-width: none; margin: 0; padding: 0; width: 100%; }
        .kollab-my-profile, .kollab-my-profile *, .kollab-my-profile *::before, .kollab-my-profile *::after {
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .kollab-my-profile-main {
            margin-left: 0 !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
            padding-top: 80px !important;
          }
          .kollab-my-profile-split {
            grid-template-columns: 1fr !important;
          }
          .kollab-my-profile-hero {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .kollab-my-profile-info-grid {
            grid-template-columns: 1fr !important;
          }
          .kollab-my-profile-stats {
            grid-template-columns: 1fr 1fr !important;
          }
          .kollab-my-profile-portfolio {
            grid-template-columns: 1fr 1fr !important;
          }
          .kollab-my-profile-insights-row {
            flex-direction: column !important;
          }
          .kollab-my-profile-edit-modal {
            padding: 20px !important;
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

      <AppSidebar activeItem="profile" role="creator" />
      <AppTopBar left={<Breadcrumb text="Workspace /" current="My Profile" />} />

      <main className="kollab-my-profile-main" style={{ marginLeft: 256, paddingTop: 96, paddingBottom: 64, paddingLeft: 32, paddingRight: 32 }}>
        <div className="kollab-my-profile-split" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, maxWidth: 1280 }}>
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
            <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 24, padding: 33, boxShadow: "0px 20px 40px -10px rgba(79,124,255,0.08)" }}>
              <div className="kollab-my-profile-hero" style={{ display: "flex", gap: 32 }}>
                <AvatarPlaceholder size={160} radius={20} label={displayName.charAt(0).toUpperCase()} avatarUrl={profile?.avatar_url} />

                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <h1 style={{ fontWeight: 800, color: appColors.navy, fontSize: 36, letterSpacing: -0.9, margin: 0 }}>{displayName}</h1>
                    <div style={{ color: appColors.primary, fontWeight: 600, fontSize: 16, marginTop: 6 }}>{handle}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                      {tags.length > 0 ? (
                        tags.map((tag) => {
                          const style = NICHE_STYLES[tag];
                          return (
                            <span
                              key={tag}
                              style={{
                                background: style?.bg || appColors.primaryLight,
                                color: style?.color || appColors.primary,
                                fontWeight: 600, fontSize: 12, borderRadius: 9999, padding: "6px 16px",
                              }}
                            >
                              {tag.charAt(0) + tag.slice(1).toLowerCase()}
                            </span>
                          );
                        })
                      ) : (
                        // Muted and italic so an empty state never reads as a
                        // niche the creator actually picked.
                        <span style={{ color: appColors.grayLight, fontSize: 13, fontStyle: "italic" }}>
                          No niches yet — add them in Edit Profile
                        </span>
                      )}
                    </div>
                  </div>

                  <p style={{ color: appColors.gray, fontSize: 16, lineHeight: "26px", margin: 0, maxWidth: 672 }}>{bio || "Add a bio to tell brands about yourself."}</p>

                  <div className="kollab-my-profile-info-grid" style={{ borderTop: `1px solid ${appColors.border}`, paddingTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}><LocationIcon color={appColors.grayLight} /><span style={{ color: appColors.grayLight, fontSize: 14 }}>{location}</span></div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}><GlobeIcon color={appColors.grayLight} /><span style={{ color: appColors.grayLight, fontSize: 14 }}>{PROFILE_EXTRAS.languages}</span></div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}><CalendarIcon color={appColors.grayLight} /><span style={{ color: appColors.grayLight, fontSize: 14 }}>Member since {PROFILE_EXTRAS.memberSince}</span></div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}><ClockIcon color={appColors.primary} /><span style={{ color: appColors.primary, fontSize: 14 }}>{PROFILE_EXTRAS.responseNote}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {profile && (hasAnyStats(profile) || igConnected || tkConnected) && (
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
                  {igRefreshing && <span style={{ color: appColors.grayLight, fontSize: 12 }}>Refreshing from Instagram…</span>}
                  {tkRefreshing && <span style={{ color: appColors.grayLight, fontSize: 12 }}>Refreshing from TikTok…</span>}
                  <VerifiedBadge verified={!!profile.stats_verified} instagramVerified={igConnected} />
                </div>
              )}
              <div className="kollab-my-profile-stats" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
                <StatCard
                  label={tkConnected ? "TIKTOK FOLLOWERS ✓" : "TIKTOK FOLLOWERS"}
                  value={formatCount(profile?.tiktok_followers)}
                  color={tkConnected ? "#16a34a" : appColors.navy}
                />
                <StatCard label="TIKTOK AVG VIEWS" value={formatCount(profile?.tiktok_avg_views)} color={appColors.navy} />
                <StatCard
                  label={igConnected ? "IG FOLLOWERS ✓" : "IG FOLLOWERS"}
                  value={formatCount(profile?.instagram_followers)}
                  color={igConnected ? "#16a34a" : appColors.navy}
                />
                <StatCard label="IG AVG VIEWS" value={formatCount(profile?.instagram_avg_views)} color={appColors.navy} />
                <StatCard label="ENGAGEMENT" value={formatEngagement(profile?.engagement_rate)} color={appColors.primary} />
              </div>

              {/* Connect / connected state. Creator-only: brands have no
                  follower stats to verify. */}
              {role === "creator" && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", background: appColors.bg, border: `1px solid ${appColors.border}`, borderRadius: 14, padding: "14px 16px" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 14 }}>
                      {igConnected ? "Instagram connected" : "Connect Instagram"}
                    </div>
                    <div style={{ color: appColors.grayLight, fontSize: 12, marginTop: 2 }}>
                      {igConnected
                        ? `Your follower count is pulled straight from Instagram${profile?.instagram_connected_at ? ` — linked ${new Date(profile.instagram_connected_at).toLocaleDateString()}` : ""}.`
                        : "Verify your real follower count automatically instead of reporting it yourself."}
                    </div>
                    {igError && <div style={{ color: "#ba1a1a", fontSize: 12, fontWeight: 600, marginTop: 6 }}>{igError}</div>}
                    {!igConnected && !isInstagramConfigured() && (
                      // Better to say so than to send someone to an Instagram
                      // login page that rejects them after they've typed a
                      // password.
                      <div style={{ color: "#b45309", fontSize: 12, fontWeight: 600, marginTop: 6 }}>
                        Instagram connection isn't configured yet — VITE_INSTAGRAM_APP_ID is unset.
                      </div>
                    )}
                  </div>
                  {!igConnected && isInstagramConfigured() && (
                    <button
                      type="button"
                      onClick={() => { window.location.href = buildInstagramOAuthUrl(); }}
                      style={{
                        background: "linear-gradient(45deg, #f9ce34, #ee2a7b, #6228d7)", border: "none", borderRadius: 12,
                        padding: "12px 22px", fontWeight: 700, color: "white", fontSize: 14, cursor: "pointer", whiteSpace: "nowrap",
                      }}
                    >
                      Connect Instagram
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Invitations -- the creator-side mirror of a brand clicking
                "Invite to Campaign" (see ManageCampaigns.jsx / CreatorProfile.jsx). */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontWeight: 700, color: appColors.navy, fontSize: 24, letterSpacing: -0.24, margin: 0 }}>Invitations</h3>
                <span style={{ color: appColors.grayLight, fontSize: 13 }}>{invitations.length} pending</span>
              </div>
              {respondError && <div style={{ color: "#ba1a1a", fontSize: 13, fontWeight: 600 }}>{respondError}</div>}
              {dataLoading ? (
                <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: 32, textAlign: "center", color: appColors.grayLight, fontSize: 14 }}>
                  Loading invitations…
                </div>
              ) : invitations.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {invitations.map((invite) => (
                    <InvitationCard key={invite.id} invite={invite} onRespond={handleRespond} busy={respondingId === invite.id} />
                  ))}
                </div>
              ) : (
                <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: 32, textAlign: "center", color: appColors.grayLight, fontSize: 14 }}>
                  No pending invitations right now.
                </div>
              )}
            </div>

            {/* Applications -- campaigns this creator applied to via Campaigns
                Browse (see CampaignsBrowse.jsx). */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <h3 style={{ fontWeight: 700, color: appColors.navy, fontSize: 24, letterSpacing: -0.24, margin: 0 }}>My Applications</h3>
              <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, overflow: "hidden" }}>
                <div className="kollab-scroll-row" style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", minWidth: 500, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: appColors.primaryLighter, borderBottom: `1px solid ${appColors.border}` }}>
                      {["BRAND", "CAMPAIGN", "APPLIED ON", "STATUS"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "16px 24px", color: appColors.grayLight, fontSize: 12, fontWeight: 700, letterSpacing: 0.24 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataLoading ? (
                      <tr>
                        <td colSpan={4} style={{ padding: "24px", textAlign: "center", color: appColors.grayLight, fontSize: 14 }}>Loading applications…</td>
                      </tr>
                    ) : applications.length > 0 ? (
                      applications.map((app) => (
                        <tr key={app.id} style={{ borderBottom: `1px solid ${appColors.border}` }}>
                          <td style={{ padding: "18px 24px", fontWeight: 700, color: appColors.navy, fontSize: 14 }}>{app.brand}</td>
                          <td style={{ padding: "18px 24px", color: appColors.gray, fontSize: 14 }}>{app.campaign}</td>
                          <td style={{ padding: "18px 24px", color: appColors.grayLight, fontSize: 13 }}>{app.appliedOn}</td>
                          <td style={{ padding: "18px 24px" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: app.statusColor, fontWeight: 700, fontSize: 13 }}>
                              <span style={{ width: 8, height: 8, borderRadius: 9999, background: app.dotColor }} />
                              {app.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ padding: "24px", textAlign: "center", color: appColors.grayLight, fontSize: 14 }}>You haven't applied to any campaigns yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </div>

            <div className="kollab-my-profile-insights-row" style={{ display: "flex", gap: 24 }}>
              <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: 25, flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <h3 style={{ fontWeight: 700, color: appColors.navy, fontSize: 24, letterSpacing: -0.24, margin: 0 }}>Audience Insights</h3>
                  <span style={{ background: appColors.primaryLighter, color: appColors.primary, fontWeight: 700, fontSize: 11, borderRadius: 9999, padding: "4px 10px", letterSpacing: 0.4, textTransform: "uppercase" }}>
                    Coming soon
                  </span>
                </div>
                {/* Age distribution and top locations were hardcoded sample
                    figures. Instagram can supply them via audience insights,
                    but that needs a wider permission set and app review, so
                    they are out of scope for the MVP. An empty state is better
                    than numbers that look real and are not. */}
                <p style={{ color: appColors.gray, fontSize: 14, lineHeight: "22px", margin: 0 }}>
                  Age breakdown and top locations for your audience will appear here once
                  audience analytics are switched on.
                </p>
                <p style={{ color: appColors.grayLight, fontSize: 13, margin: 0 }}>
                  Not part of the current release — your follower stats opposite are unaffected.
                </p>
              </div>

              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                <PlatformCard
                  name="Instagram"
                  handle={igConnected ? "Connected account" : "Not connected"}
                  bg="linear-gradient(45deg, #f9ce34, #ee2a7b, #6228d7)"
                  followers={formatCount(profile?.instagram_followers)}
                  avgViews={formatCount(profile?.instagram_avg_views)}
                  verified={igConnected}
                  action={
                    igConnected ? (
                      <button
                        type="button"
                        onClick={disconnectInstagram}
                        disabled={igDisconnecting}
                        style={{
                          background: "none", border: `1px solid ${appColors.border}`, borderRadius: 10,
                          padding: "9px 0", fontWeight: 600, color: appColors.gray, fontSize: 13,
                          cursor: igDisconnecting ? "default" : "pointer", opacity: igDisconnecting ? 0.6 : 1,
                        }}
                      >
                        {igDisconnecting ? "Disconnecting…" : "Disconnect Instagram"}
                      </button>
                    ) : isInstagramConfigured() ? (
                      <button
                        type="button"
                        onClick={() => { window.location.href = buildInstagramOAuthUrl(); }}
                        style={{
                          background: "linear-gradient(45deg, #f9ce34, #ee2a7b, #6228d7)", border: "none",
                          borderRadius: 10, padding: "10px 0", fontWeight: 700, color: "white", fontSize: 13, cursor: "pointer",
                        }}
                      >
                        Connect Instagram for verified stats
                      </button>
                    ) : null
                  }
                />

                {/* Only the follower count can be verified. tiktok_avg_views
                    stays self-reported: user.info.stats returns total likes and
                    video count, not per-video views, so an average can't be
                    derived from it honestly. */}
                <PlatformCard
                  name="TikTok"
                  handle={tkConnected ? "Connected account" : "Self-reported"}
                  bg={appColors.navy}
                  followers={formatCount(profile?.tiktok_followers)}
                  avgViews={formatCount(profile?.tiktok_avg_views)}
                  verified={tkConnected}
                  action={
                    <>
                    {tkError && (
                      <div style={{ color: "#ba1a1a", fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{tkError}</div>
                    )}
                    {tkConnected ? (
                      <button
                        type="button"
                        onClick={disconnectTikTok}
                        disabled={tkDisconnecting}
                        style={{
                          background: "none", border: `1px solid ${appColors.border}`, borderRadius: 10,
                          padding: "9px 0", fontWeight: 600, color: appColors.gray, fontSize: 13,
                          cursor: tkDisconnecting ? "default" : "pointer", opacity: tkDisconnecting ? 0.6 : 1,
                        }}
                      >
                        {tkDisconnecting ? "Disconnecting…" : "Disconnect TikTok"}
                      </button>
                    ) : isTikTokConfigured() ? (
                      <button
                        type="button"
                        onClick={() => { window.location.href = buildTikTokOAuthUrl(); }}
                        style={{
                          background: appColors.navy, border: "none", borderRadius: 10,
                          padding: "10px 0", fontWeight: 700, color: "white", fontSize: 13, cursor: "pointer",
                        }}
                      >
                        Connect TikTok for verified stats
                      </button>
                    ) : (
                      // Better to say so than to send someone to a TikTok login
                      // that fails on a missing client key.
                      <p style={{ color: appColors.grayLight, fontSize: 12, margin: 0, textAlign: "center" }}>
                        TikTok connection isn't configured yet — VITE_TIKTOK_CLIENT_KEY is unset.
                      </p>
                    )}
                    </>
                  }
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <h3 style={{ fontWeight: 700, color: appColors.navy, fontSize: 24, letterSpacing: -0.24, margin: 0 }}>Recent Collaborations</h3>
              {dataLoading ? (
                <div style={{ background: appColors.bg, border: `1px dashed ${appColors.border}`, borderRadius: 16, padding: 24, textAlign: "center", color: appColors.grayLight, fontSize: 14 }}>
                  Loading collaborations…
                </div>
              ) : collaborations.length === 0 ? (
                <div style={{ background: appColors.bg, border: `1px dashed ${appColors.border}`, borderRadius: 16, padding: 24, textAlign: "center", color: appColors.grayLight, fontSize: 14 }}>
                  No collaborations yet. Campaigns you're accepted onto will appear here.
                </div>
              ) : (
                <div className="kollab-scroll-row" style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
                  {collaborations.map((c) => (
                    <div key={c.id} style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: 21, display: "flex", gap: 16, alignItems: "center", minWidth: 280, flexShrink: 0 }}>
                      <div style={{ background: "#d3e4fe", borderRadius: 12, width: 56, height: 56, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: appColors.primary, fontSize: 20 }}>
                        {c.brand.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 16 }}>{c.brand}</div>
                        <div style={{ color: appColors.grayLight, fontSize: 12 }}>{c.campaign}</div>
                        {/* Reach used to sit here. Kollab measures none, so the
                            date is what can honestly be shown instead. */}
                        <div style={{ color: appColors.gray, fontSize: 12, marginTop: 8 }}>{c.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <h3 style={{ fontWeight: 700, color: appColors.navy, fontSize: 24, letterSpacing: -0.24, margin: 0 }}>Content Portfolio</h3>
              <div style={{ background: appColors.bg, border: `1px dashed ${appColors.border}`, borderRadius: 16, padding: 32, textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 15 }}>Content portfolio is coming soon</div>
                <div style={{ color: appColors.grayLight, fontSize: 13, lineHeight: "20px" }}>
                  You'll be able to showcase your best posts here so brands can see
                  your work without leaving Kollab. Not part of the current release.
                </div>
              </div>
            </div>
          </div>

          {/* Right column -- sticky action card */}
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

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(true)}
                  style={{ background: appColors.primary, border: "none", borderRadius: 16, padding: "16px 0", fontWeight: 700, color: "white", fontSize: 16, cursor: "pointer", display: "flex", gap: 8, alignItems: "center", justifyContent: "center", boxShadow: "0px 10px 15px -3px rgba(21,80,211,0.2), 0px 4px 6px -4px rgba(21,80,211,0.2)" }}
                >
                  <EditIcon color="white" /> Edit Profile
                </button>
                {savedToast && (
                  <div style={{ textAlign: "center", color: "#16a34a", fontSize: 13, fontWeight: 600 }}>Profile saved ✓</div>
                )}
              </div>

              <div style={{ background: appColors.primaryLighter, borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 11 }}>
                <span style={{ color: appColors.grayLight, fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>About My Ideal Campaigns</span>
                <p style={{ color: appColors.gray, fontSize: 14, lineHeight: "23px", margin: 0, fontStyle: "italic" }}>&ldquo;{quickNote}&rdquo;</p>
              </div>

              {respondedLog.length > 0 && (
                <div style={{ borderTop: `1px solid ${appColors.border}`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ color: appColors.grayLight, fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>Recent Activity</span>
                  {respondedLog.slice(-3).reverse().map((r, i) => (
                    <div key={i} style={{ fontSize: 12, color: appColors.gray }}>
                      You <strong style={{ color: r.decision === "accepted" ? "#16a34a" : appColors.grayLight }}>{r.decision}</strong> {r.campaign}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {editModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={closeEditModal} style={{ position: "absolute", inset: 0, background: appColors.navy, opacity: 0.45 }} />
          <div className="kollab-my-profile-edit-modal" style={{ position: "relative", background: "white", borderRadius: 24, width: "100%", maxWidth: 480, padding: 32, display: "flex", flexDirection: "column", gap: 20, boxShadow: "0px 25px 50px -12px rgba(0,0,0,0.25)", maxHeight: "85vh", overflowY: "auto", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 18 }}>Edit Profile</div>
              <button type="button" onClick={closeEditModal} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <CloseIcon />
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="" style={{ width: 72, height: 72, borderRadius: 9999, objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <AvatarPlaceholder size={72} radius={9999} label={displayName.charAt(0).toUpperCase()} avatarUrl={profile?.avatar_url} />
              )}
              <div>
                <input type="file" accept="image/*" ref={avatarInputRef} onChange={handleAvatarChange} style={{ display: "none" }} />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 10, padding: "8px 16px", fontWeight: 600, color: appColors.navy, fontSize: 13, cursor: "pointer" }}
                >
                  Change Photo
                </button>
                {avatarError && <div style={{ color: "#ba1a1a", fontSize: 12, fontWeight: 600, marginTop: 6 }}>{avatarError}</div>}
              </div>
            </div>
            <div>
              <label style={{ color: appColors.gray, fontWeight: 600, fontSize: 13, display: "block", marginBottom: 6 }}>Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                style={{ width: "100%", background: appColors.bg, border: `1px solid ${appColors.border}`, borderRadius: 10, padding: "11px 14px", fontSize: 14, color: appColors.navy, outline: "none", boxSizing: "border-box", resize: "none", fontFamily: "inherit" }}
              />
            </div>
            <div>
              <label style={{ color: appColors.gray, fontWeight: 600, fontSize: 13, display: "block", marginBottom: 2 }}>Niches</label>
              <p style={{ color: appColors.grayLight, fontSize: 12, margin: "0 0 10px 0" }}>
                Pick every niche you create content in — brands filter by these when searching for creators.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {/* Same canonical list campaigns use, so a creator's niches and
                    a campaign's niche are directly comparable. */}
                {Object.keys(NICHE_STYLES).map((n) => {
                  const selected = nicheDraft.includes(n);
                  const style = NICHE_STYLES[n];
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => toggleNiche(n)}
                      aria-pressed={selected}
                      style={{
                        background: selected ? style.bg : "transparent",
                        color: selected ? style.color : appColors.gray,
                        border: `1px solid ${selected ? style.color : appColors.border}`,
                        fontWeight: 600, fontSize: 13, borderRadius: 9999,
                        padding: "7px 16px", cursor: "pointer",
                        transition: "background-color 150ms ease-out, color 150ms ease-out, border-color 150ms ease-out",
                      }}
                    >
                      {n.charAt(0) + n.slice(1).toLowerCase()}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label style={{ color: appColors.gray, fontWeight: 600, fontSize: 13, display: "block", marginBottom: 6 }}>About My Ideal Campaigns</label>
              <textarea
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                rows={3}
                style={{ width: "100%", background: appColors.bg, border: `1px solid ${appColors.border}`, borderRadius: 10, padding: "11px 14px", fontSize: 14, color: appColors.navy, outline: "none", boxSizing: "border-box", resize: "none", fontFamily: "inherit" }}
              />
            </div>
            <div>
              <label style={{ color: appColors.gray, fontWeight: 600, fontSize: 13, display: "block", marginBottom: 2 }}>Your Stats</label>
              <p style={{ color: appColors.grayLight, fontSize: 12, margin: "0 0 10px 0" }}>
                Self-reported -- leave a field blank if you'd rather not share it yet. Changing a number here clears its verified status.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ color: appColors.gray, fontSize: 12, display: "block", marginBottom: 4 }}>TikTok Followers</label>
                  <input
                    type="number" min="0" value={tiktokFollowers} onChange={(e) => setTiktokFollowers(e.target.value)}
                    style={{ width: "100%", background: appColors.bg, border: `1px solid ${appColors.border}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, color: appColors.navy, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ color: appColors.gray, fontSize: 12, display: "block", marginBottom: 4 }}>TikTok Avg. Views</label>
                  <input
                    type="number" min="0" value={tiktokAvgViews} onChange={(e) => setTiktokAvgViews(e.target.value)}
                    style={{ width: "100%", background: appColors.bg, border: `1px solid ${appColors.border}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, color: appColors.navy, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ color: appColors.gray, fontSize: 12, display: "block", marginBottom: 4 }}>Instagram Followers</label>
                  <input
                    type="number" min="0" value={instagramFollowers} onChange={(e) => setInstagramFollowers(e.target.value)}
                    style={{ width: "100%", background: appColors.bg, border: `1px solid ${appColors.border}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, color: appColors.navy, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ color: appColors.gray, fontSize: 12, display: "block", marginBottom: 4 }}>Instagram Avg. Views</label>
                  <input
                    type="number" min="0" value={instagramAvgViews} onChange={(e) => setInstagramAvgViews(e.target.value)}
                    style={{ width: "100%", background: appColors.bg, border: `1px solid ${appColors.border}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, color: appColors.navy, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ color: appColors.gray, fontSize: 12, display: "block", marginBottom: 4 }}>Engagement Rate (%)</label>
                  <input
                    type="number" min="0" max="100" step="0.1" value={engagementRate} onChange={(e) => setEngagementRate(e.target.value)}
                    style={{ width: "100%", background: appColors.bg, border: `1px solid ${appColors.border}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, color: appColors.navy, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>
            </div>
            <button type="button" onClick={handleSaveProfile} disabled={saving} style={{ background: appColors.primary, border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 700, color: "white", fontSize: 14, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}