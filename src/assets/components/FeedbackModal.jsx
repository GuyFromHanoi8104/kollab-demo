import { useState } from "react";
import { useLocation } from "react-router-dom";
import { appColors } from "./appColors";
import { useAuth } from "../context/useAuth";
import { supabase } from "../../supabaseClient";

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 2l14 14M16 2L2 16" stroke={appColors.gray} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// Shared by both the app-shell trigger (AppSidebar) and the marketing-site
// trigger (MarketingNavBar) -- same write path either way: feedback is
// readable by no one through the app (Table Editor only), writable by
// anyone including guests, so user_id is just whatever the current session
// happens to be, null included.
export default function FeedbackModal({ onClose }) {
  const { user } = useAuth();
  const location = useLocation();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const text = message.trim();
    if (!text) return;
    setSubmitting(true);
    setError("");
    const { error: insertError } = await supabase.from("feedback").insert({
      user_id: user?.id ?? null,
      message: text,
      page_url: location.pathname,
    });
    setSubmitting(false);
    if (insertError) {
      setError("Couldn't send your feedback. Please try again.");
      return;
    }
    setSubmitted(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: appColors.navy, opacity: 0.45 }} />
      <div style={{ position: "relative", background: "white", borderRadius: 24, width: "100%", maxWidth: 440, padding: 32, display: "flex", flexDirection: "column", gap: 20, boxShadow: "0px 25px 50px -12px rgba(0,0,0,0.25)", boxSizing: "border-box" }}>
        {submitted ? (
          <div style={{ padding: "24px 0", textAlign: "center" }}>
            <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 18 }}>Thanks for the feedback ✓</div>
            <p style={{ color: appColors.gray, fontSize: 14, marginTop: 8, margin: "8px 0 0 0" }}>We read every message.</p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 18 }}>Send Feedback</div>
              <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <CloseIcon />
              </button>
            </div>
            <p style={{ color: appColors.gray, fontSize: 13, margin: 0 }}>Tell us what's working, what's not, or what you'd like to see.</p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Your feedback..."
              autoFocus
              style={{ width: "100%", background: appColors.bg, border: `1px solid ${appColors.border}`, borderRadius: 10, padding: "11px 14px", fontSize: 14, color: appColors.navy, outline: "none", boxSizing: "border-box", resize: "none", fontFamily: "inherit" }}
            />
            {error && <div style={{ color: "#ba1a1a", fontSize: 13, fontWeight: 600 }}>{error}</div>}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !message.trim()}
              style={{
                background: appColors.primary, border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 700, color: "white", fontSize: 14,
                cursor: submitting || !message.trim() ? "not-allowed" : "pointer", opacity: submitting || !message.trim() ? 0.6 : 1,
              }}
            >
              {submitting ? "Sending…" : "Send Feedback"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
