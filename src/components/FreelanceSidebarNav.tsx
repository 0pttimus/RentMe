import { Link, useLocation } from "react-router-dom";
import { Home, LayoutDashboard, Wallet } from "lucide-react";
import styles from "./SidebarNav.module.scss";

const tabs = [
  { href: "/freelance/home", label: "Home", icon: Home },
  { href: "/freelance/portal", label: "Portal", icon: LayoutDashboard },
  { href: "/freelance/wallet", label: "Wallet", icon: Wallet },
];

export default function FreelanceSidebarNav() {
  const { pathname } = useLocation();
  const initials = "RM";

  return (
    <nav className={styles.sidebar}>
      <Link to="/freelance/home" className={styles.logo}>
        <Home size={18} strokeWidth={1.8} />
        <span>RentMe</span>
      </Link>

      <div className={styles.nav}>
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              to={href}
              className={[styles.link, active ? styles.active : ""].filter(Boolean).join(" ")}
            >
              <Icon size={16} strokeWidth={active ? 2.2 : 1.7} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>

      <div className={styles.footer}>
        <Link to="/freelance/home" className={styles.profile}>
          <div className={styles.avatar}>{initials}</div>
        </Link>
      </div>
    </nav>
  );
}
