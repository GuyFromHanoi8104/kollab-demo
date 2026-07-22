import { useState } from "react";
import { appColors } from "./appColors";

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 2l14 14M16 2L2 16" stroke={appColors.gray} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 8l4 4 8-8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Mock applicant messages, keyed by name, since the underlying APPLICATIONS
// data doesn't carry one. Falls back to a generic line for anyone else.
const NOTES = {
  "Hoang Yen": "I'd love to be part of this campaign! My audience really engages with food and lifestyle content, and I think this would be a great fit.",
  "Duc Tran": "Been following your brand for a while and would love to collaborate. Happy to share more of my past tech review work if useful.",
};

export default function ReviewApplicationModal({ applicant, onClose, onDecision }) {
  const [decision, setDecision] = useState(null); // null | "accepted" | "rejected"

  const handleDecision = (choice) => {
    setDecision(choice);
    setTimeout(() => {
      onDecision(applicant.name, choice);
      onClose();
    }, 1000);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{`
        @media (max-width: 768px) {
          .kollab-review-app-modal {
            padding: 20px !important;
          }
        }
      `}</style>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: appColors.navy, opacity: 0.45 }} />
      <div className="kollab-review-app-modal" style={{ position: "relative", background: "white", borderRadius: 24, width: "100%", maxWidth: 460, padding: 32, display: "flex", flexDirection: "column", gap: 20, boxShadow: "0px 25px 50px -12px rgba(0,0,0,0.25)" }}>
        {decision ? (
          <div style={{ padding: "24px 0", textAlign: "center" }}>
            <div
              style={{
                width: 48, height: 48, borderRadius: 9999, margin: "0 auto 12px auto", display: "flex", alignItems: "center", justifyContent: "center",
                background: decision === "accepted" ? "#16a34a" : appColors.grayLight,
              }}
            >
              <CheckIcon />
            </div>
            <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 18 }}>
              {decision === "accepted" ? "Application accepted" : "Application declined"}
            </div>
            <p style={{ color: appColors.gray, fontSize: 14, marginTop: 8 }}>{applicant.name} will be notified.</p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 18 }}>Review Application</div>
              <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <CloseIcon />
              </button>
            </div>

            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: appColors.grayLight, fontSize: 22, flexShrink: 0 }}>
                {applicant.initial}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 18 }}>{applicant.name}</div>
                <div style={{ color: appColors.grayLight, fontSize: 13 }}>{applicant.category}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ background: appColors.primaryLighter, borderRadius: 12, padding: 14, flex: 1, textAlign: "center" }}>
                <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 16 }}>{applicant.followers}</div>
                <div style={{ color: appColors.grayLight, fontSize: 11, textTransform: "uppercase" }}>Followers</div>
              </div>
              <div style={{ background: appColors.primaryLighter, borderRadius: 12, padding: 14, flex: 1, textAlign: "center" }}>
                <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 16 }}>{applicant.following}</div>
                <div style={{ color: appColors.grayLight, fontSize: 11, textTransform: "uppercase" }}>Following</div>
              </div>
              <div style={{ background: appColors.primaryLighter, borderRadius: 12, padding: 14, flex: 1, textAlign: "center" }}>
                <div style={{ fontWeight: 700, color: appColors.primary, fontSize: 16 }}>{applicant.er}</div>
                <div style={{ color: appColors.grayLight, fontSize: 11, textTransform: "uppercase" }}>Engagement</div>
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 700, color: appColors.gray, fontSize: 12, letterSpacing: 0.24, marginBottom: 8 }}>APPLICATION NOTE</div>
              <p style={{ color: appColors.gray, fontSize: 14, lineHeight: "22px", margin: 0, fontStyle: "italic" }}>
                &ldquo;{NOTES[applicant.name] || "Excited about the opportunity to collaborate on this campaign!"}&rdquo;
              </p>
            </div>

            <div style={{ display: "flex", gap: 12, borderTop: `1px solid ${appColors.border}`, paddingTop: 20 }}>
              <button type="button" onClick={() => handleDecision("rejected")} style={{ flex: 1, background: "white", border: `1px solid ${appColors.border}`, borderRadius: 12, padding: "12px 0", fontWeight: 700, color: appColors.gray, fontSize: 14, cursor: "pointer" }}>
                Decline
              </button>
              <button type="button" onClick={() => handleDecision("accepted")} style={{ flex: 1, background: appColors.primary, border: "none", borderRadius: 12, padding: "12px 0", fontWeight: 700, color: "white", fontSize: 14, cursor: "pointer" }}>
                Accept
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}