import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SubPageHeader } from "@/components/SubPageHeader";
import { formatNaira } from "@/lib/format";
import { getReservations, depositToEscrow } from "@/lib/api/client";
import styles from "./WalletPayPage.module.scss";

interface Reservation {
  id: string; title: string; address: string; deposit_amount_ngn: number;
  rent_amount_ngn: number; status: string; inspection_deadline: string;
  escrow_contract_address: string | null; created_at: string;
}

export default function WalletPayPage() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  useEffect(() => {
    getReservations().then((r) => {
      if (r.data?.reservations) setReservations(r.data.reservations);
      setLoading(false);
    });
  }, []);

  const handlePayRemaining = async (r: Reservation) => {
    if (!r.escrow_contract_address) return;
    setPaying(r.id);
    const remaining = String(r.rent_amount_ngn - r.deposit_amount_ngn);
    const res = await depositToEscrow(r.escrow_contract_address, remaining);
    setPaying(null);
    if (res.data?.status === "funded") {
      navigate(`/wallet?tx=${res.data.txHash}`);
    }
  };

  if (loading) return (
    <div className={["page-content", styles.page].join(" ")}>
      <SubPageHeader title="Pay Rent" subtitle="Upcoming payments" prevTitle="Wallet" backHref="/wallet" />
      <div className="spinnerWrap"><div className="spinner" /></div>
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
          {reservations.map((r) => {
            const remaining = r.rent_amount_ngn - r.deposit_amount_ngn;
            return (
              <div key={r.id} className={styles.rentCard}>
                <p className={styles.rentTitle}>{r.title}</p>
                <p className={styles.rentDue}>
                  {r.status === "active" ? `Inspection deadline: ${new Date(r.inspection_deadline).toLocaleDateString()}` : r.status}
                </p>
                <p className={styles.rentAmount}>
                  {formatNaira(r.deposit_amount_ngn)}
                  <span className={styles.depositLabel}> deposit paid</span>
                </p>
                <p className={styles.rentAmount}>
                  {formatNaira(remaining)}
                  <span className={styles.depositLabel}> remaining</span>
                </p>
                <button
                  type="button"
                  className={styles.payBtn}
                  onClick={() => handlePayRemaining(r)}
                  disabled={paying === r.id || !r.escrow_contract_address}
                >
                  {paying === r.id ? "Paying..." : "Pay Remaining"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
