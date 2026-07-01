import { useMemo, useState } from "react";
import { ChevronLeft, MapPin, Search } from "lucide-react";
const buildLocationIndex = (_slug?: string) => [] as { state: string; total: number; areas: { name: string; count: number }[] }[];
import styles from "./LocationPicker.module.scss";

type View = "states" | "areas";

type Props = {
  categorySlug?: string;
  selected: string | null; // "state" or "state::area"
  onSelect: (value: string | null) => void; // null to clear, "state" for all, "state::area" for specific
  onClose: () => void;
};

export default function LocationPicker({ categorySlug, selected, onSelect, onClose }: Props) {
  const [view, setView] = useState<View>("states");
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const index = useMemo(() => buildLocationIndex(categorySlug), [categorySlug]);

  const withListings = index.filter((s) => s.total > 0);
  const withoutListings = index.filter((s) => s.total === 0);

  const filteredStates = useMemo(() => {
    const all = [...withListings, ...withoutListings];
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter((s) => s.state.toLowerCase().includes(q));
  }, [withListings, withoutListings, query]);

  const stateData = selectedState ? index.find((s) => s.state === selectedState) : null;

  const activeState = selected?.includes("::") ? selected.split("::")[0] : selected;

  function handleStateClick(state: string) {
    setSelectedState(state);
    setQuery("");
    setView("areas");
  }

  function handleAllState(state: string) {
    onSelect(state);
    onClose();
  }

  function handleAreaClick(state: string, area: string) {
    onSelect(`${state}::${area}`);
    onClose();
  }

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.panel}>
        <div className={styles.header}>
          {view === "areas" ? (
            <button className={styles.backBtn} onClick={() => { setView("states"); setSelectedState(null); }} type="button">
              <ChevronLeft size={20} strokeWidth={1.8} />
              <span>States</span>
            </button>
          ) : (
            <span className={styles.headerTitle}>Select location</span>
          )}
          <button className={styles.closeBtn} onClick={onClose} type="button">Close</button>
        </div>

        {view === "states" && (
          <label className={styles.search}>
            <Search size={14} strokeWidth={1.75} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search states..."
            />
          </label>
        )}

        <div className={styles.list}>
          {view === "states" ? (
            filteredStates.map((s) => (
              <LocationStateRow
                key={s.state}
                state={s.state}
                count={s.total}
                active={activeState === s.state}
                onClick={() => s.total > 0 ? handleStateClick(s.state) : null}
              />
            ))
          ) : stateData ? (
            <>
              <button className={styles.allStateBtn} onClick={() => handleAllState(stateData.state)} type="button">
                <span className={styles.allStateLabel}>All {stateData.state}</span>
                <span className={styles.allStateCount}>{stateData.total} listing{stateData.total !== 1 ? "s" : ""}</span>
              </button>
              {stateData.areas.map((area) => (
                <button
                  key={area.name}
                  className={[styles.areaRow, selected === `${stateData.state}::${area.name}` ? styles.areaRowActive : ""].filter(Boolean).join(" ")}
                  onClick={() => handleAreaClick(stateData.state, area.name)}
                  type="button"
                >
                  <MapPin size={13} strokeWidth={1.75} />
                  <span className={styles.areaName}>{area.name}</span>
                  <span className={styles.areaCount}>{area.count}</span>
                </button>
              ))}
              {stateData.areas.length === 0 && (
                <p className={styles.empty}>No listings in {stateData.state}</p>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LocationStateRow({ state, count, active, onClick }: { state: string; count: number; active: boolean; onClick: (() => void) | null }) {
  return (
    <button
      className={[styles.stateRow, active ? styles.stateRowActive : "", count === 0 ? styles.stateRowEmpty : ""].filter(Boolean).join(" ")}
      onClick={onClick ?? undefined}
      disabled={!onClick}
      type="button"
    >
      <span className={styles.stateName}>{state}</span>
      <span className={styles.stateCount}>{count > 0 ? `${count} listing${count !== 1 ? "s" : ""}` : "No listings"}</span>
    </button>
  );
}
