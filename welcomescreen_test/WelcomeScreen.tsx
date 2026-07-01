import styles from "./WelcomeScreen.module.scss";

interface Props {
  onCreateAccount: () => void;
  onSignIn: () => void;
}

export default function WelcomeScreen({ onCreateAccount, onSignIn }: Props) {
  return (
    <div className={styles.page}>
      {/* decorative bg circle top-right — matches the design image */}
      <div className={styles.bgCircle} />

      {/* top section: logo + title + subtitle */}
      <div className={styles.top}>
        {/* app icon — real logo */}
        <img
          src="/rentme-logo.png"
          alt="RentMe"
          className={styles.appIcon}
          draggable={false}
        />

        <h1 className={styles.title}>
          <span className={styles.titleRent}>Rent</span>
          <span className={styles.titleMe}>Me</span>
        </h1>

        <p className={styles.subtitle}>
          The easiest way<br />to rent anything.
        </p>
      </div>

      {/* hero illustration — real image from design */}
      <div className={styles.illustration}>
        <img
          src="/house-illustration.png"
          alt=""
          className={styles.illustrationImg}
          draggable={false}
        />
      </div>

      {/* bottom buttons */}
      <div className={styles.footer}>
        <button
          className={styles.createBtn}
          onClick={onCreateAccount}
          type="button"
        >
          Create Account
        </button>
        <button
          className={styles.signInBtn}
          onClick={onSignIn}
          type="button"
        >
          Sign In
        </button>
        {/* home indicator */}
        <div className={styles.homeIndicator} />
      </div>
    </div>
  );
}
