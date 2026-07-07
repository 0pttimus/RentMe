import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SubPageHeader } from "@/components/SubPageHeader";
import { getNotifications, markNotificationRead } from "@/lib/api/client";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import styles from "./NotificationsPage.module.scss";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: number;
  created_at: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { refetch: refetchCount } = useUnreadCount();

  useEffect(() => {
    getNotifications().then((res) => {
      if (res.data) setItems(res.data.notifications);
      setLoading(false);
    });
  }, []);

  function handleExpand(id: string) {
    const open = expanded === id;
    if (open) { setExpanded(null); return; }
    setExpanded(id);
    const n = items.find((x) => x.id === id);
    if (n && !n.read) {
      markNotificationRead(id);
      refetchCount();
      setItems((prev) => prev.map((x) => x.id === id ? { ...x, read: 1 } : x));
    }
  }

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <SubPageHeader title="Notifications" prevTitle="Profile" backHref="/profile" />
      <div className={`${styles.list} stagger-in`}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ padding: 16 }}>
                <div className="skeleton" style={{ height: 14, width: "60%", borderRadius: 6, marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 11, width: "40%", borderRadius: 6, marginBottom: 4 }} />
                <div className="skeleton" style={{ height: 11, width: "85%", borderRadius: 6 }} />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <Bell className={styles.emptyIcon} size={40} strokeWidth={1.5} />
            <p className={styles.emptyText}>No notifications yet</p>
          </div>
        ) : (
          items.map((n) => {
            const open = expanded === n.id;
            return (
              <Card key={n.id} className={`${styles.item} ${!n.read ? styles.unread : ""}`}>
                <button className={styles.itemBtn} onClick={() => handleExpand(n.id)} type="button">
                  {!n.read && <span className={styles.dot} />}
                  <div className={styles.itemHeader}>
                    <p className={styles.itemTitle}>{n.title}</p>
                    <span className={styles.itemTime}>{timeAgo(n.created_at)}</span>
                  </div>
                  <p className={open ? styles.itemBody : styles.itemPreview}>
                    {n.body}
                  </p>
                </button>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
