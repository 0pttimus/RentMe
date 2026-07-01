import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { switchToTl } from "@/store/slices/accountSlice";
import styles from "./FreelanceWalletPage.module.scss";

export default function FreelanceWalletPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <div className="page-header">
        <div className={styles.headerRow}>
          <div>
            <h1>Wallet</h1>
            <p>Freelance earnings</p>
          </div>
          <button
            className={styles.exitBtn}
            onClick={() => { dispatch(switchToTl()); navigate("/markets"); }}
            type="button"
          >
            <LogOut size={14} strokeWidth={2} />
            Exit
          </button>
        </div>
      </div>

      <div className={styles.balance}>
        <p className={styles.balanceLabel}>Available balance</p>
        <p className={styles.balanceValue}>₦0</p>
        <button className={styles.withdrawBtn} type="button">Withdraw</button>
      </div>

      <div className={styles.list}>
        <p className={styles.empty}>No transactions yet.</p>
      </div>
    </div>
  );
}
