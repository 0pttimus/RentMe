import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import styles from "./FreelancePortalPage.module.scss";

export default function FreelancePortalPage() {
  const { count: unread } = useUnreadCount();
  return (
    <div className={["page-content", styles.page].join(" ")}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Freelance Portal</h1>
        <Link to="/freelance/notifications" aria-label="Notifications" className={styles.bellLink}>
          <Bell size={20} strokeWidth={1.75} />
          {unread > 0 && <span className={styles.bellBadge}>{unread}</span>}
        </Link>
      </div>

      <div className={styles.empty}>
        <p className={styles.emptyTitle}>No jobs yet</p>
        <p className={styles.emptyText}>When clients hire you, jobs will appear here.</p>
      </div>
    </div>
  );
}
