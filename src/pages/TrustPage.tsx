import { Card } from "@/components/ui/Card";
import { TrustBadge } from "@/components/ui/Badge";
import { SubPageHeader } from "@/components/SubPageHeader";
import styles from "./TrustPage.module.scss";

const trustScore = 0;
const trustLevel = "Average";

const factors = [
  { label: "Verified identity", impact: "+50", positive: true },
  { label: "Successful rental", impact: "+120", positive: true },
  { label: "On-time payments", impact: "+80", positive: true },
  { label: "Positive reviews", impact: "+40", positive: true },
];

export default function TrustPage() {
  return (
    <div className={["page-content", styles.page].join(" ")}>
      <SubPageHeader title="Trust Score" subtitle="Your reputation on RentMe" prevTitle="Profile" backHref="/profile" />

      <div className={styles.content}>
        <Card className={styles.scoreCard}>
          <p className={styles.score}>{trustScore}</p>
          <p className={styles.scoreMax}>out of 1000</p>
          <div className={styles.badgeRow}>
            <TrustBadge level={trustLevel} />
          </div>
        </Card>

        <h2 className={styles.sectionLabel}>Score factors</h2>
        <div className={styles.factors}>
          {factors.map((f) => (
            <Card key={f.label} className={styles.factor}>
              <span className={styles.factorLabel}>{f.label}</span>
              <span className={f.positive ? styles.factorPositive : styles.factorNegative}>
                {f.impact}
              </span>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}