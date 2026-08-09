import { Link } from "react-router-dom";
import { appColors } from "./appColors";
import AvatarImage from "./AvatarImage";
import NotificationBell from "./NotificationBell";
import { useAuth } from "../context/useAuth";

function SearchGlyph({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth="1.5" />
      <path d="M14.5 14.5l-3-3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SearchBox({ placeholder }) {
  return (
    <div className="kollab-topbar-searchbox" style={{ background: appColors.primaryLighter, borderRadius: 12, width: 384, display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", boxSizing: "border-box" }}>
      <SearchGlyph color={appColors.grayLight} />
      <input
        type="text"
        placeholder={placeholder}
        style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 14, color: appColors.gray, minWidth: 0 }}
      />
    </div>
  );
}

export function Breadcrumb({ text, current }) {
  return (
    <span style={{ color: appColors.gray, fontSize: 16 }}>
      {text} <span style={{ fontWeight: 700, color: appColors.navy }}>{current}</span>
    </span>
  );
}

// left: JSX for the left slot -- pass <SearchBox .../> or <Breadcrumb .../>
export default function AppTopBar({ left }) {
  const { isLoggedIn, role, profile } = useAuth();
  const userName = profile?.name || "Kollab Demo";
  const plan = role === "creator" ? "CREATOR PLAN" : "PREMIUM PLAN";
  const initial = userName.charAt(0).toUpperCase();

  return (
    <header
      className="kollab-topbar"
      style={{
        position: "fixed",
        top: 0,
        left: 256,
        right: 0,
        height: 64,
        background: appColors.bg,
        borderBottom: `1px solid ${appColors.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        boxSizing: "border-box",
        zIndex: 9,
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .kollab-topbar {
            left: 0 !important;
            padding-left: 72px !important;
            padding-right: 16px !important;
          }
          .kollab-topbar-searchbox {
            display: none !important;
          }
          .kollab-topbar-profile-text {
            display: none !important;
          }
          .kollab-topbar-left {
            overflow: hidden !important;
            white-space: nowrap !important;
            text-overflow: ellipsis !important;
            max-width: 45vw !important;
          }
          .kollab-topbar-auth {
            flex-shrink: 0 !important;
          }
          .kollab-topbar-auth a {
            white-space: nowrap !important;
          }
        }
      `}</style>

      <div className="kollab-topbar-left">{left}</div>

      {isLoggedIn ? (
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <NotificationBell iconColor={appColors.gray} badgeRingColor={appColors.bg} />
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ background: "#dce1ff", borderRadius: 9999, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
              <AvatarImage url={profile?.avatar_url} size="100%" radius={9999} fallback={<span style={{ fontWeight: 700, color: appColors.primary, fontSize: 14 }}>{initial}</span>} />
            </div>
            <div className="kollab-topbar-profile-text" style={{ textAlign: "right" }}>
              <div style={{ color: appColors.navy, fontSize: 14, fontWeight: 500 }}>{userName}</div>
              <div style={{ color: appColors.grayLight, fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase" }}>{plan}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="kollab-topbar-auth" style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link to="/login" style={{ fontWeight: 600, color: appColors.gray, fontSize: 14, textDecoration: "none" }}>Login</Link>
          <Link
            to="/signup"
            style={{ background: appColors.primary, borderRadius: 9999, padding: "10px 24px", fontWeight: 600, color: "white", fontSize: 14, textDecoration: "none" }}
          >
            Sign Up
          </Link>
        </div>
      )}
    </header>
  );
}
