import { useEffect } from "react";
import styles from "./ActionSheet.module.scss";

interface Option {
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

interface Props {
  options: Option[];
  onClose: () => void;
  title?: string;
  description?: string;
}

export default function ActionSheet({ options, onClose, title, description }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.sheet}>
        {(title || description) && (
          <div className={styles.header}>
            {title && <p className={styles.title}>{title}</p>}
            {description && <p className={styles.description}>{description}</p>}
          </div>
        )}
        <div className={styles.group}>
          {options.map((opt, i) => (
            <button key={i} type="button"
              className={[styles.option, opt.destructive ? styles.destructive : ""].join(" ")}
              onClick={() => { opt.onClick(); onClose(); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className={styles.cancel}>
          <button type="button" className={styles.option} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </>
  );
}
