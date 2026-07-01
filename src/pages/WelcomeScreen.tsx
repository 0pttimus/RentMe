import { useNavigate } from "react-router-dom";
import styles from "./WelcomeScreen.module.scss";

export default function WelcomeScreen() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.art}>
          <svg viewBox="0 0 240 200" fill="none" className={styles.artSvg}>
            <rect x="60" y="70" width="120" height="100" rx="12" className={styles.houseBody} />
            <polygon points="40,85 120,30 200,85" className={styles.roof} />
            <rect x="95" y="110" width="22" height="55" rx="4" className={styles.door} />
            <rect x="130" y="95" width="20" height="20" rx="4" className={styles.window} />
            <rect x="130" y="120" width="20" height="20" rx="4" className={styles.window} />
            <rect x="155" y="95" width="20" height="20" rx="4" className={styles.window} />
            <rect x="155" y="120" width="20" height="20" rx="4" className={styles.window} />
            <circle cx="160" cy="105" r="3" className={styles.windowAccent} />
            <rect x="100" y="10" width="40" height="40" rx="8" className={styles.chimney} />
            <circle cx="72" cy="160" r="14" className={styles.bubble} />
            <circle cx="175" cy="52" r="10" className={styles.bubbleSmall} />
            <ellipse cx="60" cy="180" rx="50" ry="8" className={styles.ground} />
            <ellipse cx="180" cy="180" rx="60" ry="8" className={styles.ground} />
          </svg>
        </div>

        <div className={styles.textBlock}>
          <h1 className={styles.title}>
            <span className={styles.titleRent}>Rent</span>
            <span className={styles.titleMe}>Me</span>
          </h1>
          <p className={styles.subtitle}>The easiest way to rent anything.</p>
        </div>
      </div>

      <div className={styles.footer}>
        <button
          className={styles.createBtn}
          onClick={() => navigate("/auth?mode=signup")}
          type="button"
        >
          Create Account
        </button>
        <button
          className={styles.signInBtn}
          onClick={() => navigate("/auth?mode=signin")}
          type="button"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
