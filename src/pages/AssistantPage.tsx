import { useState } from "react";
import { Send } from "lucide-react";
import { SubPageHeader } from "@/components/SubPageHeader";
import { aiChat } from "@/lib/api/client";
import styles from "./AssistantPage.module.scss";

export default function AssistantPage() {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Hi! Ask me about rentals, affordability, or reservations." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(text: string) {
    if (!text.trim()) return;
    const history = messages.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.text,
    }));
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    const res = await aiChat(text, history);
    setLoading(false);
    setMessages((m) => [...m, { role: "ai", text: res.data?.reply ?? res.error ?? "Error" }]);
  }

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <SubPageHeader title="Assistant" prevTitle="Help" backHref="/help" />
      <div className={[styles.messages, "ios-scroll"].join(" ")}>
        {messages.map((m, i) => (
          <div
            key={i}
            className={[styles.bubble, m.role === "user" ? styles.bubbleUser : styles.bubbleAi].join(
              " "
            )}
          >
            {m.text}
          </div>
        ))}
      </div>
      <div className={styles.inputBar}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && send(input)}
          placeholder="Ask anything…"
          className={styles.input}
        />
        <button
          type="button"
          onClick={() => send(input)}
          disabled={loading}
          className={styles.sendBtn}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}