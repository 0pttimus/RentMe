import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Building2, Headphones, Send, ChevronRight } from "lucide-react";
import { SubPageHeader } from "@/components/SubPageHeader";
import { listConversations, sendMessage, getMessages } from "@/lib/api/client";
import styles from "./MessagesPage.module.scss";

type ThreadId = "landlord" | "support";

type ConvItem = {
  id: string; last_message: string | null; last_message_at: string | null;
  created_at: string; other_id: string; other_name: string; other_avatar: string | null;
};

type ChatMessage = {
  from: "me" | "them";
  text: string;
  time: string;
};

const supportMessages: ChatMessage[] = [
  { from: "them", text: "Hi there! RentMe Support here. How can we help?", time: "Now" },
];

export default function MessagesPage() {
  const [searchParams] = useSearchParams();
  const activeThread = readThread(searchParams.get("thread"));
  const [conversations, setConversations] = useState<ConvItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [convMessages, setConvMessages] = useState<ChatMessage[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (activeThread !== "landlord") return;
    setLoading(true);
    listConversations().then((r: { data?: { conversations?: ConvItem[] } }) => {
      if (r.data?.conversations) setConversations(r.data.conversations);
      setLoading(false);
    });
  }, [activeThread]);

  const openConv = async (convId: string) => {
    setActiveConv(convId);
    const r = await getMessages(convId);
    if (r.data?.messages) {
      setConvMessages(r.data.messages.map((m) => ({
        from: m.sender_id === "me" ? "me" as const : "them" as const,
        text: m.content,
        time: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      })));
    }
  };

  const activeConvMeta = activeConv
    ? conversations.find((c: ConvItem) => c.id === activeConv)
    : null;

  const preview = useMemo(() => ({
    landlord: conversations[0]?.last_message ?? "No messages yet",
    support: supportMessages.at(-1)?.text ?? "No messages yet",
  }), [conversations]);

  async function handleSend() {
    const text = input.trim();
    if (!text || !activeConv) return;
    const r = await sendMessage(activeConv, text);
    if (r.data) {
      setConvMessages((prev) => [...prev, { from: "me", text, time: "Now" }]);
      setInput("");
    }
  }

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <SubPageHeader title="Messages" subtitle={activeConvMeta ? activeConvMeta.other_name : activeThread === "support" ? "RentMe Support" : "Property conversations"} prevTitle="Portal" backHref="/portal" />

      <div className={styles.threadTabs}>
        {(["landlord", "support"] as ThreadId[]).map((thread) => (
          <Link
            key={thread}
            to={`/messages?thread=${thread}`}
            onClick={() => setActiveConv(null)}
            className={[styles.threadTab, activeThread === thread ? styles.threadTabActive : ""].filter(Boolean).join(" ")}
          >
            <span className={styles.threadIcon}>
              {thread === "landlord" ? <Building2 size={14} strokeWidth={1.9} /> : <Headphones size={14} strokeWidth={1.9} />}
            </span>
            <span className={styles.threadText}>
              <strong>{thread === "landlord" ? "Landlord" : "Support"}</strong>
              <span>{preview[thread]}</span>
            </span>
          </Link>
        ))}
      </div>

      {activeThread === "support" ? (
        <>
          <div className={styles.chatHeader}>
            <div className={styles.avatar}><Headphones size={18} strokeWidth={1.8} /></div>
            <div><p>RentMe Support</p><span>Reservations, repairs and account help</span></div>
          </div>
          <div className={[styles.messages, "ios-scroll"].join(" ")}>
            {supportMessages.map((msg, i) => (
              <div key={i} className={[styles.bubble, msg.from === "me" ? styles.bubbleMe : styles.bubbleThem].filter(Boolean).join(" ")}>
                <p>{msg.text}</p><span>{msg.time}</span>
              </div>
            ))}
          </div>
          <div className={styles.inputBar}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }} placeholder="Message RentMe..." />
            <button type="button" aria-label="Send" onClick={handleSend}><Send size={16} strokeWidth={2} /></button>
          </div>
        </>
      ) : activeConv ? (
        <>
          <div className={styles.chatHeader}>
            <div className={styles.avatar}>{activeConvMeta?.other_name?.[0] ?? "?"}</div>
            <div><p>{activeConvMeta?.other_name ?? "Chat"}</p><span>Landlord</span></div>
          </div>
          <div className={[styles.messages, "ios-scroll"].join(" ")}>
            <button className={styles.backToConversations} onClick={() => setActiveConv(null)} type="button">← All conversations</button>
            {convMessages.length === 0 ? (
              <div className={styles.emptyChat}>
                <p className={styles.emptyTitle}>No messages yet</p>
                <p className={styles.emptyText}>Send a message to get the conversation started.</p>
              </div>
            ) : (
              convMessages.map((msg, i) => (
                <div key={i} className={[styles.bubble, msg.from === "me" ? styles.bubbleMe : styles.bubbleThem].filter(Boolean).join(" ")}>
                  <p>{msg.text}</p><span>{msg.time}</span>
                </div>
              ))
            )}
          </div>
          <div className={styles.inputBar}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }} placeholder="Message..." />
            <button type="button" aria-label="Send" onClick={handleSend}><Send size={16} strokeWidth={2} /></button>
          </div>
        </>
      ) : (
        <div className={styles.conversationList}>
          {loading ? (
            <div className="spinnerWrap"><div className="spinner" /></div>
          ) : conversations.length === 0 ? (
            <div className={styles.emptyChat}>
              <p className={styles.emptyTitle}>No conversations yet</p>
              <p className={styles.emptyText}>Reserve a property to start chatting with the landlord.</p>
            </div>
          ) : (
            conversations.map((c: ConvItem) => (
              <button key={c.id} className={styles.convRow} onClick={() => openConv(c.id)} type="button">
                <div className={styles.avatar}>{c.other_name?.[0] ?? "?"}</div>
                <div className={styles.convInfo}>
                  <p className={styles.convName}>{c.other_name}</p>
                  <p className={styles.convPreview}>{c.last_message ?? "Start chatting"}</p>
                </div>
                <ChevronRight size={16} className={styles.convChevron} />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function readThread(value: string | null): ThreadId {
  return value === "support" ? "support" : "landlord";
}
