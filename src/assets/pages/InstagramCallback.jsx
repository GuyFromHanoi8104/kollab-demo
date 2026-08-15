import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { appColors } from "../components/appColors";
import { useAuth } from "../context/useAuth";
import { supabase } from "../../supabaseClient";
import {
  INSTAGRAM_REDIRECT_URI,
  readInstagramRedirect,
  stripCodeFromUrl,
} from "../../utils/instagramAuth";

// Where Instagram sends the creator back. It arrives with a single-use
// authorization code on the query string; this page hands it to the
// instagram-connect Edge Function, which alone holds the app secret needed to
// turn it into a token. Nothing sensitive is ever held here.
//
// Simpler than the previous Facebook version: there is no Page chooser and no
// Page-ID prompt, because Instagram Login has no Pages to disambiguate.
export default function InstagramCallback() {
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshProfile } = useAuth();

  const [status, setStatus] = useState("working"); // working | done | error
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (authLoading || startedRef.current) return;
    startedRef.current = true;

    // Async IIFE so the failure branches set state in a promise continuation
    // rather than synchronously in the effect body.
    (async () => {
      const { code, error } = readInstagramRedirect();
      // The code is single-use and expires in an hour; clearing it avoids a
      // confusing "already used" failure if the page is refreshed.
      stripCodeFromUrl();

      if (error) {
        setStatus("error");
        setMessage(error);
        return;
      }
      if (!code) {
        setStatus("error");
        setMessage("Instagram didn't return an authorization code. Please try connecting again.");
        return;
      }
      if (!user) {
        setStatus("error");
        setMessage("Your session expired while connecting. Please log in and try again.");
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke("instagram-connect", {
        // The same redirect_uri the code was issued against -- Instagram
        // rejects the exchange if they differ.
        body: { action: "connect", code, redirect_uri: INSTAGRAM_REDIRECT_URI },
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
        setMessage(detail || "Could not connect your Instagram account.");
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
            <h1 style={{ fontWeight: 800, color: appColors.navy, fontSize: 22, margin: 0 }}>Connecting Instagram…</h1>
            <p style={{ color: appColors.gray, fontSize: 14, margin: 0 }}>
              Verifying your account with Instagram. This takes a few seconds.
            </p>
          </>
        )}

        {status === "done" && (
          <>
            <h1 style={{ fontWeight: 800, color: appColors.navy, fontSize: 22, margin: 0 }}>Instagram connected ✓</h1>
            <p style={{ color: appColors.gray, fontSize: 14, margin: 0 }}>
              {result?.instagram_username ? `@${result.instagram_username} is now linked. ` : ""}
              {result?.followers_count != null
                ? `Your verified follower count is ${Number(result.followers_count).toLocaleString()}.`
                : "Your follower count will appear on your profile shortly."}
            </p>
            <button type="button" onClick={() => navigate("/my-profile")} style={primaryButton}>
              Back to my profile
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <h1 style={{ fontWeight: 800, color: appColors.navy, fontSize: 22, margin: 0 }}>Couldn't connect Instagram</h1>
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
