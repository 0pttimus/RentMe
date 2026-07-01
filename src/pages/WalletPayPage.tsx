import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SubPageHeader } from "@/components/SubPageHeader";
import { formatNaira } from "@/lib/format";
import { getReservations } from "@/lib/api/client";
import styles from "./WalletPayPage.module.scss";

interface Reservation {
  id: string; title: string; address: string; deposit_amount_ngn: number;
  status: string; inspection_deadline: string; created_at: string;
}

export default function WalletPayPage() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReservations().then((r) => {
      if (r.data?.reservations) setReservations(r.data.reservations);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className={["page-content", styles.page].join(" ")}>
      <SubPageHeader title="Pay Rent" subtitle="Upcoming payments" prevTitle="Wallet" backHref="/wallet" />
      <p className={styles.empty}>Loading...</p>
    </div>
  );

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <SubPageHeader title="Pay Rent" subtitle="Upcoming payments" prevTitle="Wallet" backHref="/wallet" />

      {reservations.length === 0 ? (
        <div className={styles.content}>
          <p className={styles.empty}>No upcoming payments</p>
        </div>
      ) : (
        <div className={styles.content}>
          {reservations.map((r) => (
            <div key={r.id} className={styles.rentCard}>
              <p className={styles.rentTitle}>{r.title}</p>
              <p className={styles.rentDue}>
                {r.status === "active" ? `Inspection deadline: ${new Date(r.inspection_deadline).toLocaleDateString()}` : r.status}
              </p>
              <p className={styles.rentAmount}>
                {formatNaira(r.deposit_amount_ngn)}
                <span className={styles.depositLabel}> deposit paid</span>
              </p>
              <button type="button" className={styles.payBtn} onClick={() => navigate("/wallet/deposit")}>
                Pay Remaining
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
