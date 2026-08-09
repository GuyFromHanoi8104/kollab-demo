import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import KollabLogo from "../components/KollabLogo";
import TransactionalHeader from "../components/TransactionalHeader";
import { setRememberMe, supabase } from "../../supabaseClient";

const colors = {
  navy: "#191c1e",
  gray: "#434655",
  blue: "#2563eb",
  blueDark: "#004ac6",
};

// Role-specific subtext shown above the Creator/Brand cards, pulled from
// Figma. NOTE: the "Brand" copy in Figma ("Find creators. tiny changes.
// huge usability improvements") reads like a leftover AI-placeholder string,
// not real copy — I've kept it as a starting point but you'll probably want
// to replace it with something intentional.
const ROLE_SUBTEXT = {
  none: "how will you use kollab?",
  creator: "apply to campaigns. connect with brands",
  brand: "Find creators. tiny changes. huge usability improvements",
};

const RESEND_COOLDOWN_MS = 60_000;
const resendKey = (email) => `kollab_resend_${email.trim().toLowerCase()}`;

function resendCooldownRemainingMs(email) {
  const last = Number(localStorage.getItem(resendKey(email)) || 0);
  return Math.max(0, RESEND_COOLDOWN_MS - (Date.now() - last));
}
function markResendSent(email) {
  localStorage.setItem(resendKey(email), String(Date.now()));
}

function CreatorIcon({ color }) {
  return (
    <svg width="19" height="18" viewBox="0 0 19 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.5 1.5 17 5 6 16l-4.5 1L2.5 12.5 13.5 1.5Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" style={{ transition: "stroke 200ms ease-out" }} />
    </svg>
  );
}

function BrandIcon({ color }) {
  return (
    <svg width="20" height="19" viewBox="0 0 20 19" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="6" width="16" height="11" rx="1.5" stroke={color} strokeWidth="1.6" style={{ transition: "stroke 200ms ease-out" }} />
      <path d="M7 6V4.5A1.5 1.5 0 0 1 8.5 3h3A1.5 1.5 0 0 1 13 4.5V6" stroke={color} strokeWidth="1.6" style={{ transition: "stroke 200ms ease-out" }} />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.6 10.23c0-.68-.06-1.33-.17-1.96H10v3.71h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.89-1.74 2.99-4.3 2.99-7.27Z" fill="#4285F4" />
      <path d="M10 20c2.7 0 4.96-.9 6.61-2.43l-3.23-2.5c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H1.06v2.59A10 10 0 0 0 10 20Z" fill="#34A853" />
      <path d="M4.41 11.9a5.99 5.99 0 0 1 0-3.8V5.5H1.06a10 10 0 0 0 0 9l3.35-2.6Z" fill="#FBBC05" />
      <path d="M10 3.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.96 9.96 0 0 0 10 0 10 10 0 0 0 1.06 5.5l3.35 2.6C5.2 5.74 7.4 3.98 10 3.98Z" fill="#EA4335" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="18" height="18" rx="5" stroke="#191c1e" strokeWidth="1.6" />
      <circle cx="10" cy="10" r="4.2" stroke="#191c1e" strokeWidth="1.6" />
      <circle cx="15" cy="5" r="1" fill="#191c1e" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13.5 2c.3 1.9 1.5 3.1 3.5 3.3v2.6c-1.2.1-2.4-.3-3.5-1v5.6a4.6 4.6 0 1 1-4.6-4.6c.3 0 .6 0 .9.08v2.7a1.9 1.9 0 1 0 1.4 1.83V2h2.3Z"
        fill="#191c1e"
      />
    </svg>
  );
}

function EyeIcon({ color }) {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 7s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6Z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="2.5" stroke={color} strokeWidth="1.4" />
    </svg>
  );
}

function EyeOffIcon({ color }) {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 7s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6Z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="2.5" stroke={color} strokeWidth="1.4" />
      <path d="M1 1l16 12" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// Toggle button for password visibility -- absolutely positioned inside the
// input's wrapper (which needs position:relative). type="button" so it
// never submits the surrounding form.
function PasswordToggle({ visible, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={visible ? "Hide password" : "Show password"}
      style={{
        position: "absolute",
        right: 14,
        top: "50%",
        transform: "translateY(-50%)",
        background: "none",
        border: "none",
        padding: 0,
        margin: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      {visible ? <EyeOffIcon color={colors.gray} /> : <EyeIcon color={colors.gray} />}
    </button>
  );
}

function RoleCard({ role, label, icon, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(role)}
      aria-pressed={selected}
      style={{
        background: selected ? "rgba(37,99,235,0.1)" : "white",
        border: `1px solid ${selected ? colors.blue : "#c3c6d7"}`,
        borderRadius: 8,
        display: "flex",
        flex: 1,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 17,
        cursor: "pointer",
        gap: 8,
        transition: "background-color 200ms ease-out, border-color 200ms ease-out",
      }}
    >
      <div
        style={{
          background: selected ? colors.blue : "#e6e8ea",
          borderRadius: 9999,
          width: 48,
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background-color 200ms ease-out",
        }}
      >
        {icon(selected ? "white" : colors.navy)}
      </div>
      <span style={{ fontWeight: 600, color: colors.navy, fontSize: 14, letterSpacing: 0.28 }}>{label}</span>
    </button>
  );
}

function SocialButton({ icon, label, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "white",
        border: "1px solid #c3c6d7",
        borderRadius: 8,
        display: "flex",
        gap: 12,
        alignItems: "center",
        justifyContent: "center",
        padding: "13px 25px",
        width: "100%",
        boxSizing: "border-box",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
      <span style={{ fontWeight: 600, color: colors.navy, fontSize: 14, letterSpacing: 0.28 }}>{label}</span>
    </button>
  );
}

function Footer() {
  return (
    <footer style={{ backdropFilter: "blur(6px)", background: "rgba(255,255,255,0.3)", borderTop: "1px solid rgba(195,198,215,0.1)", width: "100%" }}>
      <div className="kollab-signup-footer-inner" style={{ maxWidth: 1600, margin: "0 auto", display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "64px 40px", flexWrap: "wrap", gap: 40, boxSizing: "border-box" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <KollabLogo size={32} />
            <span style={{ fontWeight: 800, color: colors.navy, fontSize: 24 }}>Kollab</span>
          </div>
          <p style={{ color: colors.gray, fontSize: 16, lineHeight: "26px", maxWidth: 384, margin: 0 }}>
            © 2026 Kollab. Powering brand partnerships globally through technology and trust.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function SignUp() {
  const [role, setRole] = useState(null); // null | "creator" | "brand"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const navigate = useNavigate();

  const subtext = role ? ROLE_SUBTEXT[role] : ROLE_SUBTEXT.none;

  // This is the ONE place role gets chosen -- it's passed as signup metadata
  // so the `handle_new_user` DB trigger can read it and populate the
  // `profiles` row. From here on, Login just reads the profile back.
  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!role) return; // submit is disabled until a role is picked, but guard anyway
    setError("");
    setEmailExists(false);

    // There's no "Remember Me" checkbox on this form -- signing up and
    // immediately getting logged out on tab close would be a strange first
    // experience, so this always behaves like it was checked. Also guards
    // against a leftover "unchecked" preference from an earlier login in
    // this same browser applying to an unrelated fresh signup.
    setRememberMe(true);

    // Client-side throttle on resubmitting the same email -- covers both a
    // genuinely-new signup that just succeeded a moment ago, and a retry on
    // a not-yet-confirmed account (which resends via signUp() itself, see
    // below), so neither case can spam outgoing confirmation emails.
    const cooldownMs = resendCooldownRemainingMs(email);
    if (cooldownMs > 0) {
      setError(`Please wait ${Math.ceil(cooldownMs / 1000)}s before trying again.`);
      return;
    }

    setSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role, name } },
    });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    // With email confirmation required, Supabase deliberately returns a
    // success-shaped response (no error, no session) when the email
    // belongs to an existing, ALREADY-CONFIRMED account -- otherwise the
    // response itself would leak which emails have accounts. An empty
    // `identities` array is Supabase's own documented, reliable signal for
    // exactly that case (confirmed: verifiably empty; not yet confirmed or
    // brand new: always non-empty) -- no further disambiguation needed.
    //
    // A retry on an existing but *unconfirmed* account is the other real
    // case: identities is non-empty then, and signUp() itself already
    // resends the confirmation email server-side as part of this same
    // call -- no separate resend() call belongs here, and calling one
    // risked misreading its response and treating a confirmed account as
    // a fresh success (that was the actual bug in the previous version of
    // this fix).
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setEmailExists(true);
      return;
    }
    markResendSent(email);
    // If email confirmation is required, Supabase returns no session yet.
    if (!data.session) {
      setCheckEmail(true);
      return;
    }
    navigate("/");
  };

  return (
    <div
      className="kollab-signup"
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
        body {
          margin: 0;
          background: white;
        }
        #root {
          max-width: none;
          margin: 0;
          padding: 0;
          width: 100%;
        }
        .kollab-signup, .kollab-signup *, .kollab-signup *::before, .kollab-signup *::after {
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .kollab-signup-wrapper {
            padding: 40px 16px !important;
          }
          .kollab-signup-card {
            padding: 24px !important;
          }
          .kollab-signup-heading {
            font-size: 32px !important;
            line-height: 40px !important;
          }
          .kollab-signup-footer-inner {
            padding: 40px 24px !important;
            gap: 32px !important;
          }
        }
      `}</style>

      <TransactionalHeader mode="signup" />

      <div className="kollab-signup-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "80px 24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 32, alignItems: "flex-start", maxWidth: 512, width: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", width: "100%" }}>
            <h1 className="kollab-signup-heading" style={{ fontWeight: 700, color: colors.navy, fontSize: 48, lineHeight: "56px", letterSpacing: -0.48, textAlign: "center", margin: 0 }}>
              Create your account
            </h1>
            <p style={{ color: colors.gray, fontSize: 18, lineHeight: "28px", textAlign: "center", margin: 0 }}>
              Join the next generation of creative partnerships.
            </p>
          </div>

          <div
            className="kollab-signup-card"
            style={{
              background: "rgba(255,255,255,0)",
              border: "1px solid #c3c6d7",
              borderRadius: 12,
              boxShadow: "0px 1px 2px 0px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column",
              gap: 32,
              width: "100%",
              padding: 33,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
              <span style={{ fontWeight: 600, color: colors.gray, fontSize: 14, letterSpacing: 0.7, textTransform: "uppercase" }}>
                {subtext}
              </span>
              <div style={{ display: "flex", gap: 16, width: "100%" }}>
                <RoleCard role="creator" label="Creator" icon={(c) => <CreatorIcon color={c} />} selected={role === "creator"} onSelect={setRole} />
                <RoleCard role="brand" label="Brand" icon={(c) => <BrandIcon color={c} />} selected={role === "brand"} onSelect={setRole} />
              </div>
            </div>

            {checkEmail ? (
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <p style={{ fontWeight: 700, color: colors.navy, fontSize: 16, margin: "0 0 8px 0" }}>Check your email</p>
                <p style={{ color: colors.gray, fontSize: 14, lineHeight: "22px", margin: 0 }}>
                  We sent a confirmation link to <strong>{email}</strong>. Confirm your address to finish creating your account.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                  <label style={{ color: colors.gray, fontWeight: 600, fontSize: 13 }}>Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: "100%", background: "white", border: "1px solid #c3c6d7", borderRadius: 8, padding: "11px 14px", fontSize: 14, color: colors.navy, outline: "none", boxSizing: "border-box", colorScheme: "light" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                  <label style={{ color: colors.gray, fontWeight: 600, fontSize: 13 }}>Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: "100%", background: "white", border: "1px solid #c3c6d7", borderRadius: 8, padding: "11px 14px", fontSize: 14, color: colors.navy, outline: "none", boxSizing: "border-box", colorScheme: "light" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                  <label style={{ color: colors.gray, fontWeight: 600, fontSize: 13 }}>Password</label>
                  <div style={{ position: "relative", width: "100%" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ width: "100%", background: "white", border: "1px solid #c3c6d7", borderRadius: 8, padding: "11px 44px 11px 14px", fontSize: 14, color: colors.navy, outline: "none", boxSizing: "border-box", colorScheme: "light" }}
                    />
                    <PasswordToggle visible={showPassword} onClick={() => setShowPassword((v) => !v)} />
                  </div>
                </div>

                <div style={{ display: "flex", width: "100%" }}>
                  <input
                    type="checkbox"
                    required
                    style={{ width: 16, height: 16, marginTop: 2, borderRadius: 4, border: "1px solid #c3c6d7", accentColor: colors.blue, flexShrink: 0 }}
                  />
                  <p style={{ color: colors.gray, fontSize: 12, lineHeight: "16px", margin: 0, paddingLeft: 12 }}>
                    By continuing, you agree to our{" "}
                    <a href="/terms" style={{ color: colors.blueDark, textDecoration: "none" }}>Terms of Service</a>{" "}
                    and <a href="/privacy" style={{ color: colors.blueDark, textDecoration: "none" }}>Privacy Policy</a>.
                  </p>
                </div>

                {emailExists && (
                  <div style={{ color: "#ba1a1a", fontSize: 13, fontWeight: 600 }}>
                    An account with this email already exists. <Link to="/login" style={{ color: colors.blueDark, textDecoration: "underline" }}>Log in instead</Link>
                  </div>
                )}
                {error && <div style={{ color: "#ba1a1a", fontSize: 13, fontWeight: 600 }}>{error}</div>}

                <button
                  type="submit"
                  disabled={!role || submitting}
                  style={{
                    background: colors.blue,
                    border: "none",
                    borderRadius: 8,
                    padding: "13px 25px",
                    width: "100%",
                    fontWeight: 700,
                    color: "white",
                    fontSize: 14,
                    cursor: !role || submitting ? "not-allowed" : "pointer",
                    opacity: !role || submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? "Creating account…" : "Create Account"}
                </button>

                <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                  <div style={{ flex: 1, height: 1, background: "#e0e3e5" }} />
                  <span style={{ padding: "0 16px", color: "#737686", fontSize: 12, fontWeight: 500 }}>OR</span>
                  <div style={{ flex: 1, height: 1, background: "#e0e3e5" }} />
                </div>

                <SocialButton icon={<GoogleIcon />} label="Continue with Google" />
                <SocialButton icon={<InstagramIcon />} label="Continue with Instagram" />
                <SocialButton icon={<TikTokIcon />} label="Continue with TikTok" />
              </form>
            )}

            <div style={{ borderTop: "1px solid #c3c6d7", width: "100%", paddingTop: 33, textAlign: "center" }}>
              <span style={{ color: colors.gray, fontSize: 16, lineHeight: "24px" }}>Already have an account? </span>
              <Link to="/login" style={{ color: colors.blueDark, fontSize: 16, lineHeight: "24px", fontWeight: 700, textDecoration: "none" }}>
                Log In
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}