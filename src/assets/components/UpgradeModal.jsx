import { useState } from "react";
import { appColors } from "./appColors";

const FEATURES = [
  "AI-powered creator & brand recommendations",
  "Unlimited searches (currently 1,000/month)",
  "Advanced filters (engagement rate, price range)",
  "Priority application review",
  "Dedicated support",
];

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="8" fill={appColors.primary} />
      <path d="M4.5 8.2l2.2 2.2 4.5-4.4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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

export default function UpgradeModal({ onClose }) {
  const [upgraded, setUpgraded] = useState(false);

  const handleUpgrade = () => {
    setUpgraded(true);
    setTimeout(onClose, 1400);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{`
        @media (max-width: 768px) {
          .kollab-upgrade-modal {
            padding: 20px !important;
          }
        }
      `}</style>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: appColors.navy, opacity: 0.45 }} />
      <div className="kollab-upgrade-modal" style={{ position: "relative", background: "white", borderRadius: 24, width: "100%", maxWidth: 440, padding: 32, display: "flex", flexDirection: "column", gap: 20, boxShadow: "0px 25px 50px -12px rgba(0,0,0,0.25)" }}>
        {upgraded ? (
          <div style={{ padding: "24px 0", textAlign: "center" }}>
            <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 20 }}>You're all set! 🎉</div>
            <p style={{ color: appColors.gray, fontSize: 14, marginTop: 8 }}>Premium features are now unlocked on your account.</p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 20 }}>Upgrade to Premium</div>
                <p style={{ color: appColors.gray, fontSize: 13, margin: "4px 0 0 0" }}>Unlock AI-powered matching and more.</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <CloseIcon />
              </button>
            </div>

            <div style={{ background: appColors.primaryLighter, borderRadius: 16, padding: 20, display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontWeight: 800, color: appColors.navy, fontSize: 32 }}>$49</span>
              <span style={{ color: appColors.grayLight, fontSize: 14 }}>/ month</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {FEATURES.map((f) => (
                <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ flexShrink: 0, marginTop: 2 }}><CheckIcon /></div>
                  <span style={{ color: appColors.gray, fontSize: 14, lineHeight: "20px" }}>{f}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button type="button" onClick={onClose} style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 12, padding: "12px 24px", fontWeight: 600, color: appColors.gray, fontSize: 14, cursor: "pointer" }}>
                Not now
              </button>
              <button type="button" onClick={handleUpgrade} style={{ flex: 1, background: appColors.primary, border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 700, color: "white", fontSize: 14, cursor: "pointer" }}>
                Upgrade Now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}