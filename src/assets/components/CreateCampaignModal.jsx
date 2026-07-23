import { useState } from "react";
import { appColors } from "./appColors";
import { NICHE_STYLES } from "./nicheStyles";

const PLATFORMS = ["TikTok", "Instagram", "YouTube"];

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 2l14 14M16 2L2 16" stroke={appColors.gray} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const fieldStyle = {
  width: "100%",
  background: "white",
  border: `1px solid ${appColors.border}`,
  borderRadius: 12,
  padding: "12px 16px",
  fontSize: 14,
  color: appColors.navy,
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};
const labelStyle = { fontWeight: 700, color: appColors.gray, fontSize: 12, letterSpacing: 0.24, display: "block", marginBottom: 6 };

export default function CreateCampaignModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [niche, setNiche] = useState("FITNESS");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [platforms, setPlatforms] = useState([]);
  const [deadline, setDeadline] = useState("");
  const [brief, setBrief] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const togglePlatform = (p) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  // Hands the raw form values to the parent, which does the real Supabase
  // insert (it owns brand_id and the default "draft" status) and reports
  // back { error }. Only closes once that insert actually succeeds.
  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Give your campaign a name to continue.");
      return;
    }
    if (!budgetMin || !budgetMax) {
      setError("Add a budget range so creators know what to expect.");
      return;
    }

    setError("");
    setSubmitting(true);
    const { error: createError } = await onCreate({
      name: name.trim(),
      niche,
      budgetMin: Number(budgetMin),
      budgetMax: Number(budgetMax),
      platforms,
      deadline: deadline || null,
      brief: brief.trim() || null,
    });
    setSubmitting(false);
    if (createError) {
      setError(createError.message || "Couldn't create the campaign. Try again.");
      return;
    }
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{`
        @media (max-width: 768px) {
          .kollab-create-campaign-modal {
            padding: 20px !important;
          }
          .kollab-create-campaign-actions {
            flex-direction: column-reverse !important;
          }
          .kollab-create-campaign-actions button {
            width: 100% !important;
          }
        }
      `}</style>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: appColors.navy, opacity: 0.45 }} />
      <div
        className="kollab-create-campaign-modal"
        style={{
          position: "relative", background: "white", borderRadius: 24, width: "100%", maxWidth: 520,
          maxHeight: "90vh", overflowY: "auto", padding: 32, display: "flex", flexDirection: "column", gap: 20,
          boxShadow: "0px 25px 50px -12px rgba(0,0,0,0.25)", boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 20 }}>Create Campaign</div>
            <p style={{ color: appColors.gray, fontSize: 13, margin: "4px 0 0 0" }}>Starts as a Draft — you can publish it once you're ready.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <CloseIcon />
          </button>
        </div>

        <div>
          <label style={labelStyle}>Campaign Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer Skincare Bundle" style={fieldStyle} />
        </div>

        <div>
          <label style={labelStyle}>Niche</label>
          <select value={niche} onChange={(e) => setNiche(e.target.value)} style={fieldStyle}>
            {Object.keys(NICHE_STYLES).map((n) => (
              <option key={n} value={n}>{n.charAt(0) + n.slice(1).toLowerCase()}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Budget Min ($)</label>
            <input type="number" min="0" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} placeholder="500" style={fieldStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Budget Max ($)</label>
            <input type="number" min="0" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} placeholder="2000" style={fieldStyle} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Platforms</label>
          <div style={{ display: "flex", gap: 8 }}>
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 13,
                  border: `1px solid ${platforms.includes(p) ? appColors.primary : appColors.border}`,
                  background: platforms.includes(p) ? appColors.primaryLighter : "white",
                  color: platforms.includes(p) ? appColors.primary : appColors.gray,
                  transition: "background-color 200ms ease-out, border-color 200ms ease-out, color 200ms ease-out",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Application Deadline</label>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={fieldStyle} />
        </div>

        <div>
          <label style={labelStyle}>Brief <span style={{ fontWeight: 400, textTransform: "none" }}>(Optional)</span></label>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="What should creators know about this campaign?"
            rows={3}
            style={{ ...fieldStyle, resize: "none" }}
          />
        </div>

        {error && <div style={{ color: "#ba1a1a", fontSize: 13, fontWeight: 600 }}>{error}</div>}

        <div className="kollab-create-campaign-actions" style={{ display: "flex", gap: 12, justifyContent: "flex-end", borderTop: `1px solid ${appColors.border}`, paddingTop: 20 }}>
          <button type="button" onClick={onClose} disabled={submitting} style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 12, padding: "12px 24px", fontWeight: 600, color: appColors.gray, fontSize: 14, cursor: submitting ? "not-allowed" : "pointer" }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={submitting}
            style={{ background: appColors.primary, border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 700, color: "white", fontSize: 14, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? "Creating…" : "Create Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}