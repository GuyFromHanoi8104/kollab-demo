import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { appColors } from "../components/appColors";
import { useAuth } from "../context/useAuth";
import { supabase } from "../../supabaseClient";
import {
  TIKTOK_REDIRECT_URI,
  consumeStoredState,
  readTikTokRedirect,
  stripCodeFromUrl,
} from "../../utils/tiktokAuth";

// Where TikTok sends the creator back. It arrives with a single-use
// authorization code on the query string; this page hands it to the
// tiktok-connect Edge Function, which alone holds the client secret needed to
// turn it into tokens. Nothing sensitive is ever held here.
//
// The one addition over InstagramCallback is the state check. TikTok requires
// `state` on the authorize call, and it earns its keep: without verifying it,
// someone could send a creator a crafted callback link that completes the OAuth
// dance and binds the ATTACKER's TikTok account to the victim's Kollab profile
// -- handing them a "verified" follower count they don't own. A mismatch here
// aborts before the code is ever exchanged.
export default function TikTokCallback() {
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshProfile } = useAuth();

  const [status, setStatus] = useState("working"); // working | done | error
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (authLoading || startedRef.current) return;
    startedRef.current = true;

    (async () => {
      const { code, state, error } = readTikTokRedirect();
      const expectedState = consumeStoredState();
      // The code is single-use; clearing it avoids a confusing "already used"
      // failure if the page is refreshed.
      stripCodeFromUrl();

      if (error) {
        setStatus("error");
        setMessage(error);
        return;
      }
      // Checked before anything else is done with the code. A missing stored
      // state is treated as failure, not waved through -- it means either a
      // crafted link or storage the browser wouldn't let us use.
      if (!expectedState || !state || state !== expectedState) {
        setStatus("error");
        setMessage(
          "This connection link couldn't be verified, so it was stopped. " +
            "Please start again from your profile rather than reusing an old link.",
        );
        return;
      }
      if (!code) {
        setStatus("error");
        setMessage("TikTok didn't return an authorization code. Please try connecting again.");
        return;
      }
      if (!user) {
        setStatus("error");
        setMessage("Your session expired while connecting. Please log in and try again.");
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke("tiktok-connect", {
        // The same redirect_uri the code was issued against -- TikTok rejects
        // the exchange if they differ.
        body: { action: "connect", code, redirect_uri: TIKTOK_REDIRECT_URI },
      });

      if (fnError) {
        // Edge Functions surface a non-2xx as FunctionsHttpError with the real
        // body tucked inside, so dig out the message rather than showing the
        // generic "non-2xx status code".
        let detail = fnError.message;
        try {
          const errBody = await fnError.context?.json?.();
          if (errBody?.error) detail = errBody.error;
        } catch { /* fall back to fnError.message */ }
        setStatus("error");
        setMessage(detail || "Could not connect your TikTok account.");
        return;
      }
      if (data?.error) {
        setStatus("error");
        setMessage(data.error);
        return;
      }

      setResult(data);
      setStatus("done");
      await refreshProfile();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const card = {
    background: "white", border: `1px solid ${appColors.border}`, borderRadius: 24,
    padding: 40, maxWidth: 520, width: "100%", boxSizing: "border-box",
    boxShadow: "0px 20px 40px -10px rgba(79,124,255,0.12)",
    display: "flex", flexDirection: "column", gap: 16,
  };
  const primaryButton = {
    background: appColors.primary, border: "none", borderRadius: 12,
    padding: "13px 0", fontWeight: 700, color: "white", fontSize: 14, cursor: "pointer",
  };

  return (
    <div style={{ minHeight: "100vh", background: appColors.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={card}>
        {status === "working" && (
          <>
            <h1 style={{ fontWeight: 800, color: appColors.navy, fontSize: 22, margin: 0 }}>Connecting TikTok…</h1>
            <p style={{ color: appColors.gray, fontSize: 14, margin: 0 }}>
              Verifying your account with TikTok. This takes a few seconds.
            </p>
          </>
        )}

        {status === "done" && (
          <>
            <h1 style={{ fontWeight: 800, color: appColors.navy, fontSize: 22, margin: 0 }}>TikTok connected ✓</h1>
            <p style={{ color: appColors.gray, fontSize: 14, margin: 0 }}>
              {result?.tiktok_display_name ? `${result.tiktok_display_name} is now linked. ` : ""}
              {result?.follower_count != null
                ? `Your verified follower count is ${Number(result.follower_count).toLocaleString()}.`
                : "Your follower count will appear on your profile shortly."}
            </p>
            <button type="button" onClick={() => navigate("/my-profile")} style={primaryButton}>
              Back to my profile
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <h1 style={{ fontWeight: 800, color: appColors.navy, fontSize: 22, margin: 0 }}>Couldn't connect TikTok</h1>
            <p style={{ color: "#ba1a1a", fontSize: 14, fontWeight: 600, margin: 0 }}>{message}</p>
            <p style={{ color: appColors.grayLight, fontSize: 13, margin: 0 }}>
              Your existing profile and self-reported stats are unchanged.
            </p>
            <button type="button" onClick={() => navigate("/my-profile")} style={primaryButton}>
              Back to my profile
            </button>
          </>
        )}
      </div>
    </div>
  );
}
