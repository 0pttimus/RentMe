import styles from "./Card.module.scss";

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children }: CardProps) {
  return <div className={[styles.card, className].filter(Boolean).join(" ")}>{children}</div>;
}