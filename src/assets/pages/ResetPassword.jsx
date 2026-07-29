import { useState } from "react";
import { useNavigate } from "react-router-dom";
import KollabLogo from "../components/KollabLogo";
import TransactionalHeader from "../components/TransactionalHeader";
import { supabase } from "../../supabaseClient";

const colors = {
  navy: "#191c1e",
  gray: "#434655",
  blue: "#2563eb",
  blueDark: "#004ac6",
};

function Footer() {
  return (
    <footer style={{ background: "#f7f9fb", borderTop: "1px solid #e0e3e5", width: "100%" }}>
      <div style={{ background: "white", borderTop: "1px solid #c3c6d7", width: "100%" }}>
        <div style={{ backdropFilter: "blur(6px)", background: "rgba(255,255,255,0.3)", borderTop: "1px solid rgba(195,198,215,0.1)", width: "100%" }}>
          <div className="kollab-reset-footer-inner" style={{ maxWidth: 1600, margin: "0 auto", display: "flex", alignItems: "flex-start", gap: 24, padding: "64px 40px", boxSizing: "border-box" }}>
            <KollabLogo size={32} />
            <span style={{ fontWeight: 800, color: colors.navy, fontSize: 24 }}>Kollab</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // Supabase's client reads the recovery token out of the URL itself
  // (detectSessionInUrl, on by default) and turns it into a real, if
  // short-lived, session -- updateUser() just needs that session to already
  // exist, no manual token handling here.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSubmitting(false);
      setError(updateError.message || "Couldn't reset your password. The link may have expired -- request a new one.");
      return;
    }
    // Sign out of the temporary recovery session so the user logs back in
    // fresh with the new password, rather than landing on /login while
    // silently already authenticated.
    await supabase.auth.signOut();
    setSubmitting(false);
    navigate("/login", { state: { resetSuccess: true } });
  };

  return (
    <div
      className="kollab-reset"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        textAlign: "left",
        background: "linear-gradient(90deg, rgb(247,249,251) 0%, rgb(247,249,251) 100%)",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { margin: 0; background: white; }
        #root { max-width: none; margin: 0; padding: 0; width: 100%; }
        .kollab-reset, .kollab-reset *, .kollab-reset *::before, .kollab-reset *::after {
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .kollab-reset-wrapper { padding: 40px 16px !important; }
          .kollab-reset-card { padding: 24px !important; }
          .kollab-reset-footer-inner { padding: 40px 24px !important; }
        }
      `}</style>

      <TransactionalHeader mode="signup" />

      <div className="kollab-reset-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", width: "100%", padding: "80px 24px", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute", left: "50%", top: 0, transform: "translateX(-50%)",
            width: 1000, height: 600, borderRadius: 9999, background: "rgba(0,74,198,0.05)", filter: "blur(60px)", pointerEvents: "none",
          }}
        />

        <div
          className="kollab-reset-card"
          style={{
            position: "relative", maxWidth: 448, width: "100%",
            backdropFilter: "blur(6px)", background: "rgba(255,255,255,0.8)",
            border: "1px solid rgba(226,232,240,0.8)", borderRadius: 12,
            boxShadow: "0px 10px 15px -3px rgba(0,0,0,0.1), 0px 4px 6px -4px rgba(0,0,0,0.1)",
            display: "flex", flexDirection: "column", gap: 32, padding: 41,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", width: "100%" }}>
            <h1 style={{ fontWeight: 700, color: colors.navy, fontSize: 32, lineHeight: "40px", letterSpacing: -0.32, textAlign: "center", margin: 0 }}>
              Set a new password
            </h1>
            <p style={{ color: colors.gray, fontSize: 16, lineHeight: "24px", textAlign: "center", margin: 0 }}>
              Choose a new password for your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
              <label style={{ color: colors.gray, fontWeight: 600, fontSize: 13 }}>New Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", background: "white", border: "1px solid #c3c6d7", borderRadius: 8, padding: "11px 14px", fontSize: 14, color: colors.navy, outline: "none", boxSizing: "border-box", colorScheme: "light" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
              <label style={{ color: colors.gray, fontWeight: 600, fontSize: 13 }}>Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: "100%", background: "white", border: "1px solid #c3c6d7", borderRadius: 8, padding: "11px 14px", fontSize: 14, color: colors.navy, outline: "none", boxSizing: "border-box", colorScheme: "light" }}
              />
            </div>

            {error && <div style={{ color: "#ba1a1a", fontSize: 13, fontWeight: 600 }}>{error}</div>}

            <button
              type="submit"
              disabled={submitting}
              style={{
                background: colors.blue, border: "none", borderRadius: 8, padding: "13px 25px", width: "100%",
                fontWeight: 700, color: "white", fontSize: 14,
                cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Resetting…" : "Reset Password"}
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}
