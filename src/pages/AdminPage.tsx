import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { SubPageHeader } from "@/components/SubPageHeader";
import { adminReports, adminResolveReport, adminStats } from "@/lib/api/client";
import styles from "./AdminPage.module.scss";

export default function AdminPage() {
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [reports, setReports] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    adminStats().then((r) => {
      if ("error" in r && r.error) setError(r.error);
      else if ("data" in r && r.data) setStats(r.data);
    });
    adminReports().then((r) => {
      if (r.data) setReports(r.data.reports);
    });
  }, []);

  if (error) {
    return (
      <div className={["page-content", styles.page].join(" ")}>
        <SubPageHeader title="Admin" prevTitle="Profile" backHref="/profile" />
        <p className={styles.error}>{error}</p>
        <p className={styles.hint}>Sign in as admin@rentme.dev</p>
      </div>
    );
  }

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <SubPageHeader title="Admin" subtitle="Platform management" prevTitle="Profile" backHref="/profile" />
      {stats && (
        <div className={styles.statsGrid}>
          {Object.entries(stats).map(([k, v]) => (
            <Card key={k} className={styles.statCard}>
              <p className={styles.statLabel}>{k}</p>
              <p className={styles.statValue}>{v}</p>
            </Card>
          ))}
        </div>
      )}
      <h2 className={styles.sectionLabel}>Fraud reports</h2>
      <div className={styles.reports}>
        {reports.map((r) => (
          <Card key={r.id as string} className={styles.report}>
            <p className={styles.reportReason}>{r.reason as string}</p>
            <p className={styles.reportStatus}>{r.status as string}</p>
            <div className={styles.reportActions}>
              <button
                type="button"
                onClick={() => adminResolveReport(r.id as string, "resolve")}
                className={styles.resolveBtn}
              >
                Resolve
              </button>
              <button
                type="button"
                onClick={() => adminResolveReport(r.id as string, "dismiss")}
                className={styles.dismissBtn}
              >
                Dismiss
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}