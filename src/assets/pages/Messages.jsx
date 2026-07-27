import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import AppSidebar from "../components/AppSidebar";
import AppTopBar, { Breadcrumb } from "../components/AppTopBar";
import { appColors } from "../components/appColors";
import { useAuth } from "../context/useAuth";
import { supabase } from "../../supabaseClient";

function formatMessageTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M1 9l16-8-6 16-3-6-7-2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function BackIcon({ color }) {
  return (
    <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
      <path d="M8 1L1 8l7 7M1 8h18" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Messages() {
  const { user } = useAuth();
  const location = useLocation();
  const preselectedId = location.state?.conversationId ?? null;
  const didInitRef = useRef(false);

  const [conversations, setConversations] = useState([]);
  const [convosLoading, setConvosLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState("");
  const [mobileShowThread, setMobileShowThread] = useState(false);

  // Loads every conversation the current user is a participant in (as either
  // brand or creator), plus enough from `profiles`/`campaigns`/`messages` to
  // render the list -- fetched separately and merged client-side, same
  // pattern as ManageCampaigns' application counts, since PostgREST
  // embedding through two FKs to the same table (brand_id/creator_id both
  // -> profiles) needs relationship hints we can't rely on the names of.
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setConvosLoading(true);
      const { data: convoRows } = await supabase
        .from("conversations")
        .select("*")
        .or(`brand_id.eq.${user.id},creator_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (!active) return;

      const rows = convoRows ?? [];
      const otherIds = [...new Set(rows.map((c) => (c.brand_id === user.id ? c.creator_id : c.brand_id)))];
      const campaignIds = [...new Set(rows.map((c) => c.campaign_id).filter(Boolean))];
      const convoIds = rows.map((c) => c.id);

      const [{ data: profileRows }, { data: campaignRows }, { data: msgRows }] = await Promise.all([
        otherIds.length ? supabase.from("profiles").select("id, name, role").in("id", otherIds) : Promise.resolve({ data: [] }),
        campaignIds.length ? supabase.from("campaigns").select("id, name").in("id", campaignIds) : Promise.resolve({ data: [] }),
        convoIds.length
          ? supabase
              .from("messages")
              .select("conversation_id, sender_id, body, created_at, read_at")
              .in("conversation_id", convoIds)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);
      if (!active) return;

      const profileMap = Object.fromEntries((profileRows ?? []).map((p) => [p.id, p]));
      const campaignMap = Object.fromEntries((campaignRows ?? []).map((c) => [c.id, c]));
      const lastMessageByConvo = {};
      const unreadCounts = {};
      (msgRows ?? []).forEach((m) => {
        if (!lastMessageByConvo[m.conversation_id]) lastMessageByConvo[m.conversation_id] = m;
        if (m.read_at == null && m.sender_id !== user.id) {
          unreadCounts[m.conversation_id] = (unreadCounts[m.conversation_id] || 0) + 1;
        }
      });

      const enriched = rows.map((c) => {
        const otherId = c.brand_id === user.id ? c.creator_id : c.brand_id;
        const lastMessage = lastMessageByConvo[c.id];
        return {
          ...c,
          otherName: profileMap[otherId]?.name || "Unknown",
          campaignName: c.campaign_id ? campaignMap[c.campaign_id]?.name ?? null : null,
          unread: (unreadCounts[c.id] || 0) > 0,
          lastMessage: lastMessage ? { fromMe: lastMessage.sender_id === user.id, text: lastMessage.body, time: formatMessageTime(lastMessage.created_at) } : null,
        };
      });

      setConversations(enriched);
      setConvosLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  // Picks the initial active conversation once: the one passed in from
  // CreatorProfile's "Message" button if there is one (also jumping straight
  // to the thread view on mobile, matching the existing back-button flow),
  // otherwise just the first conversation in the list.
  useEffect(() => {
    if (convosLoading || didInitRef.current) return;
    didInitRef.current = true;
    if (preselectedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveId(preselectedId);
      setMobileShowThread(true);
    } else if (conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, [convosLoading, preselectedId, conversations]);

  // Loads the active thread, marks the other participant's unread messages
  // as read, and subscribes to realtime inserts for this conversation so new
  // messages (sent by either side) show up without a refresh. handleSend
  // deliberately doesn't append locally -- the realtime event covers our own
  // sends too, so appending both places would double them up.
  useEffect(() => {
    if (!activeId || !user) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessagesLoading(true);
    setSendError("");

    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true });
      if (!active) return;
      const rows = data ?? [];
      setMessages(rows);
      setMessagesLoading(false);

      const unreadIds = rows.filter((m) => m.read_at == null && m.sender_id !== user.id).map((m) => m.id);
      if (unreadIds.length > 0) {
        await supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
        if (!active) return;
        setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, unread: false } : c)));
      }
    })();

    const channel = supabase
      .channel(`messages:${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` },
        (payload) => {
          const incoming = payload.new;
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeId
                ? { ...c, lastMessage: { fromMe: incoming.sender_id === user.id, text: incoming.body, time: formatMessageTime(incoming.created_at) } }
                : c
            )
          );
          // The thread is open, so treat an incoming message from the other
          // participant as read immediately rather than leaving it unread
          // until the next time this conversation happens to be re-opened.
          if (incoming.sender_id !== user.id) {
            supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", incoming.id);
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [activeId, user]);

  const handleSelectConvo = (id) => {
    setActiveId(id);
    setMobileShowThread(true);
  };

  const activeConvo = conversations.find((c) => c.id === activeId) ?? null;

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !activeId || !user) return;
    setDraft("");
    setSendError("");
    const { error } = await supabase.from("messages").insert({
      conversation_id: activeId,
      sender_id: user.id,
      body: text,
    });
    if (error) {
      setSendError("Message couldn't be sent. Please try again.");
      setDraft(text);
    }
  };

  return (
    <div
      className="kollab-messages"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: appColors.bg, minHeight: "100vh", textAlign: "left" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { margin: 0; background: white; }
        #root { max-width: none; margin: 0; padding: 0; width: 100%; }
        .kollab-messages, .kollab-messages *, .kollab-messages *::before, .kollab-messages *::after {
          box-sizing: border-box;
        }
        .kollab-scroll-col {
          scrollbar-width: thin;
          scrollbar-color: ${appColors.border} transparent;
        }
        .kollab-scroll-col::-webkit-scrollbar { width: 6px; }
        .kollab-scroll-col::-webkit-scrollbar-thumb { background: ${appColors.border}; border-radius: 9999px; }
        .kollab-messages-back-btn {
          display: none;
        }
        @media (max-width: 768px) {
          .kollab-messages-main {
            margin-left: 0 !important;
          }
          .kollab-messages-list {
            width: 100% !important;
          }
          .kollab-messages-list-hidden {
            display: none !important;
          }
          .kollab-messages-thread-hidden {
            display: none !important;
          }
          .kollab-messages-back-btn {
            display: flex !important;
          }
        }
      `}</style>

      <AppSidebar activeItem="messages" />
      <AppTopBar left={<Breadcrumb text="Workspace /" current="Messages" />} />

      <main className="kollab-messages-main" style={{ marginLeft: 256, paddingTop: 64, height: "100vh", boxSizing: "border-box", display: "flex" }}>
        {/* Conversation list */}
        <aside className={`kollab-scroll-col kollab-messages-list ${mobileShowThread ? "kollab-messages-list-hidden" : ""}`} style={{ width: 320, flexShrink: 0, borderRight: `1px solid ${appColors.border}`, background: "white", overflowY: "auto" }}>
          <div style={{ padding: "24px 24px 16px 24px" }}>
            <h1 style={{ fontWeight: 700, color: appColors.navy, fontSize: 24, margin: 0 }}>Messages</h1>
          </div>
          {convosLoading ? (
            <div style={{ padding: "0 24px", color: appColors.grayLight, fontSize: 14 }}>Loading conversations…</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: "0 24px", color: appColors.grayLight, fontSize: 14 }}>No conversations yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {conversations.map((convo) => {
                const isActive = convo.id === activeId;
                return (
                  <button
                    key={convo.id}
                    type="button"
                    onClick={() => handleSelectConvo(convo.id)}
                    style={{
                      display: "flex", gap: 12, alignItems: "flex-start", padding: "16px 24px", border: "none", cursor: "pointer", textAlign: "left",
                      background: isActive ? appColors.primaryLighter : "transparent", borderLeft: isActive ? `3px solid ${appColors.primary}` : "3px solid transparent",
                      transition: "background-color 200ms ease-out, border-color 200ms ease-out",
                    }}
                  >
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{ background: "#e2e8f0", width: 44, height: 44, borderRadius: 9999, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: appColors.grayLight }}>
                        {convo.otherName.charAt(0).toUpperCase()}
                      </div>
                      {convo.unread && (
                        <span style={{ position: "absolute", top: -1, right: -1, width: 10, height: 10, borderRadius: 9999, background: "#ba1a1a", boxShadow: "0 0 0 2px white" }} />
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontWeight: convo.unread ? 700 : 600, color: appColors.navy, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{convo.otherName}</span>
                      </div>
                      {convo.campaignName && <div style={{ color: appColors.grayLight, fontSize: 11, marginBottom: 4 }}>{convo.campaignName}</div>}
                      <div style={{ color: convo.unread ? appColors.navy : appColors.grayLight, fontSize: 13, fontWeight: convo.unread ? 600 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {convo.lastMessage ? `${convo.lastMessage.fromMe ? "You: " : ""}${convo.lastMessage.text}` : "No messages yet"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* Thread */}
        <div className={`kollab-messages-thread ${!mobileShowThread ? "kollab-messages-thread-hidden" : ""}`} style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {!activeConvo ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: appColors.grayLight, fontSize: 14 }}>
              {convosLoading ? "Loading…" : "Select a conversation to get started."}
            </div>
          ) : (
            <>
              <div style={{ padding: "20px 32px", borderBottom: `1px solid ${appColors.border}`, background: "white", display: "flex", gap: 12, alignItems: "center" }}>
                <button
                  type="button"
                  className="kollab-messages-back-btn"
                  onClick={() => setMobileShowThread(false)}
                  aria-label="Back to conversations"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                >
                  <BackIcon color={appColors.navy} />
                </button>
                <div style={{ background: "#e2e8f0", width: 40, height: 40, borderRadius: 9999, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: appColors.grayLight }}>
                  {activeConvo.otherName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: appColors.navy, fontSize: 15 }}>{activeConvo.otherName}</div>
                  {activeConvo.campaignName && <div style={{ color: appColors.grayLight, fontSize: 12 }}>{activeConvo.campaignName}</div>}
                </div>
              </div>

              <div className="kollab-scroll-col" style={{ flex: 1, overflowY: "auto", padding: 32, display: "flex", flexDirection: "column", gap: 16 }}>
                {messagesLoading ? (
                  <div style={{ color: appColors.grayLight, fontSize: 14, textAlign: "center" }}>Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div style={{ color: appColors.grayLight, fontSize: 14, textAlign: "center" }}>No messages yet -- say hello!</div>
                ) : (
                  messages.map((msg) => {
                    const fromMe = msg.sender_id === user.id;
                    return (
                      <div key={msg.id} style={{ display: "flex", justifyContent: fromMe ? "flex-end" : "flex-start" }}>
                        <div style={{ maxWidth: 420 }}>
                          <div
                            style={{
                              background: fromMe ? appColors.primary : "white",
                              color: fromMe ? "white" : appColors.navy,
                              border: fromMe ? "none" : `1px solid ${appColors.border}`,
                              borderRadius: 16,
                              padding: "12px 16px",
                              fontSize: 14,
                              lineHeight: "21px",
                            }}
                          >
                            {msg.body}
                          </div>
                          <div style={{ color: appColors.grayLight, fontSize: 11, marginTop: 4, textAlign: fromMe ? "right" : "left" }}>{formatMessageTime(msg.created_at)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {sendError && <div style={{ padding: "0 24px", color: "#ba1a1a", fontSize: 13, fontWeight: 600 }}>{sendError}</div>}

              <div style={{ padding: 24, borderTop: `1px solid ${appColors.border}`, background: "white", display: "flex", gap: 12 }}>
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type a message..."
                  style={{ flex: 1, background: appColors.bg, border: `1px solid ${appColors.border}`, borderRadius: 12, padding: "12px 16px", fontSize: 14, color: appColors.navy, outline: "none" }}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  aria-label="Send message"
                  style={{ background: appColors.primary, border: "none", borderRadius: 12, width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                >
                  <SendIcon />
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
