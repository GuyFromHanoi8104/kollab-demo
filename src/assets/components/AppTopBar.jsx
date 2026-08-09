import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { appColors } from "./appColors";
import AvatarImage from "./AvatarImage";
import { useAuth } from "../context/useAuth";
import { supabase } from "../../supabaseClient";
import { formatRelativeTime } from "../../utils/relativeTime";

function BellIcon({ color }) {
  return (
    <svg width="16" height="20" viewBox="0 0 16 20" fill="none" style={{ pointerEvents: "none" }}>
      <path d="M8 1c-3 0-5 2.2-5 5.5v3.7L1 13h14l-2-2.8V6.5C13 3.2 11 1 8 1Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6 16a2 2 0 0 0 4 0" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
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

const DROPDOWN_MAX_WIDTH = 340;

// left: JSX for the left slot -- pass <SearchBox .../> or <Breadcrumb .../>
export default function AppTopBar({ left }) {
  const { isLoggedIn, role, profile, user } = useAuth();
  const navigate = useNavigate();
  const userName = profile?.name || "Kollab Demo";
  const plan = role === "creator" ? "CREATOR PLAN" : "PREMIUM PLAN";
  const initial = userName.charAt(0).toUpperCase();

  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifPos, setNotifPos] = useState(null);
  const bellRef = useRef(null);
  const dropdownRef = useRef(null);

  // Notifications are only ever written by DB triggers on a real event
  // (new application, status change, new message) -- this just reads them
  // and marks read, same read-only relationship this app already has with
  // e.g. applications.status. Realtime subscription mirrors the pattern
  // already used for messages in Messages.jsx.
  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotifications([]);
      setNotifLoading(false);
      return;
    }
    let active = true;
    (async () => {
      setNotifLoading(true);
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (!active) return;
      setNotifications(data ?? []);
      setNotifLoading(false);
    })();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) => (prev.some((n) => n.id === payload.new.id) ? prev : [payload.new, ...prev]));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Closes on click-outside (checking both the bell and the portal content,
  // since they're no longer DOM descendants of each other) or on scroll --
  // same reasoning as the campaign row menu in ManageCampaigns.jsx: a
  // rendered backdrop needs a z-index higher than everything on the page,
  // which is exactly the kind of thing that quietly breaks later. This
  // sidesteps stacking order entirely, and the fixed-position snapshot
  // would otherwise drift out of place if the page scrolls while it's open.
  useEffect(() => {
    if (!notifOpen) return;
    const handleClickOutside = (e) => {
      if (
        bellRef.current && !bellRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setNotifOpen(false);
      }
    };
    const handleScroll = () => setNotifOpen(false);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [notifOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const toggleNotifDropdown = (e) => {
    if (notifOpen) {
      setNotifOpen(false);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    // Rendered via a portal at document.body with position:fixed, so this
    // is computed from real screen coordinates -- immune to the AppTopBar
    // header's own position:fixed/overflow context, and clamped so it
    // never runs off either edge on a narrow (mobile) viewport.
    const width = Math.min(DROPDOWN_MAX_WIDTH, window.innerWidth - 16);
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    setNotifPos({ top: rect.bottom + 8, left, width });
    setNotifOpen(true);
  };

  const handleNotificationClick = async (n) => {
    setNotifOpen(false);
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
    }
    if (n.link) navigate(n.link);
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
  };

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
          <button
            type="button"
            ref={bellRef}
            onClick={toggleNotifDropdown}
            aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
            style={{ position: "relative", display: "flex", alignItems: "center", background: "none", border: "none", padding: 0, cursor: "pointer" }}
          >
            <BellIcon color={appColors.gray} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute", top: -6, right: -8, minWidth: 16, height: 16, borderRadius: 9999,
                  background: "#ba1a1a", color: "white", fontSize: 10, fontWeight: 700, lineHeight: "16px",
                  textAlign: "center", padding: "0 3px", boxSizing: "border-box", boxShadow: `0 0 0 2px ${appColors.bg}`,
                }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
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

      {notifOpen && notifPos && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed", top: notifPos.top, left: notifPos.left, width: notifPos.width,
            maxHeight: 420, overflowY: "auto", background: "white", border: `1px solid ${appColors.border}`,
            borderRadius: 16, boxShadow: "0px 10px 25px -5px rgba(0,0,0,0.15)", zIndex: 1000,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: `1px solid ${appColors.border}`, position: "sticky", top: 0, background: "white" }}>
            <span style={{ fontWeight: 700, color: appColors.navy, fontSize: 14 }}>Notifications</span>
            {unreadCount > 0 && (
              <button type="button" onClick={handleMarkAllRead} style={{ background: "none", border: "none", cursor: "pointer", color: appColors.primary, fontWeight: 600, fontSize: 12, padding: 0 }}>
                Mark all as read
              </button>
            )}
          </div>
          {notifLoading ? (
            <div style={{ padding: 24, textAlign: "center", color: appColors.grayLight, fontSize: 13 }}>Loading…</div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: appColors.grayLight, fontSize: 13 }}>No notifications yet</div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleNotificationClick(n)}
                style={{
                  display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                  background: n.read ? "none" : appColors.primaryLighter, border: "none",
                  borderBottom: `1px solid ${appColors.border}`, padding: "12px 16px",
                }}
              >
                <div style={{ fontWeight: n.read ? 500 : 700, color: appColors.navy, fontSize: 13 }}>{n.title}</div>
                {n.body && <div style={{ color: appColors.gray, fontSize: 12, marginTop: 2 }}>{n.body}</div>}
                <div style={{ color: appColors.grayLight, fontSize: 11, marginTop: 4 }}>{formatRelativeTime(n.created_at)}</div>
              </button>
            ))
          )}
        </div>,
        document.body
      )}
    </header>
  );
}
