import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { appColors } from "../components/appColors";
import { useAuth } from "../context/useAuth";
import { supabase } from "../../supabaseClient";
import { readInstagramRedirect, stripTokenFromUrl } from "../../utils/instagramAuth";

// Where Meta sends the creator back after login. The short-lived token arrives
// in the URL fragment; this page's only job is to hand it to the
// instagram-connect Edge Function and get out of the way. Nothing long-lived
// is ever held here.
export default function InstagramCallback() {
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshProfile } = useAuth();

  const [status, setStatus] = useState("working"); // working | choose | page_id | done | error
  const [pageIdInput, setPageIdInput] = useState("");
  const [message, setMessage] = useState("");
  const [pages, setPages] = useState([]);
  const [result, setResult] = useState(null);
  // The token is read once, kept in a ref (never state -- it has no business
  // triggering a render or ending up in a devtools snapshot of component
  // state) and used only for the immediate exchange.
  const tokenRef = useRef(null);
  const startedRef = useRef(false);

  const exchange = async (pageId) => {
    setStatus("working");
    const { data, error } = await supabase.functions.invoke("instagram-connect", {
      body: { action: "connect", access_token: tokenRef.current, page_id: pageId },
    });

    if (error) {
      // Edge Functions surface a non-2xx as FunctionsHttpError with the body
      // tucked inside the response, so dig the real message out rather than
      // showing the generic "non-2xx status code".
      let detail = error.message;
      try {
        const body = await error.context?.json?.();
        if (body?.error) detail = body.error;
      } catch { /* fall back to error.message */ }
      setStatus("error");
      setMessage(detail || "Could not connect your Instagram account.");
      return;
    }
    // Order matters: the "needs more information" replies are checked before
    // the generic error. They previously carried their explanation in a field
    // called `error`, so this handler matched them first and rendered a dead
    // end -- the prompt that was supposed to collect a Page ID never appeared.
    // They now use `message`, and are matched ahead of `error` regardless.
    if (data?.needs_choice) {
      setPages(data.pages || []);
      setStatus("choose");
      return;
    }
    if (data?.needs_page_id) {
      setMessage(data.message || data.error || "");
      setStatus("page_id");
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
  };

  useEffect(() => {
    if (authLoading || startedRef.current) return;
    startedRef.current = true;

    // Wrapped in an async IIFE so the failure branches set state in a promise
    // continuation rather than synchronously in the effect body, which is what
    // react-hooks/set-state-in-effect (correctly) objects to.
    (async () => {
      const { accessToken, error } = readInstagramRedirect();
      stripTokenFromUrl();

      if (error) {
        setStatus("error");
        setMessage(error);
        return;
      }
      if (!accessToken) {
        setStatus("error");
        setMessage("Instagram didn't return an access token. Please try connecting again.");
        return;
      }
      if (!user) {
        setStatus("error");
        setMessage("Your session expired while connecting. Please log in and try again.");
        return;
      }
      tokenRef.current = accessToken;
      await exchange();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const card = {
    background: "white", border: `1px solid ${appColors.border}`, borderRadius: 24,
    padding: 40, maxWidth: 520, width: "100%", boxSizing: "border-box",
    boxShadow: "0px 20px 40px -10px rgba(79,124,255,0.12)",
    display: "flex", flexDirection: "column", gap: 16,
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

        {status === "choose" && (
          <>
            <h1 style={{ fontWeight: 800, color: appColors.navy, fontSize: 22, margin: 0 }}>Which account should we use?</h1>
            <p style={{ color: appColors.gray, fontSize: 14, margin: 0 }}>
              You manage more than one Page with an Instagram account attached. Pick the one for your Kollab profile.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
              {pages.map((p) => (
                <button
                  key={p.page_id}
                  type="button"
                  onClick={() => exchange(p.page_id)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
                    background: "white", border: `1px solid ${appColors.border}`, borderRadius: 14,
                    padding: "14px 16px", cursor: "pointer", textAlign: "left",
                  }}
                >
                  <span>
                    <span style={{ display: "block", fontWeight: 700, color: appColors.navy, fontSize: 14 }}>
                      {p.instagram_username ? `@${p.instagram_username}` : "Instagram account"}
                    </span>
                    <span style={{ display: "block", color: appColors.grayLight, fontSize: 12 }}>{p.page_name}</span>
                  </span>
                  {p.followers_count != null && (
                    <span style={{ color: appColors.gray, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                      {Number(p.followers_count).toLocaleString()} followers
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {status === "page_id" && (
          <>
            <h1 style={{ fontWeight: 800, color: appColors.navy, fontSize: 22, margin: 0 }}>One more detail</h1>
            <p style={{ color: appColors.gray, fontSize: 14, margin: 0 }}>{message}</p>
            <p style={{ color: appColors.grayLight, fontSize: 13, margin: 0 }}>
              Find it in Meta Business Suite → Settings → Accounts → Pages, under your Page name.
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={pageIdInput}
              onChange={(e) => setPageIdInput(e.target.value.replace(/[^0-9]/g, ""))}
              onKeyDown={(e) => { if (e.key === "Enter" && pageIdInput.trim()) exchange(pageIdInput.trim()); }}
              placeholder="e.g. 1207938699080214"
              style={{
                width: "100%", background: appColors.bg, border: `1px solid ${appColors.border}`,
                borderRadius: 10, padding: "12px 14px", fontSize: 14, color: appColors.navy,
                outline: "none", boxSizing: "border-box", colorScheme: "light",
              }}
            />
            <button
              type="button"
              disabled={!pageIdInput.trim()}
              onClick={() => exchange(pageIdInput.trim())}
              style={{
                background: pageIdInput.trim() ? appColors.primary : appColors.border, border: "none",
                borderRadius: 12, padding: "13px 0", fontWeight: 700, color: "white", fontSize: 14,
                cursor: pageIdInput.trim() ? "pointer" : "default",
              }}
            >
              Connect this Page
            </button>
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
            <button
              type="button"
              onClick={() => navigate("/my-profile")}
              style={{ background: appColors.primary, border: "none", borderRadius: 12, padding: "13px 0", fontWeight: 700, color: "white", fontSize: 14, cursor: "pointer" }}
            >
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
            <button
              type="button"
              onClick={() => navigate("/my-profile")}
              style={{ background: appColors.primary, border: "none", borderRadius: 12, padding: "13px 0", fontWeight: 700, color: "white", fontSize: 14, cursor: "pointer" }}
            >
              Back to my profile
            </button>
          </>
        )}
      </div>
    </div>
  );
}
