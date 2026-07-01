import { Link, useLocation } from "react-router-dom";
import { Store, LayoutDashboard, Wallet, Wrench } from "lucide-react";
import styles from "./BottomNav.module.scss";

const tabs = [
  { href: "/markets", label: "Markets", icon: Store },
  { href: "/portal", label: "Portal", icon: LayoutDashboard },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/hire", label: "Hire", icon: Wrench },
];

export default function BottomNav() {
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
