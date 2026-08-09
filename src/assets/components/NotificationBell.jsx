import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { appColors } from "./appColors";
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

const DROPDOWN_MAX_WIDTH = 340;

// Shared by AppTopBar.jsx (app shell) and MarketingNavBar.jsx (Landing
// Page, Login, Sign Up, Campaigns Browse) -- both render the same real
// bell/dropdown rather than each having their own (one still-decorative)
// copy. The dropdown panel itself always uses appColors (like
// FeedbackModal.jsx's existing precedent for a shared floating overlay);
// iconColor/badgeRingColor are the two things that need to match whichever
// inline nav palette the bell sits in.
export default function NotificationBell({ iconColor = appColors.gray, badgeRingColor = appColors.bg }) {
  const { user } = useAuth();
  const navigate = useNavigate();

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
    // is computed from real screen coordinates -- immune to whichever nav
    // bar's own position/overflow context it's triggered from, and clamped
    // so it never runs off either edge on a narrow (mobile) viewport.
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
    <>
      <button
        type="button"
        ref={bellRef}
        onClick={toggleNotifDropdown}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        style={{ position: "relative", display: "flex", alignItems: "center", background: "none", border: "none", padding: 0, cursor: "pointer" }}
      >
        <BellIcon color={iconColor} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute", top: -6, right: -8, minWidth: 16, height: 16, borderRadius: 9999,
              background: "#ba1a1a", color: "white", fontSize: 10, fontWeight: 700, lineHeight: "16px",
              textAlign: "center", padding: "0 3px", boxSizing: "border-box", boxShadow: `0 0 0 2px ${badgeRingColor}`,
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

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
    </>
  );
}
