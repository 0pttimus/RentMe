import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, LogOut } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { switchToTl } from "@/store/slices/accountSlice";
import styles from "./FreelancePortalPage.module.scss";

export default function FreelancePortalPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [notifications] = useState(false);

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <div className="page-header">
        <div className={styles.headerRow}>
          <h1>Freelance Portal</h1>
          <div className={styles.topActions}>
            <Link to="/freelance/notifications" aria-label="Notifications">
              <Bell size={20} strokeWidth={1.75} className={notifications ? styles.bellActive : ""} />
            </Link>
            <button
              className={styles.exitBtn}
              onClick={() => { dispatch(switchToTl()); navigate("/markets"); }}
              type="button"
            >
              <LogOut size={14} strokeWidth={2} />
              Exit
            </button>
          </div>
        </div>
      </div>

      <div className={styles.empty}>
        <p className={styles.emptyTitle}>No jobs yet</p>
        <p className={styles.emptyText}>When clients hire you, jobs will appear here.</p>
      </div>
    </div>
  );
}
