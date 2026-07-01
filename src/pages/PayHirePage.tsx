import { useState, useEffect } from "react";
import { ChevronRight, Download, Clock, CheckCircle } from "lucide-react";
import { getThreads, type JobThread } from "@/lib/job-store";
import { downloadReceiptImage } from "@/lib/receipt";
import { SubPageHeader } from "@/components/SubPageHeader";
import styles from "./PayHirePage.module.scss";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

function downloadReceipt(thread: JobThread) {
  downloadReceiptImage({
    title: "Payment Receipt",
    subtitle: `RentMe \u00b7 ${formatDate(thread.createdAt)}`,
    rows: [
      { label: "Worker", value: thread.workerName },
      { label: "Service", value: thread.title },
      { label: "Date", value: formatDate(thread.createdAt) },
      { label: "Reference", value: thread.id },
      { label: "Amount", value: thread.budget },
    ],
    filename: `receipt-${thread.id}`,
  });
}

export default function PayHirePage() {
  const [threads, setThreads] = useState<JobThread[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setThreads(getThreads());
  }, []);

  const active = threads.filter((t) => t.status === "hired" || t.status === "job_done");
  const history = threads.filter((t) => t.status === "completed");

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <SubPageHeader title="Pay Hire" prevTitle="Wallet" backHref="/wallet" />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Clock size={14} strokeWidth={2} />
          Currently Working
        </h2>
        {active.length === 0 ? (
          <p className={styles.empty}>No active hires.</p>
        ) : (
          <div className={styles.list}>
            {active.map((t) => (
              <div key={t.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardLeft}>
                    <span className={styles.initial}>{t.workerInitials}</span>
                    <div>
                      <p className={styles.workerName}>{t.workerName}</p>
                      <p className={styles.jobTitle}>{t.title}</p>
                    </div>
                  </div>
                  <span className={styles.amount}>{t.budget}</span>
                </div>
                <button className={styles.payBtn} type="button">Pay Now</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <CheckCircle size={14} strokeWidth={2} />
          Payment History
        </h2>
        {history.length === 0 ? (
          <p className={styles.empty}>No payments yet.</p>
        ) : (
          <div className={styles.list}>
            {history.map((t) => {
              const open = expanded === t.id;
              return (
                <div key={t.id} className={styles.card}>
                  <button className={styles.cardHeader} onClick={() => setExpanded(open ? null : t.id)} type="button">
                    <div className={styles.cardLeft}>
                      <span className={styles.initial}>{t.workerInitials}</span>
                      <div>
                        <p className={styles.workerName}>{t.workerName}</p>
                        <p className={styles.jobTitle}>{t.title} &middot; {formatDate(t.createdAt)}</p>
                      </div>
                    </div>
                    <div className={styles.cardRight}>
                      <span className={styles.amount}>{t.budget}</span>
                      <ChevronRight size={14} strokeWidth={2} className={open ? styles.rotated : ""} />
                    </div>
                  </button>
                  {open && (
                    <div className={styles.detail}>
                      <div className={styles.detailRow}>
                        <span>Reference</span>
                        <span>{t.id}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span>Date</span>
                        <span>{formatDate(t.createdAt)}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span>Time</span>
                        <span>{formatTime(t.createdAt)}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span>Amount</span>
                        <span>{t.budget}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span>Status</span>
                        <span className={styles.paid}>Paid</span>
                      </div>
                      <button className={styles.receiptBtn} onClick={() => downloadReceipt(t)} type="button">
                        <Download size={14} strokeWidth={2} />
                        Download Receipt
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
