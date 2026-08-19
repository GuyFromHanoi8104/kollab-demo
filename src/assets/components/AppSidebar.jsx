import { useState } from "react";
import { Link } from "react-router-dom";
import KollabLogo from "./KollabLogo";
import { appColors } from "./appColors";
import FeedbackModal from "./FeedbackModal";
import { useAuth } from "../context/useAuth";

function GridIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="1" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.5" />
      <rect x="10" y="1" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.5" />
      <rect x="1" y="10" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.5" />
      <rect x="10" y="10" width="7" height="7" rx="1.5" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}
function SearchIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.5" />
      <path d="M16 16l-3.5-3.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function MegaphoneIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 7v4h3l6 3V4L5 7H2Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M13 6.5c1 .8 1 4.2 0 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function BookmarkIcon({ color }) {
  return (
    <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
      <path d="M1 1h12v16l-6-4-6 4V1Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function MessageIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M1 2h16v11H6l-5 4V2Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function AnalyticsIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 16V9M9 16V2M16 16v-6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function SettingsIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="3" stroke={color} strokeWidth="1.5" />
      <path d="M9 1v2M9 15v2M17 9h-2M3 9H1M14.5 3.5l-1.4 1.4M4.9 13.1l-1.4 1.4M14.5 14.5l-1.4-1.4M4.9 4.9L3.5 3.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function UserIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="6" r="3.5" stroke={color} strokeWidth="1.5" />
      <path d="M2.5 16c1-3.5 4-5 6.5-5s5.5 1.5 6.5 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function HamburgerIcon() {
  return (
    <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
      <path d="M1 1h18M1 8h18M1 15h18" stroke={appColors.navy} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 2l14 14M16 2L2 16" stroke={appColors.navy} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function FeedbackIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M1 2h16v11H6l-5 4V2Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M5 6.5h8M5 9.5h5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const BRAND_NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", to: "/dashboard", Icon: GridIcon },
  { key: "discover", label: "Discover Creators", to: "/discover", Icon: SearchIcon },
  { key: "campaigns", label: "Campaigns", to: "/manage-campaigns", Icon: MegaphoneIcon },
  { key: "saved", label: "Saved Creators", to: "/saved", Icon: BookmarkIcon },
  { key: "messages", label: "Messages", to: "/messages", Icon: MessageIcon },
];

// NOTE: no "Saved Brands" page exists yet, so it's intentionally left out of
// this nav rather than linking somewhere that doesn't fit. Worth adding
// later, mirroring Saved Creators.
const CREATOR_NAV_ITEMS = [
  { key: "profile", label: "My Profile", to: "/my-profile", Icon: UserIcon },
  { key: "discover", label: "Discover Creators", to: "/discover", Icon: SearchIcon },
  { key: "discover-brands", label: "Discover Brands", to: "/discover-brands", Icon: SearchIcon },
  { key: "campaigns", label: "Campaigns", to: "/campaigns", Icon: MegaphoneIcon },
  { key: "messages", label: "Messages", to: "/messages", Icon: MessageIcon },
];

function NavLink({ to, label, Icon, active, onNavigate }) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        padding: "12px 16px",
        borderRadius: 8,
        background: active ? appColors.primaryLight : "transparent",
        textDecoration: "none",
        width: "100%",
      }}
    >
      <Icon color={active ? appColors.primary : appColors.gray} />
      <span style={{ fontWeight: active ? 600 : 400, color: active ? appColors.primary : appColors.gray, fontSize: 16 }}>
        {label}
      </span>
    </Link>
  );
}

// activeItem depends on role -- brand: "dashboard"|"discover"|"campaigns"|"saved"|"messages"|"settings"
// creator: "profile"|"discover"|"discover-brands"|"campaigns"|"messages"|"settings"
// role: defaults to the real logged-in account's role; pass explicitly only
// to override (MyProfile always wants the creator nav regardless of account).
export default function AppSidebar({ activeItem, role }) {
  const { role: authRole } = useAuth();
  const resolvedRole = role ?? authRole;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const NAV_ITEMS = resolvedRole === "creator" ? CREATOR_NAV_ITEMS : BRAND_NAV_ITEMS;
  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <style>{`
        .kollab-sidebar-toggle {
          display: none;
        }
        .kollab-sidebar-backdrop {
          display: none;
        }
        @media (max-width: 768px) {
          .kollab-sidebar {
            transform: translateX(-100%);
            transition: transform 250ms ease-out;
            box-shadow: 0px 0px 40px rgba(0,0,0,0.15);
          }
          .kollab-sidebar.kollab-sidebar-open {
            transform: translateX(0);
          }
          .kollab-sidebar-toggle {
            display: flex !important;
          }
          .kollab-sidebar-backdrop.kollab-sidebar-backdrop-open {
            display: block;
          }
        }
      `}</style>

      {/* Hamburger toggle -- only rendered visible via CSS on mobile, since
          it's positioned fixed and needs to sit above the page content
          regardless of which page renders this component. */}
      <button
        type="button"
        className="kollab-sidebar-toggle"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        style={{
          position: "fixed", top: 16, left: 16, zIndex: 30,
          background: "white", border: `1px solid ${appColors.border}`, borderRadius: 12,
          width: 44, height: 44, alignItems: "center", justifyContent: "center", cursor: "pointer",
          boxShadow: "0px 4px 6px -1px rgba(0,0,0,0.1)",
        }}
      >
        {mobileOpen ? <CloseIcon /> : <HamburgerIcon />}
      </button>

      {/* Backdrop -- tapping it closes the drawer, same pattern as every
          other modal in the app. */}
      <div
        className={`kollab-sidebar-backdrop ${mobileOpen ? "kollab-sidebar-backdrop-open" : ""}`}
        onClick={closeMobile}
        style={{ position: "fixed", inset: 0, background: "rgba(11,28,48,0.4)", zIndex: 19 }}
      />

      <aside
        className={`kollab-sidebar ${mobileOpen ? "kollab-sidebar-open" : ""}`}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          height: "100vh",
          width: 256,
          background: "white",
          borderRight: `1px solid ${appColors.border}`,
          display: "flex",
          flexDirection: "column",
          padding: "16px 17px 16px 16px",
          boxSizing: "border-box",
          zIndex: 20,
        }}
      >
        <Link to="/" onClick={closeMobile} style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 16px", marginBottom: 24, textDecoration: "none" }}>
          <KollabLogo size={40} />
          <span style={{ fontWeight: 800, color: "#191c1e", fontSize: 24, letterSpacing: -0.6 }}>Kollab</span>
        </Link>

        <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, overflowY: "auto" }}>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.key} to={item.to} label={item.label} Icon={item.Icon} active={activeItem === item.key} onNavigate={closeMobile} />
          ))}

          <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", marginTop: 12, opacity: 0.5 }}>
            <AnalyticsIcon color={appColors.gray} />
            <span style={{ color: appColors.gray, fontSize: 16 }}>Analytics </span>
            <span style={{ color: appColors.gray, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>Coming</span>
          </div>
        </nav>

        <div style={{ borderTop: `1px solid ${appColors.border}`, paddingTop: 17, display: "flex", flexDirection: "column", gap: 8 }}>
          <NavLink to="/settings" label="Settings" Icon={SettingsIcon} active={activeItem === "settings"} onNavigate={closeMobile} />

          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", borderRadius: 8, background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left" }}
          >
            <FeedbackIcon color={appColors.gray} />
            <span style={{ fontWeight: 400, color: appColors.gray, fontSize: 16 }}>Feedback</span>
          </button>

          {/* The PRO PLAN usage meter lived here -- "750 of 1000 searches
              used" over a 75%-filled bar. There are no plans, no quotas and no
              search metering, so every part of it was invented. Removed rather
              than relabelled: a usage meter has nothing honest to show until
              there is usage to measure. */}
        </div>
      </aside>

      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </>
  );
}