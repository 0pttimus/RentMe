import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Bookmark, Trash2, AlertTriangle } from "lucide-react";
import { SubPageHeader } from "@/components/SubPageHeader";
import ActionSheet from "@/components/ui/ActionSheet";
import { getBookmarks, removeBookmark } from "@/lib/api/client";
import styles from "./SavedPage.module.scss";

export default function SavedPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const fetch = () =>
    getBookmarks().then((res) => {
      if (res.data?.bookmarks) setItems(res.data.bookmarks);
      setLoading(false);
    });

  useEffect(() => { fetch(); }, []);

  const handleRemove = async (propertyId: string) => {
    await removeBookmark(propertyId);
    setItems((prev) => prev.filter((i) => i.property_id !== propertyId));
    setRemoveTarget(null);
  };

  const available = (s: string) => s === "available" || s === "pending_verification" || s === "verified";

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <SubPageHeader title="Saved Properties" prevTitle="Profile" backHref="/profile" />
      {loading ? (
        <div className="spinnerWrap"><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <Bookmark size={40} strokeWidth={1.5} />
          <p>No saved properties yet.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {items.map((item) => {
            const photos = safeParse(item.photos);
            const isUnavailable = !available(item.status);
            return (
              <div key={item.property_id} className={`${styles.card} ${isUnavailable ? styles.cardUnavailable : ""}`}>
                <Link to={`/property/${item.property_id}`} className={styles.cardLink}>
                  <div className={styles.cardImage}>
                    {photos.length > 0 ? (
                      <img src={photos[0]} alt="" />
                    ) : (
                      <div className={styles.cardImagePlaceholder} />
                    )}
                    {isUnavailable && (
                      <div className={styles.unavailableBadge}>
                        <AlertTriangle size={12} strokeWidth={2.5} />
                        No longer available
                      </div>
                    )}
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardTitleRow}>
                      <h3 className={styles.cardTitle}>{item.title}</h3>
                      {isUnavailable && <span className={styles.removedTag}>Rented</span>}
                    </div>
                    <p className={styles.cardLocation}>
                      <MapPin size={11} strokeWidth={2} />
                      {item.city}, {item.state}
                    </p>
                    <p className={`${styles.cardPrice} ${isUnavailable ? styles.priceStrike : ""}`}>
                      ₦{Number(item.rent_amount_ngn).toLocaleString()}
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => setRemoveTarget(item.property_id)}
                  aria-label="Remove bookmark"
                >
                  <Trash2 size={15} strokeWidth={2} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {removeTarget && (
        <ActionSheet
          options={[
            { label: "Remove from saved", destructive: true, onClick: () => handleRemove(removeTarget) },
          ]}
          onClose={() => setRemoveTarget(null)}
        />
      )}
    </div>
  );
}

function safeParse(v: string): string[] {
  try { return JSON.parse(v); } catch { return []; }
}
