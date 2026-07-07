import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { getWallet } from "@/lib/api/client";
import { formatNaira, formatStatus } from "@/lib/format";
import styles from "./FreelanceWalletPage.module.scss";

interface Tx {
  type: string;
  amount_ngn: number;
  reference: string | null;
  created_at: string;
}

interface BookingTx {
  id: string;
  status: string;
  total_amount_ngn: number;
  upfront_amount_ngn: number;
  created_at: string;
  owner_id: string;
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export default function FreelanceWalletPage() {
  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [bookings, setBookings] = useState<BookingTx[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    getWallet(0).then((res) => {
      if (res.data) {
        setBalance(res.data.balanceNgn);
        setTxs(res.data.transactions);
        setBookings(res.data.bookings);
        setHasMore(res.data.hasMore);
        setOffset(20);
      }
    });
  }, []);

  function loadMore() {
    getWallet(offset).then((res) => {
      const d = res.data;
      if (d) {
        setTxs((prev) => [...prev, ...d.transactions]);
        setBookings((prev) => [...prev, ...d.bookings]);
        setHasMore(!!d.hasMore);
        setOffset((prev) => prev + 20);
      }
    });
  }

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <div className={styles.headerRow}>
        <h1>Wallet</h1>
        <p className={styles.subtitle}>Freelance earnings</p>
      </div>

      <Card className={styles.balance}>
        <p className={styles.balanceLabel}>Available balance</p>
        <p className={styles.balanceValue}>{formatNaira(balance)}</p>
      </Card>

      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary, #6e6e73)", marginBottom: 8 }}>Transactions</p>
      {txs.length === 0 ? (
        <p className={styles.emptyText} style={{ fontSize: 13, color: "var(--text-secondary, #6e6e73)", padding: "16px 0" }}>No wallet transactions yet.</p>
      ) : (
        <div className={styles.list}>
          {txs.map((tx, i) => (
            <div key={tx.reference ?? i} className={styles.row}>
              <div className={styles.rowLeft}>
                <div>
                  <p className={styles.rowLabel}>{tx.type.replace(/_/g, " ")}</p>
                  <p className={styles.rowDate}>{formatDate(tx.created_at)}</p>
                </div>
              </div>
              <p className={tx.amount_ngn >= 0 ? styles.amountIn : styles.amountOut}>
                {tx.amount_ngn >= 0 ? "+" : ""}{formatNaira(tx.amount_ngn)}
              </p>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <button type="button" className={styles.loadMore} onClick={loadMore}>Load More</button>
      )}

      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary, #6e6e73)", margin: "16px 0 8px" }}>Service bookings</p>
      {bookings.length === 0 ? (
        <p className={styles.emptyText} style={{ fontSize: 13, color: "var(--text-secondary, #6e6e73)", padding: "16px 0" }}>No service bookings yet.</p>
      ) : (
        <div className={styles.list}>
          {bookings.map((b) => (
            <div key={b.id} className={styles.row}>
              <div className={styles.rowLeft}>
                <div>
                  <p className={styles.rowLabel}>Service booking</p>
                  <p className={styles.rowDate}>{formatStatus(b.status)} &middot; {formatDate(b.created_at)}</p>
                </div>
              </div>
              <p className={styles.amountIn}>{formatNaira(b.total_amount_ngn)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
