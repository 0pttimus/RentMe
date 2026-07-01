import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Building2, Headphones, Send } from "lucide-react";
import { SubPageHeader } from "@/components/SubPageHeader";
import styles from "./MessagesPage.module.scss";

type ThreadId = "landlord" | "support";

type ChatMessage = {
  from: "me" | "them";
  text: string;
  time: string;
};

const threadMeta: Record<ThreadId, { name: string; subtitle: string; icon: typeof Building2 }> = {
  landlord: {
    name: "Landlord",
    subtitle: "Property owner",
    icon: Building2,
  },
  support: {
    name: "RentMe Support",
    subtitle: "Reservations, repairs and account help",
    icon: Headphones,
  },
};

const initialMessages: Record<ThreadId, ChatMessage[]> = {
  landlord: [],
  support: [
    { from: "them", text: "Hi there! RentMe Support here. How can we help?", time: "Now" },
  ],
};

function readThread(value: string | null): ThreadId {
  return value === "support" ? "support" : "landlord";
}

export default function MessagesPage() {
  const [searchParams] = useSearchParams();
  const activeThread = readThread(searchParams.get("thread"));
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");

  const meta = threadMeta[activeThread];
  const Icon = meta.icon;
  const activeMessages = messages[activeThread];

  const preview = useMemo(
    () => ({
      landlord: messages.landlord.at(-1)?.text ?? "No messages yet",
      support: messages.support.at(-1)?.text ?? "No messages yet",
    }),
    [messages]
  );

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    setMessages((current) => ({
      ...current,
      [activeThread]: [...current[activeThread], { from: "me", text, time: "Now" }],
    }));
    setInput("");
  }

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <SubPageHeader title="Messages" subtitle={meta.subtitle} prevTitle="Portal" backHref="/portal" />

      <div className={styles.threadTabs}>
        {(["landlord", "support"] as ThreadId[]).map((thread) => {
          const TabIcon = threadMeta[thread].icon;
          return (
            <Link
              key={thread}
              to={`/messages?thread=${thread}`}
              className={[styles.threadTab, activeThread === thread ? styles.threadTabActive : ""]
                .filter(Boolean)
                .join(" ")}
            >
              <span className={styles.threadIcon}>
                <TabIcon size={14} strokeWidth={1.9} />
              </span>
              <span className={styles.threadText}>
                <strong>{threadMeta[thread].name}</strong>
                <span>{preview[thread]}</span>
              </span>
            </Link>
          );
        })}
      </div>

      <div className={styles.chatHeader}>
        <div className={styles.avatar}>
          <Icon size={18} strokeWidth={1.8} />
        </div>
        <div>
          <p>{meta.name}</p>
          <span>{meta.subtitle}</span>
        </div>
      </div>

      <div className={[styles.messages, "ios-scroll"].join(" ")}>
        {activeMessages.length === 0 ? (
          <div className={styles.emptyChat}>
            <p className={styles.emptyTitle}>No messages yet</p>
            <p className={styles.emptyText}>Send a message to get the conversation started.</p>
          </div>
        ) : (
          activeMessages.map((message, index) => (
            <div
              key={`${message.time}-${index}`}
              className={[styles.bubble, message.from === "me" ? styles.bubbleMe : styles.bubbleThem]
                .filter(Boolean)
                .join(" ")}
            >
              <p>{message.text}</p>
              <span>{message.time}</span>
            </div>
          ))
        )}
      </div>

      <div className={styles.inputBar}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") sendMessage();
          }}
          placeholder={activeThread === "support" ? "Message RentMe..." : "Message landlord..."}
        />
        <button type="button" aria-label="Send message" onClick={sendMessage}>
          <Send size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
