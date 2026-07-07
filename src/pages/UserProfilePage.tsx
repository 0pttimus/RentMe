import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, Star, ShieldCheck, Calendar } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatNaira, formatStatus } from "@/lib/format";
import styles from "./UserProfilePage.module.scss";

interface UserData {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  kycStatus: string;
  trustScore: number;
  trustLevel: string;
  memberSince: string;
}

interface RentalItem {
  id: string;
  status: string;
  createdAt: string;
  propertyId: string;
  title: string;
  photos: string;
  rentAmountNgn: number;
  rentPeriod: string;
  city: string;
  state: string;
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserData | null>(null);
  const [rentals, setRentals] = useState<RentalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const api = import.meta.env.VITE_API_URL ?? "";
    fetch(`${api}/users/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setUser(data.user);
        setRentals(data.rentalHistory ?? []);
      })
      .catch(() => setError("Could not load user profile."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-content"><div className="spinnerWrap"><div className="spinner" /></div></div>;
  if (error) return <div className="page-content"><p>{error}</p></div>;
  if (!user) return <div className="page-content"><p>User not found.</p></div>;

  return (
    <div className="page-content">
      <div className={styles.header}>
        <div className={styles.avatarWrap}>
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" className={styles.avatar} /> : <div className={styles.avatarPlaceholder}>{user.fullName[0]?.toUpperCase()}</div>}
        </div>
        <h1 className={styles.name}>{user.fullName}</h1>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${user.kycStatus === "verified" ? styles.badgeGreen : styles.badgeGray}`}>
            <ShieldCheck size={12} strokeWidth={2.5} /> KYC: {user.kycStatus}
          </span>
          <span className={styles.badge}>
            <Star size={12} strokeWidth={2.5} /> Trust: {user.trustScore}
          </span>
        </div>
        <p className={styles.memberSince}><Calendar size={11} strokeWidth={2} /> Member since {new Date(user.memberSince).toLocaleDateString("en-US", { year: "numeric", month: "short" })}</p>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Rental History ({rentals.length})</h2>
        {rentals.length === 0 ? (
          <Card className={styles.emptyCard}><p>No rental history yet.</p></Card>
        ) : (
          <div className={styles.rentalList}>
            {rentals.map(r => {
              const photos = (() => { try { return JSON.parse(r.photos); } catch { return []; } })();
              return (
                <Link to={`/property/${r.propertyId}`} key={r.id} className={styles.rentalCard}>
                  {photos.length > 0 && <img src={photos[0]} alt="" className={styles.rentalImage} />}
                  <div className={styles.rentalBody}>
                    <h3 className={styles.rentalTitle}>{r.title}</h3>
                    <p className={styles.rentalLocation}><MapPin size={11} strokeWidth={2} />{r.city}, {r.state}</p>
                    <p className={styles.rentalPrice}>{formatNaira(r.rentAmountNgn)}<span className={styles.rentalPeriod}>/{r.rentPeriod}</span></p>
                    <p className={styles.rentalStatus}>{formatStatus(r.status)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
