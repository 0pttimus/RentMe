import { Card } from "@/components/ui/Card";
import { VerifiedBadge } from "@/components/ui/Badge";
import { SubPageHeader } from "@/components/SubPageHeader";
import { formatNaira, formatStatus } from "@/lib/format";
import styles from "./RentalHistoryPage.module.scss";

const history = [
  {
    id: "1",
    title: "Self-Contain in Yaba",
    period: "2024 to 2025",
    rent: 850_000,
    status: "Completed",
  },
];

export default function RentalHistoryPage() {
  return (
    <div className={["page-content", styles.page].join(" ")}>
      <SubPageHeader title="Rental History" subtitle="Your past tenancies" prevTitle="Profile" backHref="/profile" />

      <div className={styles.list}>
        {history.map((item) => (
          <Card key={item.id} className={styles.item}>
            <div className={styles.itemHeader}>
              <div>
                <p className={styles.itemTitle}>{item.title}</p>
                <p className={styles.itemPeriod}>{item.period}</p>
              </div>
              <VerifiedBadge />
            </div>
            <div className={styles.itemFooter}>
              <span className={styles.itemStatus}>{formatStatus(item.status)}</span>
              <span className={styles.itemRent}>{formatNaira(item.rent)}/yr</span>
            </div>
          </Card>
        ))}

        {history.length === 0 && (
          <p className={styles.empty}>
            No rental history yet. Your completed tenancies will appear here.
          </p>
        )}
      </div>
    </div>
  );
}