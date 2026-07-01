import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import { ProfileAvatarButton } from "@/components/ProfileAvatarButton";
import { ProfileOverlay } from "@/components/ProfileOverlay";
import { rentalCategories } from "@/lib/market-categories";
import { useAppSelector } from "@/store/hooks";
import styles from "./MarketsPage.module.scss";

export default function MarketsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState("");

  const firstName = user?.fullName?.split(" ")[0] ?? "Guest";
  const initials = user?.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("")
    : "G";
  const stored = typeof localStorage !== "undefined" ? localStorage.getItem("rentme_profile_extras") : null;
  const avatarUrl: string | undefined = stored ? (JSON.parse(stored).avatarUrl ?? undefined) : undefined;

  const filtered = rentalCategories.filter(
    (c) => !search.trim() || c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
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
              </Link>
              <ProfileAvatarButton initials={initials} avatarUrl={avatarUrl} onClick={() => setProfileOpen(true)} />
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

        <div className={styles.grid}>
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

      <ProfileOverlay open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
