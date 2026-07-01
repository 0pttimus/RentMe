import { useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Plus, Wrench } from "lucide-react";
import { Card } from "@/components/ui/Card";
import styles from "./PortalPage.module.scss";

export default function PortalPage() {
  const [showRenter, setShowRenter] = useState(true);

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <div className="page-header">
        <h1>Portal</h1>
      </div>

      <div className={styles.roleToggle}>
        <button
          type="button"
          onClick={() => setShowRenter(true)}
          className={[styles.roleBtn, showRenter ? styles.roleBtnActive : ""].filter(Boolean).join(" ")}
        >
          Renter
        </button>
        <button
          type="button"
          onClick={() => setShowRenter(false)}
          className={[styles.roleBtn, !showRenter ? styles.roleBtnActive : ""].filter(Boolean).join(" ")}
        >
          Provider
        </button>
      </div>

      {showRenter ? (
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Active Rentals (0)</p>
          <Card className={styles.emptyCard}>
            <p className={styles.emptyTitle}>No active rentals</p>
            <p className={styles.emptyText}>Browse the markets to find something to rent.</p>
            <Link to="/markets" className={styles.emptyBtn}>Browse markets</Link>
          </Card>

          <p className={styles.sectionLabel}>Quick actions</p>
          <div className={styles.actionGrid}>
            <Link to="/markets" className={styles.actionBtn}>
              <Plus size={14} strokeWidth={1.75} />
              Rent something new
            </Link>
            <Link to="/repair-request" className={styles.actionBtn}>
              <Wrench size={14} strokeWidth={1.75} />
              Request repair
            </Link>
            <Link to="/messages" className={styles.actionBtn}>
              <MessageCircle size={14} strokeWidth={1.75} />
              Messages
            </Link>
          </div>
        </div>
      ) : (
        <div className={styles.section}>
          <Card className={styles.emptyCard}>
            <p className={styles.emptyTitle}>You haven't listed any items yet</p>
            <p className={styles.emptyText}>
              List a property, vehicle, equipment, or anything you own for rent.
            </p>
            <Link to="/list-property" className={styles.emptyBtn}>
              List an item
            </Link>
          </Card>
        </div>
      )}
    </div>
  );
}
