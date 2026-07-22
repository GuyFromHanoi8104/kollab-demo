import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppSidebar from "../components/AppSidebar";
import AppTopBar, { Breadcrumb } from "../components/AppTopBar";
import { appColors } from "../components/appColors";
import UpgradeModal from "../components/UpgradeModal";

const MOCK_INVOICES = [
  { date: "Jul 1, 2026", amount: "$49.00", status: "Paid" },
  { date: "Jun 1, 2026", amount: "$49.00", status: "Paid" },
  { date: "May 1, 2026", amount: "$49.00", status: "Paid" },
];

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 2l14 14M16 2L2 16" stroke={appColors.gray} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function CheckCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="8" fill="#16a34a" />
      <path d="M4.5 8.2l2.2 2.2 4.5-4.4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const fieldStyle = {
  width: "100%", background: appColors.bg, border: `1px solid ${appColors.border}`, borderRadius: 10,
  padding: "11px 14px", fontSize: 14, color: appColors.navy, outline: "none", boxSizing: "border-box",
};

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      style={{
        width: 44, height: 24, borderRadius: 9999, border: "none", cursor: "pointer", padding: 2,
        background: checked ? appColors.primary : appColors.border,
        transition: "background-color 150ms ease-out", flexShrink: 0, display: "flex", alignItems: "center",
        justifyContent: checked ? "flex-end" : "flex-start",
      }}
    >
      <span style={{ width: 20, height: 20, borderRadius: 9999, background: "white", boxShadow: "0px 1px 2px rgba(0,0,0,0.2)" }} />
    </button>
  );
}

function SettingsCard({ title, description, children }) {
  return (
    <div style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 16, boxShadow: "0px 10px 40px -10px rgba(21,80,211,0.08)", padding: 33, display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontWeight: 700, color: appColors.navy, fontSize: 18, margin: 0 }}>{title}</h2>
        {description && <p style={{ color: appColors.grayLight, fontSize: 14, margin: "4px 0 0 0" }}>{description}</p>}
      </div>
      {children}
    </div>
  );
}

function TextField({ label, value, onChange, type = "text" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 200 }}>
      <label style={{ color: appColors.gray, fontWeight: 600, fontSize: 13 }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={fieldStyle} />
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
      <div>
        <div style={{ fontWeight: 600, color: appColors.navy, fontSize: 14 }}>{label}</div>
        <div style={{ color: appColors.grayLight, fontSize: 13 }}>{description}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function ModalShell({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: appColors.navy, opacity: 0.45 }} />
      <div className="kollab-settings-modal" style={{ position: "relative", background: "white", borderRadius: 24, width: "100%", maxWidth: 440, padding: 32, display: "flex", flexDirection: "column", gap: 20, boxShadow: "0px 25px 50px -12px rgba(0,0,0,0.25)", maxHeight: "90vh", overflowY: "auto", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 18 }}>{title}</div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ChangePasswordModal({ onClose }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = () => {
    if (!current || !next || !confirm) {
      setError("Fill in all three fields.");
      return;
    }
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New password and confirmation don't match.");
      return;
    }
    setError("");
    setSuccess(true);
    setTimeout(onClose, 1200);
  };

  if (success) {
    return (
      <ModalShell title="Change Password" onClose={onClose}>
        <div style={{ padding: "16px 0", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><CheckCircleIcon /></div>
          <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 16 }}>Password updated</div>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell title="Change Password" onClose={onClose}>
      <TextField label="Current Password" value={current} onChange={setCurrent} type="password" />
      <TextField label="New Password" value={next} onChange={setNext} type="password" />
      <TextField label="Confirm New Password" value={confirm} onChange={setConfirm} type="password" />
      {error && <div style={{ color: "#ba1a1a", fontSize: 13, fontWeight: 600 }}>{error}</div>}
      <button type="button" onClick={handleSubmit} style={{ background: appColors.primary, border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 700, color: "white", fontSize: 14, cursor: "pointer" }}>
        Update Password
      </button>
    </ModalShell>
  );
}

function BillingModal({ onClose }) {
  return (
    <ModalShell title="Billing & Invoices" onClose={onClose}>
      <div>
        <div style={{ fontWeight: 700, color: appColors.gray, fontSize: 12, letterSpacing: 0.24, marginBottom: 8 }}>PAYMENT METHOD</div>
        <div style={{ background: appColors.bg, border: `1px solid ${appColors.border}`, borderRadius: 10, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, color: appColors.navy }}>Visa •••• 4242</span>
          <span style={{ fontSize: 12, color: appColors.grayLight }}>Expires 08/28</span>
        </div>
      </div>
      <div>
        <div style={{ fontWeight: 700, color: appColors.gray, fontSize: 12, letterSpacing: 0.24, marginBottom: 8 }}>INVOICE HISTORY</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {MOCK_INVOICES.map((inv) => (
            <div key={inv.date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${appColors.border}` }}>
              <span style={{ fontSize: 14, color: appColors.navy }}>{inv.date}</span>
              <span style={{ fontSize: 14, color: appColors.gray }}>{inv.amount}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>{inv.status}</span>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}

function DeleteAccountModal({ onClose, onConfirmed }) {
  const [confirmText, setConfirmText] = useState("");
  const canDelete = confirmText === "DELETE";

  return (
    <ModalShell title="Delete Account" onClose={onClose}>
      <p style={{ color: appColors.gray, fontSize: 14, lineHeight: "22px", margin: 0 }}>
        This permanently deletes your account, campaigns, and message history. This can't be undone.
      </p>
      <div>
        <label style={{ color: appColors.gray, fontWeight: 600, fontSize: 13, display: "block", marginBottom: 6 }}>
          Type <strong>DELETE</strong> to confirm
        </label>
        <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} style={fieldStyle} />
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button type="button" onClick={onClose} style={{ flex: 1, background: "white", border: `1px solid ${appColors.border}`, borderRadius: 12, padding: "12px 0", fontWeight: 600, color: appColors.gray, fontSize: 14, cursor: "pointer" }}>
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirmed}
          disabled={!canDelete}
          style={{
            flex: 1, background: canDelete ? "#ba1a1a" : appColors.border, border: "none", borderRadius: 12, padding: "12px 0",
            fontWeight: 700, color: "white", fontSize: 14, cursor: canDelete ? "pointer" : "not-allowed",
          }}
        >
          Delete Account
        </button>
      </div>
    </ModalShell>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const [role, setRole] = useState("brand");
  useEffect(() => {
    setRole(sessionStorage.getItem("kollab_mock_role") || "brand");
  }, []);

  // Dummy pre-filled account fields -- editable locally, nothing persists
  // past this session. NOTE: still shows brand-oriented defaults (Company
  // Name, brand website) regardless of role -- a real creator settings form
  // would look different. Known gap, separate from this fix.
  const [name, setName] = useState("Kollab Demo");
  const [email, setEmail] = useState("demo@kollabdemo.vn");
  const [company, setCompany] = useState("Kollab Demo");
  const [website, setWebsite] = useState("www.kollabdemo.vn");

  const [notifications, setNotifications] = useState({
    newApplications: true,
    campaignUpdates: true,
    weeklyDigest: false,
    marketingEmails: false,
  });
  const toggleNotification = (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [twoFactor, setTwoFactor] = useState(false);

  const handleLogout = () => {
    sessionStorage.removeItem("kollab_mock_logged_in");
    navigate("/");
  };

  const handleSaveChanges = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const handleAccountDeleted = () => {
    setDeleteModalOpen(false);
    sessionStorage.removeItem("kollab_mock_logged_in");
    sessionStorage.removeItem("kollab_mock_role");
    navigate("/");
  };

  return (
    <div
      className="kollab-settings"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: appColors.bg, minHeight: "100vh", textAlign: "left" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { margin: 0; background: white; }
        #root { max-width: none; margin: 0; padding: 0; width: 100%; }
        .kollab-settings, .kollab-settings *, .kollab-settings *::before, .kollab-settings *::after {
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .kollab-settings-main {
            margin-left: 0 !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
            padding-top: 80px !important;
          }
          .kollab-settings-modal {
            padding: 20px !important;
          }
        }
      `}</style>

      <AppSidebar activeItem="settings" role={role} />
      <AppTopBar
        left={<Breadcrumb text="Workspace /" current="Settings" />}
        userName={role === "creator" ? "Mai Tran" : "Kollab Demo"}
        plan={role === "creator" ? "CREATOR PLAN" : "PREMIUM PLAN"}
      />

      <main className="kollab-settings-main" style={{ marginLeft: 256, paddingTop: 96, paddingBottom: 64, paddingLeft: 32, paddingRight: 32, maxWidth: 800 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
          <h1 style={{ fontWeight: 600, color: appColors.navy, fontSize: 36, letterSpacing: -0.72, margin: 0 }}>Settings</h1>
          <p style={{ color: appColors.grayLight, fontSize: 16, margin: 0 }}>Manage your account, notifications, and preferences.</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <SettingsCard title="Account" description="Update your brand's basic information.">
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <TextField label="Full Name" value={name} onChange={setName} />
              <TextField label="Email Address" value={email} onChange={setEmail} type="email" />
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <TextField label="Company Name" value={company} onChange={setCompany} />
              <TextField label="Website" value={website} onChange={setWebsite} />
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button type="button" onClick={handleSaveChanges} style={{ background: appColors.primary, border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 700, color: "white", fontSize: 14, cursor: "pointer" }}>
                Save Changes
              </button>
              {savedToast && (
                <span style={{ display: "flex", gap: 6, alignItems: "center", color: "#16a34a", fontSize: 13, fontWeight: 600 }}>
                  <CheckCircleIcon /> Saved
                </span>
              )}
            </div>
          </SettingsCard>

          <SettingsCard title="Notifications" description="Choose what you want to be notified about.">
            <ToggleRow label="New Applications" description="Get notified when a creator applies to your campaign" checked={notifications.newApplications} onChange={() => toggleNotification("newApplications")} />
            <ToggleRow label="Campaign Updates" description="Status changes on your active campaigns" checked={notifications.campaignUpdates} onChange={() => toggleNotification("campaignUpdates")} />
            <ToggleRow label="Weekly Digest" description="A summary of your account activity every Monday" checked={notifications.weeklyDigest} onChange={() => toggleNotification("weeklyDigest")} />
            <ToggleRow label="Marketing Emails" description="Product news, tips, and promotions from Kollab" checked={notifications.marketingEmails} onChange={() => toggleNotification("marketingEmails")} />
          </SettingsCard>

          <SettingsCard title="Security">
            <ToggleRow label="Two-Factor Authentication" description="Add an extra layer of security to your account" checked={twoFactor} onChange={() => setTwoFactor((v) => !v)} />
            <button type="button" onClick={() => setPasswordModalOpen(true)} style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 12, padding: "12px 24px", fontWeight: 700, color: appColors.navy, fontSize: 14, cursor: "pointer", alignSelf: "flex-start" }}>
              Change Password
            </button>
          </SettingsCard>

          <SettingsCard title="Plan & Billing">
            <div style={{ background: appColors.primaryLighter, borderRadius: 12, padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 16 }}>Pro Plan</div>
                <div style={{ color: appColors.grayLight, fontSize: 13 }}>750 of 1,000 searches used this month</div>
              </div>
              <button type="button" onClick={() => setUpgradeModalOpen(true)} style={{ background: appColors.primary, border: "none", borderRadius: 12, padding: "10px 20px", fontWeight: 700, color: "white", fontSize: 14, cursor: "pointer" }}>
                Upgrade Plan
              </button>
            </div>
            <button type="button" onClick={() => setBillingModalOpen(true)} style={{ background: "none", border: "none", color: appColors.primary, fontWeight: 700, fontSize: 14, cursor: "pointer", padding: 0, textAlign: "left" }}>
              Manage Billing & Invoices
            </button>
          </SettingsCard>

          <SettingsCard title="Session">
            <button type="button" onClick={handleLogout} style={{ background: "white", border: `1px solid ${appColors.border}`, borderRadius: 12, padding: "14px 24px", fontWeight: 700, color: "#ba1a1a", fontSize: 14, cursor: "pointer", alignSelf: "flex-start" }}>
              Log Out
            </button>
          </SettingsCard>

          <SettingsCard title="Danger Zone">
            <button type="button" onClick={() => setDeleteModalOpen(true)} style={{ background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 24px", fontWeight: 700, color: "#ba1a1a", fontSize: 14, cursor: "pointer", alignSelf: "flex-start" }}>
              Delete Account
            </button>
          </SettingsCard>
        </div>
      </main>

      {upgradeModalOpen && <UpgradeModal onClose={() => setUpgradeModalOpen(false)} />}
      {passwordModalOpen && <ChangePasswordModal onClose={() => setPasswordModalOpen(false)} />}
      {billingModalOpen && <BillingModal onClose={() => setBillingModalOpen(false)} />}
      {deleteModalOpen && <DeleteAccountModal onClose={() => setDeleteModalOpen(false)} onConfirmed={handleAccountDeleted} />}
    </div>
  );
}