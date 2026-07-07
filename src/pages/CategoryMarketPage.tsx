import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, MapPin, SlidersHorizontal, ShieldCheck } from "lucide-react";
import { getCategory, CATEGORY_PROPERTY_TYPES, type RentalCategory } from "@/lib/market-categories";
import { getProperties, getMyReservations } from "@/lib/api/client";
interface RentalItem { id: string; category: string; title: string; images: string[]; location: string; area: string | null; state: string; price: number; priceLabel: string; verified: boolean; rentPeriod: string; specs: Record<string, string>; provider: { initials: string; name: string; avatar: string | null }; verificationCount: number; landlordId: string; rejectedByLandlord: boolean }
import LocationPicker from "@/components/LocationPicker";
import styles from "./CategoryMarketPage.module.scss";

export default function CategoryMarketPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const category = getCategory(slug ?? "");

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [location, setLocation] = useState<string | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  const [filterState, setFilterState] = useState<Record<string, string>>({});
  const [items, setItems] = useState<RentalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const matchingTypes = CATEGORY_PROPERTY_TYPES[slug ?? ""] ?? [];
    Promise.all([
      getProperties(matchingTypes),
      getMyReservations().catch(() => ({ data: null })),
    ]).then(([propRes, reservRes]) => {
      if (!propRes.data?.properties) return;
      const rejectedLandlords = new Set(
        (reservRes?.data?.reservations ?? [])
          .filter((r: any) => r.status === "rejected" && r.landlord_id)
          .map((r: any) => r.landlord_id)
      );
      const mapped: RentalItem[] = propRes.data.properties
        .map((p: any) => ({
          id: p.id,
          category: p.propertyType,
          title: p.title,
          images: p.photos ?? [],
          location: p.area || p.city,
          area: p.area,
          state: p.state,
          price: p.rentAmountNgn,
          priceLabel: category?.priceLabel ?? "",
          rentPeriod: p.rentPeriod ?? "yearly",
          verified: p.isVerified === 1,
          verificationCount: p.verificationCount ?? 0,
          specs: {
            bedrooms: String(p.bedrooms),
            bathrooms: String(p.bathrooms),
          },
          provider: { initials: p.landlordInitials, name: p.landlordName, avatar: p.landlordAvatar ?? null },
          landlordId: p.landlordId,
          rejectedByLandlord: rejectedLandlords.has(p.landlordId),
        }));
      setItems(mapped);
      setLoading(false);
    });
  }, [slug]);

  if (!category) return <Navigate to="/markets" replace />;

  const setFilter = (key: string, value: string) => {
    setFilterState((prev) => ({ ...prev, [key]: value === "Any" ? "" : value }));
  };

  const locationLabel = useMemo(() => {
    if (!location) return "All locations";
    if (location.includes("::")) {
      const [st, area] = location.split("::");
      return `${area}, ${st}`;
    }
    return location;
  }, [location]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesPrice = (!priceMin || item.price >= Number(priceMin)) &&
        (!priceMax || item.price <= Number(priceMax));

      let matchesLocation = true;
      if (location) {
        if (location.includes("::")) {
          const [st, area] = location.split("::");
          matchesLocation = item.state === st && item.location === area;
        } else {
          matchesLocation = item.state === location;
        }
      }

      const matchesFilters = category.filters.every((f) => {
        const val = filterState[f.key];
        if (!val) return true;
        return item.specs[f.key]?.toLowerCase() === val.toLowerCase();
      });
      return matchesPrice && matchesLocation && matchesFilters;
    });
  }, [items, priceMin, priceMax, location, filterState, category.filters]);

  const activeFilterCount =
    (priceMin ? 1 : 0) + (priceMax ? 1 : 0) + (location ? 1 : 0) +
    Object.values(filterState).filter(Boolean).length;

  const resetFilters = () => {
    setPriceMin("");
    setPriceMax("");
    setLocation(null);
    setFilterState({});
  };

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <div className={styles.header}>
        <button type="button" onClick={() => navigate(-1)} className={styles.back}>
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
        <div>
          <h1 className={styles.heading}>
            <span className={styles.headingEmoji}>{category.emoji}</span>
            {category.name}
          </h1>
          <p className={styles.sub}>{!loading && `${filtered.length} of ${items.length} items`}</p>
        </div>
      </div>

      <div className={styles.searchRow}>
        <div className={styles.locationWrap}>
          <button className={styles.locationBtn} onClick={() => setLocationPickerOpen(true)} type="button">
            <MapPin size={14} strokeWidth={1.75} />
            <span className={location ? styles.locationValue : styles.locationPlaceholder}>
              {locationLabel}
            </span>
          </button>
          {location && (
            <button className={styles.locationClear} onClick={() => setLocation(null)} type="button" aria-label="Clear location">
              ✕
            </button>
          )}
        </div>
        <button
          className={[styles.filterBtn, filtersOpen ? styles.filterBtnActive : ""].filter(Boolean).join(" ")}
          onClick={() => setFiltersOpen((v) => !v)}
          type="button"
        >
          <SlidersHorizontal size={14} strokeWidth={2.2} />
          Filters
          {activeFilterCount > 0 && <span className={styles.filterCount}>{activeFilterCount}</span>}
        </button>
      </div>

      {filtersOpen && (
        <div className={styles.filterPanel}>
          <div className={styles.filterHeader}>
            <p className={styles.filterTitle}>Refine</p>
            <button className={styles.resetBtn} onClick={resetFilters} type="button">Reset</button>
          </div>

          <div className={styles.filterSection}>
            <p className={styles.filterLabel}>Price{category.priceLabel}</p>
            <div className={styles.priceGrid}>
              <input placeholder="Min" inputMode="numeric" value={priceMin}
                onChange={(e) => setPriceMin(e.target.value.replace(/\D/g, ""))} />
              <input placeholder="Max" inputMode="numeric" value={priceMax}
                onChange={(e) => setPriceMax(e.target.value.replace(/\D/g, ""))} />
            </div>
          </div>

          {category.filters.map((f) => (
            <div key={f.key} className={styles.filterSection}>
              <p className={styles.filterLabel}>{f.label}</p>
              {f.type === "segmented" || f.type === "select" ? (
                <div className={styles.segmented}>
                  {(f.options ?? []).map((opt) => (
                    <button
                      key={opt}
                      className={(!filterState[f.key] && opt === "Any") || filterState[f.key] === opt ? styles.segActive : ""}
                      onClick={() => setFilter(f.key, opt)}
                      type="button"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className={styles.list}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className="spinner" />
            <p className={styles.loadingText}>Searching for you, we'll display them shortly.</p>
          </div>
        ) : filtered.length === 0 && items.length === 0 ? (
          <div className={styles.empty}>
            <p>No listings in this category yet.</p>
            <p className={styles.emptyHint}>We're adding new listings every day. Check back soon or browse other categories.</p>
            <button onClick={() => navigate("/markets")} type="button">Browse categories</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <p>No listings match these filters.</p>
            <p className={styles.emptyHint}>Try different filters or check back — we add new listings daily.</p>
            <button onClick={resetFilters} type="button">Clear filters</button>
          </div>
        ) : (
          filtered.map((item) => (
            <RentalCard key={item.id} item={item} category={category} />
          ))
        )}
      </div>

      {locationPickerOpen && (
        <LocationPicker
          items={items}
          selected={location}
          onSelect={(v) => { setLocation(v); }}
          onClose={() => setLocationPickerOpen(false)}
        />
      )}
    </div>
  );
}

function RentalCard({ item, category }: { item: RentalItem; category: RentalCategory }) {
  const specs = category.filters
    .filter((f) => item.specs[f.key])
    .map((f) => `${f.label}: ${item.specs[f.key]}`);

  return (
    <Link to={`/property/${item.id}`} className={styles.card}>
      <div className={styles.cardImage}>
        <img src={item.images[0] ?? ""} alt={item.title} />
        {item.verificationCount >= 5 ? (
          <span className={styles.verifiedBadge}>
            <ShieldCheck size={10} strokeWidth={2.5} />
            Verified
          </span>
        ) : (
          <span className={styles.verifyCount}>{item.verificationCount}/5 verified</span>
        )}
        {item.rejectedByLandlord && (
          <span className={styles.rejectedBadge}>Previously rejected</span>
        )}
      </div>
      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>{item.title}</h3>
        <p className={styles.cardLocation}>
          <MapPin size={11} strokeWidth={2} />
          {item.location}, {item.state}
        </p>
        <p className={styles.cardPrice}>
          ₦{item.price.toLocaleString()}
          <span className={styles.cardPriceLabel}> / {item.rentPeriod}</span>
        </p>
        <div className={styles.cardSpecs}>
          {specs.slice(0, 3).map((s, i) => (
            <span key={i} className={styles.specPill}>{s}</span>
          ))}
        </div>
        <div className={styles.cardProvider}>
          {item.provider.avatar ? (
            <img src={item.provider.avatar} alt="" className={styles.providerAvatar} />
          ) : (
            <span className={styles.providerInitials}>{item.provider.initials}</span>
          )}
          <span className={styles.providerName}>{item.provider.name}</span>
        </div>
      </div>
    </Link>
  );
}
