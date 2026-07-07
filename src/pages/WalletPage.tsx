import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Home, Briefcase, ChevronRight, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";

import { getWallet } from "@/lib/api/client";
import { formatNaira, formatStatus } from "@/lib/format";
import { downloadReceiptImage } from "@/lib/receipt";
import styles from "./WalletPage.module.scss";

const actions = [
  { label: "Deposit", icon: ArrowDownRight, href: "/wallet/deposit" },
  { label: "Withdraw", icon: ArrowUpRight, href: "/wallet/withdraw" },
  { label: "Pay rent", icon: Home, href: "/wallet/pay" },
  { label: "Pay Hire", icon: Briefcase, href: "/wallet/pay-hire" },
];

interface Tx {
  type: string;
  amount_ngn: number;
  reference: string | null;
  created_at: string;
}

interface ReservationTx {
  id: string;
  property_id: string;
  status: string;
  deposit_amount_ngn: number;
  created_at: string;
  title: string;
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

function downloadReceipt(_title: string, date: string, type: string, ref: string | null, amount: number) {
  downloadReceiptImage({
    title: _title,
    subtitle: `RentMe \u00b7 ${formatDate(date)}`,
    rows: [
      { label: "Type", value: type.replace(/_/g, " ") },
      { label: "Date", value: formatDate(date) },
      { label: "Time", value: formatTime(date) },
      { label: "Reference", value: ref ?? "\u2014" },
      { label: "Amount", value: `${amount >= 0 ? "+" : ""}${formatNaira(amount)}` },
    ],
    filename: `receipt-${ref ?? date}`,
  });
}

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [reservations, setReservations] = useState<ReservationTx[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWallet(0).then((res) => {
      if (res.data) {
        setBalance(res.data.balanceNgn);
        setTxs(res.data.transactions);
        setReservations(res.data.reservations);
        setHasMore(res.data.hasMore);
        setOffset(20);
      }
      setLoading(false);
    });
  }, []);

  function loadMore() {
    getWallet(offset).then((res) => {
      const d = res.data;
      if (d) {
        setTxs((prev) => [...prev, ...d.transactions]);
        setReservations((prev) => [...prev, ...d.reservations]);
        setHasMore(!!d.hasMore);
        setOffset((prev) => prev + 20);
      }
    });
  }

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <div className="page-header">
        <h1>Wallet</h1>
      </div>

      {loading ? (
        <Card className={styles.balanceCard}>
          <div className="skeleton" style={{ width: 80, height: 12, borderRadius: 6, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 140, height: 28, borderRadius: 8 }} />
        </Card>
      ) : (
        <Card className={styles.balanceCard}>
          <p className={styles.balanceLabel}>Available balance</p>
          <p className={styles.balanceAmount}>{formatNaira(balance)}</p>
        </Card>
      )}

      <div className={styles.actions}>
        {actions.map(({ label, icon: Icon, href }) => (
          <Link key={label} to={href} className={styles.action}>
            <span className={styles.actionIcon}>
              <Icon size={16} strokeWidth={1.75} />
            </span>
            <span className={styles.actionLabel}>{label}</span>
          </Link>
        ))}
      </div>

      <p className={styles.sectionLabel}>Wallet transactions</p>
      <div className={`${styles.activityList} stagger-in`}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 52, borderRadius: 12 }} />
            ))}
          </div>
        ) : txs.length === 0 ? (
          <p className={styles.emptyText}>No wallet activity yet.</p>
        ) : (
          txs.map((tx, i) => {
            const key = tx.reference ?? `${tx.created_at}-${i}`;
            const open = expanded === key;
            return (
              <div key={key} className={styles.txCard}>
                <button className={styles.txHeader} onClick={() => setExpanded(open ? null : key)} type="button">
                  <div className={styles.txLeft}>
                    <p className={styles.txType}>{tx.type.replace(/_/g, " ")}</p>
                    <p className={styles.txDate}>{formatDate(tx.created_at)}</p>
                  </div>
                  <div className={styles.txRight}>
                    <p className={tx.amount_ngn >= 0 ? styles.txAmtIn : styles.txAmtOut}>
                      {tx.amount_ngn >= 0 ? "+" : ""}{formatNaira(tx.amount_ngn)}
                    </p>
                    <ChevronRight size={14} strokeWidth={2} className={open ? styles.rotated : ""} />
                  </div>
                </button>
                {open && (
                  <div className={styles.detail}>
                    <div className={styles.detailRow}>
                      <span>Reference</span>
                      <span>{tx.reference ?? "—"}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Date</span>
                      <span>{formatDate(tx.created_at)}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Time</span>
                      <span>{formatTime(tx.created_at)}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Amount</span>
                      <span className={tx.amount_ngn >= 0 ? styles.paid : styles.charge}>{tx.amount_ngn >= 0 ? "+" : ""}{formatNaira(tx.amount_ngn)}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Status</span>
                      <span className={styles.paid}>Completed</span>
                    </div>
                    <button className={styles.receiptBtn} onClick={() => downloadReceipt("Transaction Receipt", tx.created_at, tx.type, tx.reference, tx.amount_ngn)} type="button">
                      <Download size={14} strokeWidth={2} />
                      Download Receipt
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {hasMore && (
        <button type="button" className={styles.loadMore} onClick={loadMore}>Load More</button>
      )}

      <p className={styles.sectionLabel}>Reservations</p>
      <div className={styles.activityList}>
        {reservations.length === 0 ? (
          <p className={styles.emptyText}>No reservation activity.</p>
        ) : (
          reservations.map((r) => (
            <Link to={`/property/${r.property_id}`} key={r.id} className={styles.txCard} style={{ display: "flex", padding: "12px", textDecoration: "none", color: "inherit" }}>
              <div style={{ flex: 1 }}>
                <p className={styles.txType}>{r.title}</p>
                <p className={styles.txDate}>{formatStatus(r.status)} &middot; {formatDate(r.created_at)}</p>
              </div>
              <p className={r.deposit_amount_ngn > 0 ? styles.txAmtOut : styles.txAmtIn}>
                {r.deposit_amount_ngn > 0 ? `-${formatNaira(r.deposit_amount_ngn)}` : "—"}
              </p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
