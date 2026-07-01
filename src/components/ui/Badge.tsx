import { ShieldCheck } from "lucide-react";
import type { TrustLevel } from "@/lib/types";
import styles from "./Badge.module.scss";

const trustClass: Record<TrustLevel, string> = {
  Elite: styles.trustElite,
  Trusted: styles.trustTrusted,
  Average: styles.trustAverage,
  Risk: styles.trustRisk,
};

export function TrustBadge({ level }: { level: TrustLevel }) {
  return <span className={[styles.trust, trustClass[level]].join(" ")}>{level} trust</span>;
}

export function VerifiedBadge() {
  return (
    <span className={styles.verified}>
      <ShieldCheck size={12} strokeWidth={2.5} />
      Verified
    </span>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warn";
}) {
  return (
    <span className={[styles.pill, tone === "warn" ? styles.pillWarn : styles.pillNeutral].join(" ")}>
      {children}
    </span>
  );
}