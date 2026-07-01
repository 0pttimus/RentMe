import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import styles from "./RepairRequestPage.module.scss";

export default function RepairRequestPage() {
  const navigate = useNavigate();

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <button className={styles.back} onClick={() => navigate(-1)} type="button">
        <ChevronLeft size={22} strokeWidth={2.5} />
      </button>
      <h1 className={styles.heading}>What needs fixing?</h1>
      <p className={styles.sub}>No service categories available yet.</p>
    </div>
  );
}
