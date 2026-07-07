import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X, Image as ImageIcon } from "lucide-react";
import { SubPageHeader } from "@/components/SubPageHeader";
import { getProperty, updateProperty } from "@/lib/api/client";
import { formatAmountInput, parseAmountInput } from "@/lib/format";
import styles from "./EditPropertyPage.module.scss";

const RENT_PERIODS = ["any", "daily", "weekly", "monthly", "yearly"] as const;

export default function EditPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bedrooms, setBedrooms] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [rentAmountNgn, setRentAmountNgn] = useState("");
  const [rentPeriod, setRentPeriod] = useState("yearly");
  const [rentDuration, setRentDuration] = useState(1);
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    getProperty(id).then((res) => {
      if (res.data?.property) {
        const p = res.data.property;
        setTitle(p.title);
        setDescription(p.description ?? "");
        setBedrooms(p.bedrooms);
        setBathrooms(p.bathrooms);
        setRentAmountNgn(formatAmountInput(String(p.rentAmountNgn)));
        setRentPeriod(p.rentPeriod ?? "yearly");
        setRentDuration(p.rentDuration ?? 1);
        setPhotos(p.photos ?? []);
      }
      setLoading(false);
    });
  }, [id]);

  const handlePhotoPick = (file?: File) => {
    if (!file || photos.length >= 10) return;
    const reader = new FileReader();
    reader.onload = () => setPhotos((prev) => [...prev, String(reader.result)]);
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (i: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    const res = await updateProperty(id, { title, description, bedrooms, bathrooms, rentAmountNgn: parseAmountInput(rentAmountNgn), rentPeriod, rentDuration: rentPeriod === "any" ? undefined : rentDuration, photos });
    setSaving(false);
    if (!res.error) navigate(`/property/${id}`);
  };

  if (loading) return <div className={["page-content", styles.page].join(" ")}><div className="spinnerWrap"><div className="spinner" /></div></div>;

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <SubPageHeader title="Edit Property" prevTitle="Property" backHref={`/property/${id}`} />

      <div className={styles.form}>
        <label className={styles.label}>
          Title
          <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className={styles.label}>
          Description
          <textarea className={styles.textarea} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </label>
        <div className={styles.row}>
          <label className={styles.label}>
            Bedrooms
            <input className={styles.input} type="number" value={bedrooms} onChange={(e) => setBedrooms(Math.max(0, Number(e.target.value)))} min={0} />
          </label>
          <label className={styles.label}>
            Bathrooms
            <input className={styles.input} type="number" value={bathrooms} onChange={(e) => setBathrooms(Math.max(0, Number(e.target.value)))} min={0} />
          </label>
        </div>
        <label className={styles.label}>
          Rent Amount (NGN)
          <input className={styles.input} type="text" value={rentAmountNgn}
            onChange={(e) => setRentAmountNgn(formatAmountInput(e.target.value))}
            inputMode="numeric" />
        </label>
        <label className={styles.label}>
          Rent Period
          <div className={styles.periodToggle}>
            {RENT_PERIODS.map((p) => (
              <button key={p} type="button"
                className={[styles.periodBtn, rentPeriod === p ? styles.periodBtnActive : ""].join(" ")}
                onClick={() => { setRentPeriod(p); if (p === "yearly") setRentDuration(1); }}
              >
                {p === "any" ? "Any" : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </label>
        {rentPeriod !== "any" && (
          <label className={styles.label}>
            Duration ({rentPeriod === "daily" ? "days" : rentPeriod === "weekly" ? "weeks" : rentPeriod === "monthly" ? "months" : "years"})
            <input type="number" className={styles.input}
              value={rentDuration}
              onChange={(e) => setRentDuration(Math.max(1, Number(e.target.value)))}
              min={1} max={rentPeriod === "yearly" ? 2 : 365}
            />
            {rentPeriod === "yearly" && <p className={styles.hint}>Max 2 years</p>}
          </label>
        )}
        <label className={styles.label}>
          Photos
          <div className={styles.photoGrid}>
            {photos.map((src, i) => (
              <div key={i} className={styles.photoThumb}>
                <img src={src} alt="" />
                <button type="button" className={styles.photoRemove} onClick={() => handleRemovePhoto(i)}><X size={12} strokeWidth={3} /></button>
              </div>
            ))}
            {photos.length < 10 && (
              <button type="button" className={styles.photoAdd} onClick={() => photoInputRef.current?.click()}>
                <ImageIcon size={24} strokeWidth={1.5} />
                <span>Add photo</span>
              </button>
            )}
          </div>
          <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={(e) => handlePhotoPick(e.target.files?.[0])} />
        </label>

        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
