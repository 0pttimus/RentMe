import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Check, ChevronDown } from "lucide-react";
import { SubPageHeader } from "@/components/SubPageHeader";
import { searchPassports, createPassportUnit, createProperty, getPassportUnits } from "@/lib/api/client";
import { nigeriaLocations } from "@/lib/nigeria-locations";
import styles from "./ListPropertyPage.module.scss";

const PROPERTY_TYPES = ["apartment", "duplex", "bungalow", "self_contain", "studio", "penthouse", "commercial"];

export default function ListPropertyPage() {
  const navigate = useNavigate();

  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Lagos");
  const [buildingName, setBuildingName] = useState("");
  const [propertyType, setPropertyType] = useState("apartment");
  const [totalUnits, setTotalUnits] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bedrooms, setBedrooms] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [rentAmountNgn, setRentAmountNgn] = useState("");
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [foundPassport, setFoundPassport] = useState<{ id: string; passport_number: string; building_name: string | null; total_units: number } | null>(null);
  const [existingUnits, setExistingUnits] = useState<{ id: string; unit_identifier: string; unit_type: string }[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [newUnitIdentifier, setNewUnitIdentifier] = useState("");
  const [step, setStep] = useState<"address" | "units" | "details">("address");
  const [stateOpen, setStateOpen] = useState(false);

  const areaOptions = nigeriaLocations.find((l) => l.state === state)?.areas ?? [];

  async function handleSearch() {
    if (!street || !city) {
      setError("Street and city required.");
      return;
    }
    setError("");
    setSearching(true);
    const res = await searchPassports({ street, houseNumber, city, state });
    setSearching(false);

    if (res.data?.passports?.length) {
      const p = res.data.passports[0];
      setFoundPassport(p);
      const unitsRes = await getPassportUnits(p.id);
      setExistingUnits(unitsRes.data?.units ?? []);
      setStep("units");
    } else {
      setStep("details");
    }
  }

  async function handleSelectUnit(unitId: string) {
    setSelectedUnitId(unitId);
  }

  async function handleAddNewUnit() {
    if (!foundPassport || !newUnitIdentifier) return;
    setLoading(true);
    const res = await createPassportUnit(foundPassport.id, newUnitIdentifier, propertyType);
    setLoading(false);
    if (res.data) {
      const unitsRes = await getPassportUnits(foundPassport.id);
      setExistingUnits(unitsRes.data?.units ?? []);
      setSelectedUnitId(res.data.unitId);
      setNewUnitIdentifier("");
    } else {
      setError(res.error ?? "Failed to create unit");
    }
  }

  async function handleSubmit() {
    if (!rentAmountNgn || Number(rentAmountNgn) <= 0) {
      setError("Enter a valid rent amount.");
      return;
    }
    setLoading(true);
    setError("");

    const payload: Record<string, unknown> = {
      title,
      description,
      street,
      houseNumber,
      area,
      city,
      state,
      buildingName: buildingName || undefined,
      propertyType,
      totalUnits,
      bedrooms,
      bathrooms,
      rentAmountNgn: Number(rentAmountNgn),
    };

    if (foundPassport) {
      payload.existingPassportId = foundPassport.id;
      payload.unitIdentifier = existingUnits.find((u) => u.id === selectedUnitId)?.unit_identifier ?? `${propertyType} ${totalUnits}`;
      payload.unitType = propertyType;
    } else {
      payload.unitIdentifier = "Main Unit";
      payload.unitType = propertyType;
    }

    const res = await createProperty(payload);
    setLoading(false);
    if (res.data) {
      navigate("/markets");
    } else {
      setError(res.error ?? "Failed to create listing.");
    }
  }

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <SubPageHeader title="List Property" prevTitle="Profile" backHref="/profile" />

      {error && <p className={styles.error}>{error}</p>}

      {step === "address" && (
        <div className={styles.form}>
          <label className={styles.label}>
            Country
            <input type="text" className={styles.input} value="Nigeria" disabled />
          </label>
          <label className={styles.label}>
            State
            <div className={styles.pickerWrap}>
              <button type="button" className={styles.pickerButton} onClick={() => setStateOpen(!stateOpen)}>
                <span>{state}</span>
                <ChevronDown size={16} strokeWidth={2.5} />
              </button>
              {stateOpen && (
                <div className={styles.pickerDropdown}>
                  {nigeriaLocations.map((l) => (
                    <button key={l.state} type="button" className={[styles.pickerOption, l.state === state ? styles.pickerOptionActive : ""].join(" ")} onClick={() => { setState(l.state); setStateOpen(false); }}>
                      {l.state === state && <Check size={14} strokeWidth={3} className={styles.pickerCheck} />}
                      {l.state}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </label>
          <label className={styles.label}>
            City
            <input type="text" className={styles.input} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Ikeja" />
          </label>
          <label className={styles.label}>
            Area
            <input type="text" className={styles.input} value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. GRA" list="areas" />
            <datalist id="areas">
              {areaOptions.map((a) => (<option key={a} value={a} />))}
            </datalist>
          </label>
          <label className={styles.label}>
            Street
            <input type="text" className={styles.input} value={street} onChange={(e) => setStreet(e.target.value)} placeholder="e.g. Admiralty Way" />
          </label>
          <label className={styles.label}>
            House Number
            <input type="text" className={styles.input} value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} placeholder="e.g. 12" />
          </label>
          <label className={styles.label}>
            Building Name <span className={styles.optional}>(optional)</span>
            <input type="text" className={styles.input} value={buildingName} onChange={(e) => setBuildingName(e.target.value)} placeholder="e.g. Lakeside Estate" />
          </label>
          <label className={styles.label}>
            Property Type
            <select className={styles.input} value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
          </label>
          <label className={styles.label}>
            Total Units in Building
            <input type="number" className={styles.input} value={totalUnits} onChange={(e) => setTotalUnits(Math.max(1, Number(e.target.value)))} min={1} />
          </label>
          <button type="button" className={styles.submitBtn} onClick={handleSearch} disabled={searching}>
            {searching ? "Searching..." : "Continue"}
          </button>
        </div>
      )}

      {step === "units" && foundPassport && (
        <div className={styles.form}>
          <div className={styles.foundBadge}>
            <Search size={14} strokeWidth={2} />
            Found Property Passport {foundPassport.passport_number}
          </div>
          <p className={styles.foundDesc}>
            {foundPassport.building_name ? `${foundPassport.building_name}, ` : ""}
            {houseNumber ? `${houseNumber}, ` : ""}{street}, {city}
          </p>

          <p className={styles.sectionTitle}>Which unit are you listing?</p>
          <div className={styles.unitList}>
            {existingUnits.map((u) => (
              <button key={u.id} type="button" className={[styles.unitBtn, selectedUnitId === u.id ? styles.unitSelected : ""].join(" ")} onClick={() => handleSelectUnit(u.id)}>
                {selectedUnitId === u.id && <Check size={14} strokeWidth={3} className={styles.unitCheck} />}
                {u.unit_identifier}
              </button>
            ))}
          </div>

          <div className={styles.newUnitRow}>
            <input type="text" className={styles.input} value={newUnitIdentifier} onChange={(e) => setNewUnitIdentifier(e.target.value)} placeholder="New unit name e.g. Flat 3" />
            <button type="button" className={styles.smallBtn} onClick={handleAddNewUnit} disabled={loading || !newUnitIdentifier}>
              {loading ? "..." : "Add"}
            </button>
          </div>

          <button type="button" className={styles.submitBtn} onClick={() => setStep("details")} disabled={!selectedUnitId}>
            Continue
          </button>
        </div>
      )}

      {(step === "details") && (
        <div className={styles.form}>
          {foundPassport && (
            <div className={styles.foundBadge}>
              <Check size={14} strokeWidth={2} />
              {foundPassport.passport_number}
            </div>
          )}

          <label className={styles.label}>
            Listing Title
            <input type="text" className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Modern 2-Bed in Lekki" />
          </label>
          <label className={styles.label}>
            Description
            <textarea className={styles.textarea} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your property..." rows={3} />
          </label>
          <div className={styles.row}>
            <label className={styles.label}>
              Bedrooms
              <input type="number" className={styles.input} value={bedrooms} onChange={(e) => setBedrooms(Math.max(0, Number(e.target.value)))} min={0} />
            </label>
            <label className={styles.label}>
              Bathrooms
              <input type="number" className={styles.input} value={bathrooms} onChange={(e) => setBathrooms(Math.max(0, Number(e.target.value)))} min={0} />
            </label>
          </div>
          <label className={styles.label}>
            Annual Rent (NGN)
            <input type="number" className={styles.input} value={rentAmountNgn} onChange={(e) => setRentAmountNgn(e.target.value)} placeholder="e.g. 3500000" />
          </label>
          <button type="button" className={styles.submitBtn} onClick={handleSubmit} disabled={loading || !title || !rentAmountNgn}>
            {loading ? "Submitting..." : "Submit for Verification"}
          </button>
        </div>
      )}
    </div>
  );
}
