import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { switchToTl } from "@/store/slices/accountSlice";
import styles from "./FreelanceHomePage.module.scss";

export default function FreelanceHomePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleExit = () => {
    dispatch(switchToTl());
    navigate("/markets");
  };

  return (
    <div className={[styles.page, "page-content"].join(" ")}>
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>No profile yet</p>
        <p className={styles.emptyText}>Complete your freelance profile to get started.</p>
        <button className={styles.switchBtn} onClick={handleExit} type="button">
          <LogOut size={16} strokeWidth={2} />
          Switch to Tenant / Landlord
        </button>
      </div>
    </div>
  );
}
