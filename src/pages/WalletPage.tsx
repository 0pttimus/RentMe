import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Home, Briefcase, ChevronRight, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { getWallet } from "@/lib/api/client";
import { formatNaira } from "@/lib/format";
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

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

function downloadReceipt(tx: Tx) {
  downloadReceiptImage({
    title: "Transaction Receipt",
    subtitle: `RentMe \u00b7 ${formatDate(tx.created_at)}`,
    rows: [
      { label: "Type", value: tx.type.replace(/_/g, " ") },
      { label: "Date", value: formatDate(tx.created_at) },
      { label: "Time", value: formatTime(tx.created_at) },
      { label: "Reference", value: tx.reference ?? "\u2014" },
      { label: "Amount", value: `${tx.amount_ngn >= 0 ? "+" : ""}${formatNaira(tx.amount_ngn)}` },
    ],
    filename: `receipt-${tx.reference ?? tx.created_at}`,
  });
}

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    getWallet().then((res) => {
      if (res.data) {
        setBalance(res.data.balanceNgn);
        setTxs(res.data.transactions);
      }
    });
  }, []);

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <div className="page-header">
        <h1>Wallet</h1>
      </div>

      <Card className={styles.balanceCard}>
        <p className={styles.balanceLabel}>Available balance</p>
        <p className={styles.balanceAmount}>{formatNaira(balance)}</p>
      </Card>

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

      <p className={styles.sectionLabel}>Recent activity</p>
      <div className={styles.activityList}>
        {txs.length === 0 ? (
          <p className={styles.emptyText}>No activity yet.</p>
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
                    <button className={styles.receiptBtn} onClick={() => downloadReceipt(tx)} type="button">
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
    </div>
  );
}
