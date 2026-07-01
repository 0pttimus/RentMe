import { useState } from "react";
import { SubPageHeader } from "@/components/SubPageHeader";
import styles from "./HirePage.module.scss";

type Step = "categories" | "gender" | "workers";

const categoryIcons: Record<string, string> = {
  Electrician: "⚡", "Home Mechanic": "🔧", "First Aid": "🏥",
  "Home Baby Delivery": "👶", Chef: "👨‍🍳", Plumber: "🔧",
  Furniture: "🪑", "Cleaning Services": "🧹", Movers: "📦",
  "Home Decorations": "🖼️", Painters: "🎨", "Solar/Inverter Engineers": "☀️",
  "Makeup Artists": "💄", "Hair Dresser": "💇", Pedicure: "🦶",
  "Private Massage": "💆", Gardeners: "🌿", Security: "🛡️",
  "House Help": "🏠", Nanny: "👶",
};

const categories = Object.keys(categoryIcons);

export default function HirePage() {
  const [step, setStep] = useState<Step>("categories");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedGender, setSelectedGender] = useState("");

  function back() {
    if (step === "gender") setStep("categories");
    else if (step === "workers") setStep("gender");
  }

  const showBack = step !== "categories";

  return (
    <div className={["page-content", styles.page].join(" ")}>
      {showBack ? (
        <div className={styles.stepHeader}>
          <button type="button" onClick={back} className={styles.back} aria-label="Back">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M14 4L8 11L14 18" stroke="#007aff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className={styles.backLabel}>Back</span>
          </button>
          <h1 className={styles.stepTitle}>
            {step === "gender" ? "Select gender" : selectedCategory || ""}
          </h1>
        </div>
      ) : (
        <SubPageHeader title="Hire a professional" prevTitle="Portal" backHref="/portal" />
      )}

      {step === "categories" && (
        <div className={styles.grid}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={styles.catCard}
              onClick={() => { setSelectedCategory(cat); setStep("gender"); }}
              type="button"
            >
              <span className={styles.catEmoji}>{categoryIcons[cat]}</span>
              <span className={styles.catName}>{cat}</span>
            </button>
          ))}
        </div>
      )}

      {step === "gender" && (
        <div className={styles.genderGrid}>
          {["Male", "Female"].map((g) => (
            <button
              key={g}
              className={[styles.genderCard, selectedGender === g ? styles.genderActive : ""].join(" ")}
              onClick={() => { setSelectedGender(g); setStep("workers"); }}
              type="button"
            >
              <span className={styles.genderIcon}>{g === "Male" ? "👨" : "👩"}</span>
              <span className={styles.genderLabel}>{g}</span>
              <span className={styles.genderCount}>{g === "Male" ? "Hire a male professional" : "Hire a female professional"}</span>
            </button>
          ))}
        </div>
      )}

      {step === "workers" && (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Nothing to see here for now</p>
          <p className={styles.emptyText}>We're onboarding {selectedCategory?.toLowerCase() || ""} professionals. Check back later.</p>
        </div>
      )}
    </div>
  );
}
