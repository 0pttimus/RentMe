import styles from "./ProfileAvatarButton.module.scss";

interface ProfileAvatarButtonProps {
  initials: string;
  avatarUrl?: string;
  onClick: () => void;
  className?: string;
}

export function ProfileAvatarButton({
  initials,
  avatarUrl,
  onClick,
  className,
}: ProfileAvatarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Profile"
      className={[styles.button, className].filter(Boolean).join(" ")}
    >
      {avatarUrl ? <img src={avatarUrl} alt="" className={styles.img} /> : initials}
    </button>
  );
}