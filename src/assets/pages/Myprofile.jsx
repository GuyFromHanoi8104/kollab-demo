import { useState } from "react";
import AppSidebar from "../components/AppSidebar";
import AppTopBar, { Breadcrumb } from "../components/AppTopBar";
import { appColors } from "../components/appColors";

// This is the logged-in creator's own demo persona -- distinct from Linh
// Nguyen (the third-party creator brands view on Creator Profile), Bao Tran,
// Minh Review, Thanh Beauty, and Khoa Fitness, so there's no name collision
// with anyone else already in the app.
const PROFILE = {
  name: "Mai Tran",
  handle: "@mai.styles",
  tags: ["Fashion", "Lifestyle"],
  bio: "Fashion and lifestyle creator based in Hanoi, focused on accessible everyday style and city life. Building an engaged community around real, wearable outfits rather than unattainable trends.",
  location: "Hanoi, Vietnam",
  languages: "Vietnamese, English",
  memberSince: "Mar 2026",
  responseNote: "Responds within 4 hours (99% Rate)",
  quickNote: "I prefer fashion and lifestyle campaigns with 3-4 days of lead time, and I love collaborating on styling multiple looks per shoot.",
};

const STATS = [
  { label: "TIKTOK FOLLOWERS", value: "186K", color: appColors.navy },
  { label: "IG FOLLOWERS", value: "94K", color: appColors.navy },
  { label: "ENGAGEMENT", value: "5.9%", color: appColors.primary },
  { label: "AVG VIEWS", value: "310K", color: appColors.navy },
];

const AGE_DISTRIBUTION = [
  { range: "18-24", pct: 38 },
  { range: "25-34", pct: 44 },
];

const TOP_LOCATIONS = ["Hanoi", "Ho Chi Minh City", "Da Nang"];

const PLATFORMS = [
  { name: "TikTok", handle: "@mai.styles", followers: "186K", avgViews: "340K", bg: appColors.navy },
  { name: "Instagram", handle: "@mai.styles_official", followers: "94K", avgViews: "110K", bg: "linear-gradient(45deg, #f9ce34, #ee2a7b, #6228d7)" },
];

const COLLABORATIONS = [
  { brand: "Uniqlo VN", campaign: "Winter Essentials Wardrobe", reach: "640K Reach" },
  { brand: "Shopee Vietnam", campaign: "11.11 Mega Sale Campaign", reach: "980K Reach" },
];

const PORTFOLIO = [
  { views: "310K", comments: "18K" },
  { views: "158K", comments: "7K" },
  { views: "402K", comments: "26K" },
  { views: "220K", comments: "12K" },
];

// Reuses the exact same brand + campaign names as ManageCampaigns.jsx and
// Campaigns Browse, so the demo world feels connected: campaigns a brand
// creates/invites from show up here on the creator side too.
const APPLICATIONS = [
  { brand: "Azure Resorts", campaign: "Luxury Escape Content Creation", appliedOn: "Jul 12, 2026", status: "Pending", statusColor: "#ea580c", dotColor: "#f97316" },
  { brand: "GLOW Skin", campaign: "Glow Morning Routine Reel", appliedOn: "Jul 8, 2026", status: "Accepted", statusColor: "#16a34a", dotColor: "#22c55e" },
  { brand: "Vertex Tech", campaign: "New Gen Gaming Headset Review", appliedOn: "Jul 3, 2026", status: "Declined", statusColor: appColors.grayLight, dotColor: appColors.border },
];

const INITIAL_INVITATIONS = [
  { id: "protein", brand: "Kollab Demo", campaign: "Protein Powder Launch", budget: "$3,000", deadline: "Aug 15, 2026" },
  { id: "skincare", brand: "Kollab Demo", campaign: "Summer Skincare Bundle", budget: "$2,200", deadline: "Aug 30, 2026" },
];

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
function EyeIcon({ color }) {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
      <path d="M1 5s2.2-4 6-4 6 4 6 4-2.2 4-6 4-6-4-6-4Z" stroke={color} strokeWidth="1.1" />
      <circle cx="7" cy="5" r="1.7" stroke={color} strokeWidth="1.1" />
    </svg>
  );
}
function CommentIcon({ color }) {
  return (
    <svg width="12" height="11" viewBox="0 0 12 11" fill="none">
      <path d="M1 1h10v7H4l-3 2.5V1Z" stroke={color} strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg width="18" height="17" viewBox="0 0 18 17" fill="none">
      <path d="M9 0l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1L3.6 16.3l1.3-6L0.3 6.2l6.1-.6L9 0Z" fill="#f5b400" />
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
function EditIcon({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M11 2l3 3-8 8-3.5 1 1-3.5 8-8Z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
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

function AvatarPlaceholder({ size, radius, label }) {
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: "linear-gradient(135deg, #e5eeff, #c7d7ff)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: appColors.primary, fontSize: size / 3, flexShrink: 0 }}>
      {label}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: "25px", display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ color: appColors.grayLight, fontSize: 12, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase" }}>{label}</span>
      <span style={{ color, fontSize: 30, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function InvitationCard({ invite, onRespond }) {
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
        <button type="button" onClick={() => onRespond(invite.id, "declined")} style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 10, padding: "10px 18px", fontWeight: 700, color: appColors.gray, fontSize: 13, cursor: "pointer" }}>
          Decline
        </button>
        <button type="button" onClick={() => onRespond(invite.id, "accepted")} style={{ background: appColors.primary, border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, color: "white", fontSize: 13, cursor: "pointer" }}>
          Accept
        </button>
      </div>
    </div>
  );
}

export default function MyProfile() {
  const [invitations, setInvitations] = useState(INITIAL_INVITATIONS);
  const [respondedLog, setRespondedLog] = useState([]);

  const handleRespond = (id, decision) => {
    const invite = invitations.find((i) => i.id === id);
    setInvitations((prev) => prev.filter((i) => i.id !== id));
    setRespondedLog((prev) => [...prev, { ...invite, decision }]);
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
        .kollab-scroll-row {
          scrollbar-width: thin;
          scrollbar-color: ${appColors.border} transparent;
        }
        .kollab-scroll-row::-webkit-scrollbar { height: 6px; }
        .kollab-scroll-row::-webkit-scrollbar-thumb { background: ${appColors.border}; border-radius: 9999px; }
        .kollab-scroll-row::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <AppSidebar activeItem="profile" role="creator" />
      <AppTopBar left={<Breadcrumb text="Workspace /" current="My Profile" />} userName={PROFILE.name} plan="CREATOR PLAN" />

      <main style={{ marginLeft: 256, paddingTop: 96, paddingBottom: 64, paddingLeft: 32, paddingRight: 32 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, maxWidth: 1280 }}>
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
            <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 24, padding: 33, boxShadow: "0px 20px 40px -10px rgba(79,124,255,0.08)" }}>
              <div style={{ display: "flex", gap: 32 }}>
                <AvatarPlaceholder size={160} radius={20} label="M" />

                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <h1 style={{ fontWeight: 800, color: appColors.navy, fontSize: 36, letterSpacing: -0.9, margin: 0 }}>{PROFILE.name}</h1>
                    <div style={{ color: appColors.primary, fontWeight: 600, fontSize: 16 }}>{PROFILE.handle}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      {PROFILE.tags.map((tag) => (
                        <span key={tag} style={{ background: appColors.primaryLight, color: appColors.primary, fontWeight: 600, fontSize: 12, borderRadius: 9999, padding: "6px 16px" }}>{tag}</span>
                      ))}
                    </div>
                  </div>

                  <p style={{ color: appColors.gray, fontSize: 16, lineHeight: "26px", margin: 0, maxWidth: 672 }}>{PROFILE.bio}</p>

                  <div style={{ borderTop: `1px solid ${appColors.border}`, paddingTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}><LocationIcon color={appColors.grayLight} /><span style={{ color: appColors.grayLight, fontSize: 14 }}>{PROFILE.location}</span></div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}><GlobeIcon color={appColors.grayLight} /><span style={{ color: appColors.grayLight, fontSize: 14 }}>{PROFILE.languages}</span></div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}><CalendarIcon color={appColors.grayLight} /><span style={{ color: appColors.grayLight, fontSize: 14 }}>Member since {PROFILE.memberSince}</span></div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}><ClockIcon color={appColors.primary} /><span style={{ color: appColors.primary, fontSize: 14 }}>{PROFILE.responseNote}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              {STATS.map((stat) => (
                <StatCard key={stat.label} label={stat.label} value={stat.value} color={stat.color} />
              ))}
            </div>

            {/* Invitations -- the creator-side mirror of a brand clicking
                "Invite to Campaign". Reuses the exact same brand/campaign
                names as ManageCampaigns.jsx so the demo world feels
                connected across both personas. */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontWeight: 700, color: appColors.navy, fontSize: 24, letterSpacing: -0.24, margin: 0 }}>Invitations</h3>
                <span style={{ color: appColors.grayLight, fontSize: 13 }}>{invitations.length} pending</span>
              </div>
              {invitations.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {invitations.map((invite) => (
                    <InvitationCard key={invite.id} invite={invite} onRespond={handleRespond} />
                  ))}
                </div>
              ) : (
                <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: 32, textAlign: "center", color: appColors.grayLight, fontSize: 14 }}>
                  No pending invitations right now.
                </div>
              )}
            </div>

            {/* Applications -- campaigns this creator applied to via Campaigns
                Browse. Reuses those exact brand/campaign names too. */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <h3 style={{ fontWeight: 700, color: appColors.navy, fontSize: 24, letterSpacing: -0.24, margin: 0 }}>My Applications</h3>
              <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: appColors.primaryLighter, borderBottom: `1px solid ${appColors.border}` }}>
                      {["BRAND", "CAMPAIGN", "APPLIED ON", "STATUS"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "16px 24px", color: appColors.grayLight, fontSize: 12, fontWeight: 700, letterSpacing: 0.24 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {APPLICATIONS.map((app) => (
                      <tr key={app.campaign} style={{ borderBottom: `1px solid ${appColors.border}` }}>
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: "flex", gap: 24 }}>
              <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: 25, flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 24 }}>
                <h3 style={{ fontWeight: 700, color: appColors.navy, fontSize: 24, letterSpacing: -0.24, margin: 0 }}>Audience Insights</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <span style={{ color: appColors.grayLight, fontSize: 14 }}>Age Distribution</span>
                  {AGE_DISTRIBUTION.map((a) => (
                    <div key={a.range} style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <span style={{ width: 40, color: appColors.grayLight, fontSize: 12 }}>{a.range}</span>
                      <div style={{ flex: 1, background: appColors.primaryLight, height: 16, borderRadius: 9999, overflow: "hidden" }}>
                        <div style={{ background: "rgba(21,80,211,0.7)", height: "100%", width: `${a.pct}%` }} />
                      </div>
                      <span style={{ width: 32, color: appColors.navy, fontWeight: 700, fontSize: 12 }}>{a.pct}%</span>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: `1px solid ${appColors.border}`, paddingTop: 17, display: "flex", flexDirection: "column", gap: 12 }}>
                  <span style={{ color: appColors.grayLight, fontSize: 14 }}>Top Locations</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {TOP_LOCATIONS.map((loc) => (
                      <span key={loc} style={{ background: appColors.bg, border: `1px solid ${appColors.border}`, borderRadius: 9999, padding: "5px 13px", fontSize: 12, color: appColors.navy }}>{loc}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                {PLATFORMS.map((p) => (
                  <div key={p.name} style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: 25, display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={{ background: p.bg, borderRadius: 12, width: 40, height: 40 }} />
                        <div>
                          <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 16 }}>{p.name}</div>
                          <div style={{ color: appColors.grayLight, fontSize: 12 }}>{p.handle}</div>
                        </div>
                      </div>
                      <ArrowRight color={appColors.grayLight} />
                    </div>
                    <div style={{ display: "flex", gap: 16, justifyContent: "space-around" }}>
                      <div>
                        <div style={{ color: appColors.grayLight, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Followers</div>
                        <div style={{ color: appColors.navy, fontWeight: 700, fontSize: 16 }}>{p.followers}</div>
                      </div>
                      <div>
                        <div style={{ color: appColors.grayLight, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Avg Views</div>
                        <div style={{ color: appColors.navy, fontWeight: 700, fontSize: 16 }}>{p.avgViews}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <h3 style={{ fontWeight: 700, color: appColors.navy, fontSize: 24, letterSpacing: -0.24, margin: 0 }}>Recent Collaborations</h3>
              <div className="kollab-scroll-row" style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8 }}>
                {COLLABORATIONS.map((c) => (
                  <div key={c.brand} style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, padding: 21, display: "flex", gap: 16, alignItems: "center", minWidth: 280, flexShrink: 0 }}>
                    <div style={{ background: "#d3e4fe", borderRadius: 12, width: 56, height: 56, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 16 }}>{c.brand}</div>
                      <div style={{ color: appColors.grayLight, fontSize: 12 }}>{c.campaign}</div>
                      <div style={{ color: appColors.primary, fontWeight: 700, fontSize: 12, marginTop: 8 }}>↗ {c.reach}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <h3 style={{ fontWeight: 700, color: appColors.navy, fontSize: 24, letterSpacing: -0.24, margin: 0 }}>Content Portfolio</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                {PORTFOLIO.map((item, i) => (
                  <div key={i} style={{ aspectRatio: "9/16", background: "linear-gradient(135deg, #cbd5e1, #94a3b8)", border: `1px solid ${appColors.border}`, borderRadius: 16, position: "relative", display: "flex", alignItems: "flex-end", padding: 16 }}>
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}><EyeIcon color="white" /><span style={{ color: "white", fontSize: 12 }}>{item.views}</span></div>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}><CommentIcon color="white" /><span style={{ color: "white", fontSize: 12 }}>{item.comments}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column -- sticky action card */}
          <div style={{ minWidth: 0 }}>
            <div style={{ position: "sticky", top: 96, background: "white", border: `1px solid ${appColors.border}`, borderRadius: 24, padding: 25, boxShadow: "0px 20px 40px -10px rgba(79,124,255,0.08)", display: "flex", flexDirection: "column", gap: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ background: "#22c55e", width: 10, height: 10, borderRadius: 9999 }} />
                  <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 14 }}>Available for campaigns</span>
                </div>
                <button type="button" aria-label="Share profile" style={{ background: appColors.bg, border: `1px solid ${appColors.border}`, borderRadius: 9999, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <ShareIcon color={appColors.gray} />
                </button>
              </div>

              <button
                type="button"
                style={{ background: appColors.primary, border: "none", borderRadius: 16, padding: "16px 0", fontWeight: 700, color: "white", fontSize: 16, cursor: "pointer", display: "flex", gap: 8, alignItems: "center", justifyContent: "center", boxShadow: "0px 10px 15px -3px rgba(21,80,211,0.2), 0px 4px 6px -4px rgba(21,80,211,0.2)" }}
              >
                <EditIcon color="white" /> Edit Profile
              </button>

              <div style={{ background: appColors.primaryLighter, borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 11 }}>
                <span style={{ color: appColors.grayLight, fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>About My Ideal Campaigns</span>
                <p style={{ color: appColors.gray, fontSize: 14, lineHeight: "23px", margin: 0, fontStyle: "italic" }}>&ldquo;{PROFILE.quickNote}&rdquo;</p>
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
    </div>
  );
}