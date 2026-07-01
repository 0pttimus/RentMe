import { useEffect } from "react";
import { X } from "lucide-react";
import styles from "./BottomSheet.module.scss";

type BottomSheetProps = {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
};

export function BottomSheet({ open, title, children, onClose }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className={styles.root} role="presentation">
      <button
        type="button"
        aria-label="Close sheet"
        className={styles.scrim}
        onClick={onClose}
      />
      <section className={styles.sheet} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.grabber} />
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button type="button" aria-label="Close" className={styles.closeBtn} onClick={onClose}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </section>
    </div>
  );
}
