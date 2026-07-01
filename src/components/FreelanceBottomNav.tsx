import { Link, useLocation } from "react-router-dom";
import { Home, LayoutDashboard, Wallet } from "lucide-react";
import styles from "./BottomNav.module.scss";

const tabs = [
  { href: "/freelance/home", label: "Home", icon: Home },
  { href: "/freelance/portal", label: "Portal", icon: LayoutDashboard },
  { href: "/freelance/wallet", label: "Wallet", icon: Wallet },
];

export default function FreelanceBottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className={styles.nav}>
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            to={href}
            className={[styles.tab, active ? styles.active : ""].filter(Boolean).join(" ")}
          >
            <Icon size={24} strokeWidth={active ? 2.5 : 1.8} />
            <span className={styles.label}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
