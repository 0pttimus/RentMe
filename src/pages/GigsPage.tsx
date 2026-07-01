import { Pill } from "@/components/ui/Badge";
import styles from "./GigsPage.module.scss";



export default function GigsPage() {
  return (
    <div className={["page-content", styles.page].join(" ")}>
      <div className="page-header">
        <h1>Gigs</h1>
      </div>

      <div className={styles.filters}>
        <span className={styles.filterActive}>Cleaning</span>
        <Pill>Plumbing</Pill>
        <Pill>Electrical</Pill>
        <Pill>Moving</Pill>
      </div>

      <div className={styles.list}>
        <p className={styles.empty}>No gigs available yet.</p>
      </div>

      <p className={styles.footer}>50% upfront · 50% on completion · escrow protected</p>
    </div>
  );
}