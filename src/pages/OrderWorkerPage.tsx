import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Send, CheckCircle } from "lucide-react";
import { createThread } from "@/lib/job-store";
import styles from "./OrderWorkerPage.module.scss";

export default function OrderWorkerPage() {
  const { id: _id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const worker = undefined as { id: string; nickname: string; initials: string; profilePicture: string; categories: string[]; charge: { type: "fixed"; amount: number; min: number; max: number } } | undefined;

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);

  if (!worker) return <Navigate to="/hire" replace />;

  const chargeLabel = worker.charge.type === "fixed"
    ? `₦${worker.charge.amount.toLocaleString()}`
    : `₦${worker.charge.min.toLocaleString()} – ₦${worker.charge.max.toLocaleString()}`;

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    const thread = createThread({
      workerId: worker.id,
      workerName: worker.nickname,
      workerInitials: worker.initials,
      workerProfilePic: worker.profilePicture,
      title: worker.categories[0],
      message: message.trim(),
      budget: chargeLabel,
    });
    setThreadId(thread.id);
    setSubmitting(false);
    setDone(true);
  };

  return (
    <div className={["page-content", styles.page].join(" ")}>
      {!done && (
        <button className={styles.back} onClick={() => navigate(-1)} type="button">
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
      )}

      {!done ? (
        <>
          <h1 className={styles.heading}>Request {worker.nickname}</h1>

          <div className={styles.workerPreview}>
            <img src={worker.profilePicture} alt={worker.nickname} className={styles.avatar} />
            <div>
              <p className={styles.workerName}>{worker.nickname}</p>
              <p className={styles.workerCharge}>{chargeLabel}</p>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Describe what you need</label>
            <textarea
              className={styles.textarea}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explain the job in detail (what, where, when...)"
              rows={6}
              maxLength={2000}
            />
            <span className={styles.counter}>{message.length}/2000</span>
          </div>

          <button
            className={[styles.submitBtn, submitting ? styles.submitting : ""].filter(Boolean).join(" ")}
            disabled={!message.trim() || submitting}
            onClick={handleSubmit}
            type="button"
          >
            {submitting ? (
              <span className={styles.spinner} />
            ) : (
              <Send size={16} strokeWidth={2} />
            )}
            {submitting ? "Sending..." : "Request Availability"}
          </button>
        </>
      ) : (
        <div className={styles.doneSection}>
          <div className={styles.doneIcon}>
            <CheckCircle size={48} strokeWidth={1.5} />
          </div>
          <h2 className={styles.doneHeading}>Request sent!</h2>
          <p className={styles.doneText}>
            {worker.nickname} will review your request. You can chat and negotiate in the thread.
          </p>
          <button className={styles.doneBtn} onClick={() => navigate(`/chat/${threadId}`)} type="button">
            Open Chat
          </button>
          <button className={styles.viewWorkerBtn} onClick={() => navigate(`/worker/${worker.id}`)} type="button">
            Back to profile
          </button>
        </div>
      )}
    </div>
  );
}
