import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { ProfilePanel } from "./ProfilePanel";
import styles from "./ProfileOverlay.module.scss";

interface ProfileOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileOverlay({ open, onClose }: ProfileOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  function handleTransitionEnd() {
    if (!visible) setMounted(false);
  }

  if (!mounted) return null;

  return (
    <div
      className={[styles.overlay, visible ? styles.overlayOpen : ""].filter(Boolean).join(" ")}
      onTransitionEnd={handleTransitionEnd}
    >
      <div className={styles.header}>
        <button type="button" onClick={onClose} className={styles.back}>
          <ChevronLeft size={15} strokeWidth={2} />
          Back
        </button>
        <h1 className={styles.title}>Profile</h1>
      </div>

      <div className={[styles.scroll, "ios-scroll"].join(" ")}>
        <ProfilePanel onNavigate={onClose} />
      </div>
    </div>
  );
}