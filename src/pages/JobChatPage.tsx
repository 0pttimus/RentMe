import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, CheckCircle, Clock, ShieldCheck, Briefcase, Flag, X, ChevronDown, Upload, ShieldAlert } from "lucide-react";
import { useAppSelector } from "@/store/hooks";

import { getThread, addMessage, updateStatus, markUpfrontPaid, setPaymentDeadline } from "@/lib/job-store";
import { submitReport, reportReasons, type ReportReason } from "@/lib/report-store";
import styles from "./JobChatPage.module.scss";

export default function JobChatPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const accountType = useAppSelector((s) => s.account.type);
  const isWorker = accountType === "freelance";

  const [thread, setThread] = useState(() => (threadId ? getThread(threadId) : undefined));
  const [text, setText] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [autoPaid, setAutoPaid] = useState(false);
  const [paidUpfront, setPaidUpfront] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>("Harassment");
  const [reportProof, setReportProof] = useState<string[]>([]);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [showReasonPicker, setShowReasonPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    if (threadId) setThread(getThread(threadId));
  }, [threadId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages.length]);

  useEffect(() => {
    if (thread?.status === "job_done" && thread.paymentDeadline) {
      const tick = () => {
        const remaining = thread.paymentDeadline! - Date.now();
        if (remaining <= 0) {
          setCountdown(0);
          setAutoPaid(true);
          updateStatus(thread.id, "completed");
          refresh();
          return;
        }
        setCountdown(remaining);
      };
      tick();
      const interval = setInterval(tick, 1000);
      return () => clearInterval(interval);
    }
  }, [thread?.status, thread?.paymentDeadline, refresh]);

  if (!thread) {
    return (
      <div className={[styles.page, "page-content"].join(" ")}>
        <button className={styles.back} onClick={() => navigate(-1)} type="button">
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <p className={styles.notFound}>Thread not found</p>
      </div>
    );
  }

  const handleSend = () => {
    const t = text.trim();
    if (!t) return;
    const sender = isWorker ? "worker" : "tenant";
    const updated = addMessage(thread.id, sender, t);
    if (updated) setThread(updated);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAvailable = () => {
    const updated = updateStatus(thread.id, "available");
    if (updated) {
      addMessage(thread.id, "worker", "I'm available for this job. Let me know if you'd like to proceed!");
      setThread(updated);
    }
  };

  const handleHireUpfront = () => {
    const updated = markUpfrontPaid(thread.id);
    if (updated) {
      setPaidUpfront(true);
      addMessage(thread.id, "tenant", "I've hired you and paid the 50% deposit. Let's get started!");
      setThread(updated);
    }
  };

  const handleJobDone = () => {
    const updated = setPaymentDeadline(thread.id);
    if (updated) {
      addMessage(thread.id, "worker", "Job is done! Please confirm and release payment.");
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Job completed", {
          body: `${thread.workerName} marked the job as done. Please confirm within 20 minutes.`,
        });
      }
      setThread(updated);
    }
  };

  const handleConfirmJob = () => {
    const updated = updateStatus(thread.id, "completed");
    if (updated) {
      addMessage(thread.id, "tenant", "Job confirmed! Payment released. Thank you!");
      setThread(updated);
    }
  };

  const handleOpenReport = () => {
    setShowReport(true);
    setReportReason("Harassment");
    setReportProof([]);
    setReportSubmitted(false);
    setShowReasonPicker(false);
  };

  const handleAddReportProof = () => {
    const seed = `report-${Date.now()}`;
    setReportProof((prev) => [...prev, `https://picsum.photos/seed/${seed}/400/400`]);
  };

  const handleSubmitReport = () => {
    submitReport({
      threadId: thread.id,
      reporterRole: isWorker ? "worker" : "tenant",
      reporterName: isWorker ? thread.workerName : thread.tenantName,
      reportedUser: isWorker ? thread.tenantName : thread.workerName,
      reason: reportReason,
      proof: reportProof,
    });
    setReportSubmitted(true);
    setTimeout(() => {
      setShowReport(false);
    }, 1500);
  };

  const formatTime = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${s.toString().startsWith("0") ? s.toString().padStart(2, "0") : s}`;
  };

  return (
    <div className={[styles.page, "page-content"].join(" ")}>
      <div className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)} type="button">
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <img src={thread.workerProfilePic} alt="" className={styles.avatar} />
        <div className={styles.headerInfo}>
          <p className={styles.headerName}>{thread.workerName}</p>
          <p className={styles.headerStatus}>{thread.status === "completed" ? "Completed" : thread.status === "hired" ? "Hired" : thread.status === "job_done" ? "Done" : thread.status === "available" ? "Available" : "Inquiry"}</p>
        </div>
        <button className={styles.reportHeaderBtn} onClick={handleOpenReport} type="button" aria-label="Report user">
          <Flag size={14} strokeWidth={2} />
        </button>
      </div>

      {(thread.status === "job_done" || thread.status === "completed") && countdown !== null && (
        <div className={[styles.timerBar, autoPaid ? styles.timerExpired : ""].filter(Boolean).join(" ")}>
          <Clock size={14} strokeWidth={2} />
          {autoPaid
            ? "Auto-paid. Payment released to worker."
            : `Auto-pay in ${formatTime(countdown)}`}
        </div>
      )}

      <div className={styles.chat}>
        {thread.messages.map((msg) => (
          <div key={msg.id} className={[styles.bubble, msg.sender === (isWorker ? "worker" : "tenant") ? styles.mine : styles.theirs].filter(Boolean).join(" ")}>
            <p className={styles.bubbleText}>{msg.text}</p>
            <span className={styles.bubbleTime}>
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.footer}>
        {!isWorker && thread.status === "available" && !paidUpfront && (
          <div className={styles.actionBar}>
            <p className={styles.actionHint}>{thread.budget} · 50% upfront, remainder on completion</p>
            <button className={styles.hireBtn} onClick={handleHireUpfront} type="button">
              <Briefcase size={16} strokeWidth={2.5} /> Hire & Pay 50% Upfront
            </button>
          </div>
        )}

        {isWorker && thread.status === "inquiring" && (
          <div className={styles.actionBar}>
            <button className={styles.availBtn} onClick={handleAvailable} type="button">
              <CheckCircle size={16} strokeWidth={2.5} /> Available for Hire
            </button>
          </div>
        )}

        {isWorker && thread.status === "hired" && (
          <div className={styles.actionBar}>
            <button className={styles.doneBtn} onClick={handleJobDone} type="button">
              <ShieldCheck size={16} strokeWidth={2.5} /> Job Done
            </button>
          </div>
        )}

        {!isWorker && thread.status === "job_done" && !autoPaid && (
          <div className={styles.actionBar}>
            <p className={styles.actionHint}>Confirm within 20 minutes or payment auto-releases</p>
            <button className={styles.confirmBtn} onClick={handleConfirmJob} type="button">
              <CheckCircle size={16} strokeWidth={2.5} /> Confirm Job
            </button>
          </div>
        )}

        {(thread.status === "inquiring" || thread.status === "available" || thread.status === "hired") && (
          <div className={styles.inputRow}>
            <textarea
              className={styles.input}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
            />
            <button className={styles.sendBtn} onClick={handleSend} disabled={!text.trim()} type="button">
              <Send size={16} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {(thread.status === "completed" || thread.status === "cancelled") && (
          <p className={styles.endedLabel}>
            {thread.status === "completed" ? "Job completed" : "Cancelled"} · chat is read-only
          </p>
        )}
      </div>

      {showReport && (
        <div className={styles.overlay} onClick={() => { if (!reportSubmitted) setShowReport(false); }}>
          <div className={styles.reportSheet} onClick={(e) => e.stopPropagation()}>
            {reportSubmitted ? (
              <div className={styles.reportSuccess}>
                <ShieldAlert size={40} strokeWidth={1.5} />
                <h3>Report submitted</h3>
                <p>An admin will review this within 24 hours. If action is taken, the user's trust score will be adjusted.</p>
              </div>
            ) : (
              <>
                <div className={styles.reportHeader}>
                  <h3>Report {isWorker ? "tenant" : "worker"}</h3>
                  <button className={styles.reportClose} onClick={() => setShowReport(false)} type="button"><X size={18} strokeWidth={2} /></button>
                </div>
                <p className={styles.reportTarget}>Reporting: <strong>{isWorker ? thread.tenantName : thread.workerName}</strong></p>
                <p className={styles.reportTarget}>Thread: {thread.title}</p>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Reason</label>
                  <button className={styles.reasonBtn} onClick={() => setShowReasonPicker((v) => !v)} type="button">
                    {reportReason} <ChevronDown size={14} strokeWidth={2} />
                  </button>
                  {showReasonPicker && (
                    <div className={styles.reasonPicker}>
                      {reportReasons.map((r) => (
                        <button key={r} className={[styles.reasonOption, r === reportReason ? styles.reasonOptionActive : ""].filter(Boolean).join(" ")} onClick={() => { setReportReason(r); setShowReasonPicker(false); }} type="button">
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Proof (optional)</label>
                  <div className={styles.proofGrid}>
                    {reportProof.map((src, i) => (
                      <div key={i} className={styles.proofThumb}>
                        <img src={src} alt="" />
                      </div>
                    ))}
                    <button className={styles.addProofBtn} onClick={handleAddReportProof} type="button">
                      <Upload size={18} strokeWidth={2} /> Add
                    </button>
                  </div>
                </div>
                <button className={styles.submitBtn} onClick={handleSubmitReport} type="button">
                  <ShieldAlert size={14} strokeWidth={2.5} /> Submit report
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
