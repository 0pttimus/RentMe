import { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SubPageHeader } from "@/components/SubPageHeader";
import { getRewards } from "@/lib/api/client";
import styles from "./RewardsPage.module.scss";

export default function RewardsPage() {
  const [points, setPoints] = useState(0);
  const [txs, setTxs] = useState<{ points: number; reason: string }[]>([]);

  useEffect(() => {
    getRewards().then((res) => {
      if (res.data) {
        setPoints(res.data.totalPoints);
        setTxs(res.data.transactions);
      }
    });
  }, []);

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <SubPageHeader title="Rewards" subtitle="Earn points, get benefits" prevTitle="Profile" backHref="/profile" />
      <Card className={styles.pointsCard}>
        <Gift className={styles.giftIcon} size={32} strokeWidth={1.75} />
        <p className={styles.points}>{points}</p>
        <p className={styles.pointsLabel}>points available</p>
      </Card>
      <div className={styles.transactions}>
        {txs.map((tx, i) => (
          <Card key={i} className={styles.tx}>
            <span>{tx.reason}</span>
            <span className={styles.txPoints}>+{tx.points}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}