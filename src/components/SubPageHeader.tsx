import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import styles from "./SubPageHeader.module.scss";

interface SubPageHeaderProps {
  title: string;
  subtitle?: string;
  prevTitle?: string;
  backHref?: string;
}

export function SubPageHeader({
  title,
  subtitle,
  prevTitle = "Back",
  backHref,
}: SubPageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else if (backHref) {
      navigate(backHref);
    }
  };

  return (
    <div className={styles.header}>
      <button type="button" onClick={handleBack} className={styles.back} aria-label="Back">
        <ChevronLeft size={22} strokeWidth={3} />
        <span className={styles.backLabel}>{prevTitle}</span>
      </button>
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  );
}
