import { Briefcase, ArrowLeft } from "lucide-react";
import styles from "./FreelanceConfirmModal.module.scss";

type Props = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function FreelanceConfirmModal({ open, onConfirm, onCancel }: Props) {
  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onCancel} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.iconWrap}>
          <Briefcase size={28} strokeWidth={1.5} />
        </div>
        <h2 className={styles.heading}>Switch to Freelance?</h2>
        <p className={styles.body}>
          You'll enter your freelance workspace where you can manage gigs, connect with
          clients, and track your earnings. Your tenant/landlord account stays untouched
          You can switch back anytime.
        </p>
        <div className={styles.actions}>
          <button className={styles.confirmBtn} onClick={onConfirm} type="button">
            Switch to Freelance
          </button>
          <button className={styles.cancelBtn} onClick={onCancel} type="button">
            <ArrowLeft size={16} strokeWidth={2} />
            Stay here
          </button>
        </div>
      </div>
    </div>
  );
}
