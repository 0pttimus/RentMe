import { Link, useLocation } from "react-router-dom";
import { Store, LayoutDashboard, Wallet, Wrench, Home } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import styles from "./SidebarNav.module.scss";

const tabs = [
  { href: "/markets", label: "Markets", icon: Store },
  { href: "/portal", label: "Portal", icon: LayoutDashboard },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/hire", label: "Hire", icon: Wrench },
];

export default function SidebarNav() {
  const { pathname } = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  const initials = user?.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("")
    : "G";

  const avatarUrl = user?.avatarUrl ?? undefined;

  return (
    <nav className={styles.sidebar}>
      <Link to="/" className={styles.logo}>
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
        <Link to="/profile" className={styles.profile}>
          <div className={styles.avatar}>
            {avatarUrl ? <img src={avatarUrl} alt="" className={styles.avatarImg} /> : initials}
          </div>
        </Link>
      </div>
    </nav>
  );
}
