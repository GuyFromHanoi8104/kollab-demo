import { useState } from "react";
import { Link } from "react-router-dom";
import KollabLogo from "./KollabLogo";
import AvatarImage from "./AvatarImage";
import FeedbackModal from "./FeedbackModal";
import NotificationBell from "./NotificationBell";
import { useAuth } from "../context/useAuth";

const colors = {
  navy: "#191c1e",
  gray: "#434655",
  blue: "#2563eb",
  blueDark: "#004ac6",
};

function FeedbackIcon({ color }) {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
      <path d="M1 1h14v9H5l-4 3.5V1Z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

const NAV_LINKS = [
  { key: "explore", label: "Explore", to: "/" },
  { key: "campaigns", label: "Campaigns", to: "/campaigns" },
  { key: "kols", label: "KOLs", to: "/discover" },
];

// activeTab: "explore" | "campaigns" | "kols"
export default function MarketingNavBar({ activeTab }) {
  const { isLoggedIn, role, profile } = useAuth();
  const profileDestination = role === "creator" ? "/my-profile" : "/dashboard";
  const profileName = profile?.name || "Kollab Demo";
  const profileInitial = profileName.charAt(0).toUpperCase();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  return (
    <div
      className="kollab-marketing-nav"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        backdropFilter: "blur(12px)",
        background: "rgba(255,255,255,0.6)",
        borderBottom: "1px solid rgba(195,198,215,0.2)",
        zIndex: 10,
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .kollab-marketing-nav .kollab-nav-inner {
            padding: 16px 20px !important;
          }
          .kollab-marketing-nav .kollab-nav-links {
            display: none !important;
          }
          .kollab-marketing-nav .kollab-nav-profile-text {
            display: none !important;
          }
          .kollab-marketing-nav .kollab-nav-auth {
            gap: 12px !important;
          }
          .kollab-marketing-nav .kollab-nav-right {
            gap: 12px !important;
          }
        }
        @media (max-width: 480px) {
          .kollab-marketing-nav .kollab-nav-inner {
            padding: 14px 16px !important;
          }
          .kollab-marketing-nav .kollab-nav-wordmark {
            font-size: 20px !important;
          }
          .kollab-marketing-nav .kollab-nav-right {
            gap: 8px !important;
          }
          .kollab-marketing-nav .kollab-nav-auth {
            gap: 8px !important;
          }
          .kollab-marketing-nav .kollab-nav-feedback-label {
            display: none !important;
          }
          .kollab-marketing-nav .kollab-nav-signup {
            white-space: nowrap !important;
            padding: 10px 16px !important;
          }
        }
      `}</style>
      <div className="kollab-nav-inner" style={{ maxWidth: 1600, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px" }}>
        <Link to="/" style={{ display: "flex", gap: 12, alignItems: "center", textDecoration: "none" }}>
          <KollabLogo size={36} />
          <span className="kollab-nav-wordmark" style={{ fontWeight: 800, color: colors.navy, fontSize: 24, letterSpacing: -0.6 }}>Kollab</span>
        </Link>
        <nav className="kollab-nav-links" style={{ display: "flex", gap: 40, alignItems: "center" }}>
          {NAV_LINKS.map((link) => {
            const active = link.key === activeTab;
            return (
              <Link
                key={link.key}
                to={link.to}
                style={{
                  borderBottom: active ? `2px solid ${colors.blueDark}` : "none",
                  paddingBottom: active ? 6 : 8,
                  fontWeight: active ? 700 : 600,
                  color: active ? colors.blueDark : colors.gray,
                  fontSize: 14,
                  letterSpacing: 0.28,
                  textDecoration: "none",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="kollab-nav-right" style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            aria-label="Feedback"
            style={{ display: "flex", gap: 6, alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <FeedbackIcon color={colors.gray} />
            <span className="kollab-nav-feedback-label" style={{ fontWeight: 600, color: colors.gray, fontSize: 14, letterSpacing: 0.28 }}>Feedback</span>
          </button>

          {isLoggedIn ? (
          <div className="kollab-nav-auth" style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <NotificationBell iconColor={colors.gray} badgeRingColor="#f8f9ff" />
            <Link to={profileDestination} style={{ display: "flex", gap: 12, alignItems: "center", textDecoration: "none" }}>
              <div style={{ background: "#dce1ff", borderRadius: 9999, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                <AvatarImage url={profile?.avatar_url} size="100%" radius={9999} fallback={<span style={{ fontWeight: 700, color: "#1550d3", fontSize: 14 }}>{profileInitial}</span>} />
              </div>
              <div className="kollab-nav-profile-text" style={{ textAlign: "right" }}>
                <div style={{ color: "#0b1c30", fontSize: 14, fontWeight: 500 }}>{profileName}</div>
                <div style={{ color: "#737686", fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase" }}>{role === "creator" ? "Creator Plan" : "Premium Plan"}</div>
              </div>
            </Link>
          </div>
        ) : (
          <div className="kollab-nav-auth" style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <Link to="/login" style={{ fontWeight: 600, color: colors.gray, fontSize: 14, letterSpacing: 0.28, textDecoration: "none" }}>Login</Link>
            <Link
              to="/signup"
              className="kollab-nav-signup"
              style={{
                background: colors.blue,
                borderRadius: 9999,
                padding: "10px 28px",
                fontWeight: 600,
                color: "white",
                fontSize: 14,
                letterSpacing: 0.28,
                textDecoration: "none",
                boxShadow: "0px 10px 15px -3px rgba(37,99,235,0.2), 0px 4px 6px -4px rgba(37,99,235,0.2)",
              }}
            >
              Sign Up
            </Link>
          </div>
          )}
        </div>
      </div>

      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </div>
  );
}