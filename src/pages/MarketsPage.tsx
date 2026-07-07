import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import { ProfileAvatarButton } from "@/components/ProfileAvatarButton";
import { rentalCategories } from "@/lib/market-categories";
import { useAppSelector } from "@/store/hooks";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import styles from "./MarketsPage.module.scss";

export default function MarketsPage() {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const [search, setSearch] = useState("");
  const { count: unread } = useUnreadCount();

  const firstName = user?.fullName?.split(" ")[0] ?? "Guest";
  const initials = user?.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("")
    : "G";
  const avatarUrl = user?.avatarUrl ?? undefined;

  const filtered = rentalCategories.filter(
    (c) => !search.trim() || c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <div className="page-header">
        <div className={styles.headerRow}>
          <div>
            <h1>Markets</h1>
            <p>Good morning, {firstName}</p>
          </div>
          <div className={styles.topActions}>
            <Link to="/notifications" aria-label="Notifications" className={styles.iconLink}>
              <Bell size={20} className={styles.bellIcon} strokeWidth={1.75} />
              {unread > 0 && <span className={styles.badge}>{unread}</span>}
            </Link>
            <ProfileAvatarButton initials={initials} avatarUrl={avatarUrl} onClick={() => navigate("/profile")} />
          </div>
        </div>
      </div>

      <label className={styles.searchBar}>
        <Search size={15} className={styles.searchIcon} strokeWidth={1.75} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories..."
        />
      </label>

      <p className={styles.subtitle}>What do you want to rent?</p>

      <div className={`${styles.grid} stagger-in`}>
        {filtered.map((cat) => (
          <Link key={cat.slug} to={`/markets/category/${cat.slug}`} className={styles.card}>
            <span className={styles.emoji}>{cat.emoji}</span>
            <span className={styles.catName}>{cat.name}</span>
            <span className={styles.catDesc}>{cat.description}</span>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className={styles.empty}>
          <p>No categories match "{search}"</p>
        </div>
      )}
    </div>
  );
}
