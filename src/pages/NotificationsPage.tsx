import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SubPageHeader } from "@/components/SubPageHeader";
import { getNotifications } from "@/lib/api/client";
import styles from "./NotificationsPage.module.scss";

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
  const [items, setItems] = useState<
    { id: string; title: string; body: string; type: string; created_at: string }[]
  >([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    getNotifications().then((res) => {
      if (res.data) setItems(res.data.notifications);
    });
  }, []);

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <SubPageHeader title="Notifications" prevTitle="Profile" backHref="/profile" />
      <div className={styles.list}>
        {items.length === 0 ? (
          <div className={styles.empty}>
            <Bell className={styles.emptyIcon} size={40} strokeWidth={1.5} />
            <p className={styles.emptyText}>No notifications yet</p>
          </div>
        ) : (
          items.map((n) => {
            const open = expanded === n.id;
            return (
              <Card key={n.id} className={styles.item}>
                <button className={styles.itemBtn} onClick={() => setExpanded(open ? null : n.id)} type="button">
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
