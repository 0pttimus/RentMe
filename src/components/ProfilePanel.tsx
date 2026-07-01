import {
  BadgeCheck,
  Briefcase,
  ChevronRight,
  Camera,
  Check,
  X,
  FileCheck,
  Gift,
  HelpCircle,
  Home,
  LogOut,
  Settings,
  Shield,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { TrustBadge } from "@/components/ui/Badge";
import type { AuthUser } from "@/lib/api/client";
import type { TrustLevel } from "@/lib/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setUser, signOut } from "@/store/slices/authSlice";
import { switchToFreelance } from "@/store/slices/accountSlice";
import styles from "./ProfilePanel.module.scss";

const menuItems = [
  { icon: Home, label: "List a Property", href: "/list-property" },
  { icon: FileCheck, label: "KYC Verification", href: "/kyc", badgeKey: "kyc" as const },
  { icon: Shield, label: "Trust Score", href: "/trust", badgeKey: "trust" as const },
  { icon: BadgeCheck, label: "Rental History", href: "/rental-history" },
  { icon: Gift, label: "Rewards", href: "/rewards" },
  { icon: Settings, label: "Settings", href: "/settings" },
  { icon: HelpCircle, label: "Help & Support", href: "/help" },
  { icon: Shield, label: "Admin", href: "/admin" },
];

function mapTrustLevel(level: string): TrustLevel {
  const map: Record<string, TrustLevel> = {
    elite: "Elite",
    trusted: "Trusted",
    average: "Average",
    risk: "Risk",
  };
  return map[level.toLowerCase()] ?? "Average";
}

interface ProfilePanelProps {
  onNavigate?: () => void;
}

type ProfileExtras = {
  fullName: string;
  occupation: string;
  phone: string;
  avatarUrl: string;
};

const PROFILE_EXTRAS_KEY = "rentme_profile_extras";

function readProfileExtras(): Partial<ProfileExtras> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(PROFILE_EXTRAS_KEY) ?? "{}") as Partial<ProfileExtras>;
  } catch {
    return {};
  }
}

function saveProfileExtras(extras: ProfileExtras) {
  window.localStorage.setItem(PROFILE_EXTRAS_KEY, JSON.stringify(extras));
}

export function ProfilePanel({ onNavigate }: ProfilePanelProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [extras, setExtras] = useState<Partial<ProfileExtras>>(readProfileExtras);
  const [editOpen, setEditOpen] = useState(false);

  const isIdVerified = (user?.kycStatus ?? "pending") === "verified";
  const profile = {
    fullName: user?.fullName ?? extras.fullName ?? "Guest",
    occupation: extras.occupation ?? "",
    phone: extras.phone ?? user?.phone ?? "",
    avatarUrl: extras.avatarUrl ?? "",
  };
  const [draft, setDraft] = useState<ProfileExtras>({
    fullName: profile.fullName,
    occupation: profile.occupation,
    phone: profile.phone,
    avatarUrl: profile.avatarUrl,
  });

  useEffect(() => {
    if (editOpen) {
      setDraft({
        fullName: profile.fullName,
        occupation: profile.occupation,
        phone: profile.phone,
        avatarUrl: profile.avatarUrl,
      });
    }
  }, [editOpen, profile.avatarUrl, profile.fullName, profile.occupation, profile.phone]);

  const initials = profile.fullName
    .split(" ")
    .map((n) => n[0])
    .join("");

  function getBadge(key?: "kyc" | "trust") {
    if (key === "kyc") {
      return user?.kycStatus === "verified" ? "Verified" : "Pending";
    }
    if (key === "trust") return String(user?.trustScore ?? 0);
    return undefined;
  }

  async function handleLogout() {
    await dispatch(signOut());
    onNavigate?.();
    navigate("/");
  }

  function handleAvatarUpload(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((current) => ({ ...current, avatarUrl: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  }

  function saveProfile() {
    const next = {
      ...draft,
      fullName: isIdVerified ? profile.fullName : draft.fullName.trim(),
      occupation: draft.occupation.trim(),
      phone: draft.phone.trim(),
    };
    setExtras(next);
    saveProfileExtras(next);

    if (user) {
      const updatedUser: AuthUser = {
        ...user,
        fullName: next.fullName,
        phone: next.phone || user.phone,
      };
      dispatch(setUser(updatedUser));
    }

    setEditOpen(false);
  }

  return (
    <>
      <button type="button" className={styles.profileCardButton} onClick={() => setEditOpen(true)}>
        <Card className={styles.profileCard}>
          <div className={styles.avatar}>
            {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : initials}
          </div>
          <div className={styles.profileInfo}>
            <h2 className={styles.name}>{profile.fullName}</h2>
            <p className={styles.occupation}>{profile.occupation}</p>
            <div className={styles.trustRow}>
              <TrustBadge level={mapTrustLevel(user?.trustLevel ?? "average")} />
            </div>
          </div>
          <ChevronRight size={17} className={styles.menuChevron} />
        </Card>
      </button>

      <div className={[styles.menu, "stagger-in"].join(" ")}>
        <button
          type="button"
          className={[styles.menuLink, styles.freelanceBtn].join(" ")}
          onClick={() => {
            dispatch(switchToFreelance());
            onNavigate?.();
            navigate("/freelance/home");
          }}
        >
          <Card className={styles.menuItem}>
            <div className={[styles.menuIcon, styles.freelanceIcon].join(" ")}>
              <Briefcase size={16} strokeWidth={1.75} />
            </div>
            <span className={styles.menuLabel}>Switch to Freelance</span>
            <ChevronRight size={16} className={styles.menuChevron} />
          </Card>
        </button>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const badge = getBadge(item.badgeKey);
          return (
            <Link key={item.label} to={item.href} onClick={onNavigate} className={styles.menuLink}>
              <Card className={styles.menuItem}>
                <div className={styles.menuIcon}>
                  <Icon size={16} className={styles.menuIconSvg} strokeWidth={1.75} />
                </div>
                <span className={styles.menuLabel}>{item.label}</span>
                {badge && <span className={styles.menuBadge}>{badge}</span>}
                <ChevronRight size={16} className={styles.menuChevron} />
              </Card>
            </Link>
          );
        })}

        <button type="button" onClick={handleLogout} className={styles.logout}>
          <LogOut size={16} />
          Sign out
        </button>
      </div>

      {editOpen && (
        <div className={styles.editBackdrop} role="dialog" aria-modal="true">
          <div className={styles.editSheet}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetHeader}>
              <div>
                <p className={styles.sheetTitle}>Edit profile</p>
                <p className={styles.sheetSubtitle}>
                  {isIdVerified ? "Your legal name is locked after ID verification." : "Update your profile details."}
                </p>
              </div>
              <button type="button" className={styles.closeBtn} onClick={() => setEditOpen(false)}>
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <div className={styles.avatarEditor}>
              <button
                type="button"
                className={styles.avatarUpload}
                onClick={() => fileInputRef.current?.click()}
              >
                {draft.avatarUrl ? <img src={draft.avatarUrl} alt="" /> : initials}
                <span>
                  <Camera size={14} strokeWidth={2} />
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => handleAvatarUpload(event.target.files?.[0])}
              />
              <p>Upload profile picture</p>
            </div>

            <div className={styles.form}>
              <label className={isIdVerified ? styles.lockedField : ""}>
                <span>Full name</span>
                <input
                  value={draft.fullName}
                  disabled={isIdVerified}
                  onChange={(event) => setDraft((current) => ({ ...current, fullName: event.target.value }))}
                />
                {isIdVerified && <small>Verified by ID. Contact RentMe support to correct legal name.</small>}
              </label>

              <label>
                <span>Occupation</span>
                <input
                  value={draft.occupation}
                  onChange={(event) => setDraft((current) => ({ ...current, occupation: event.target.value }))}
                />
              </label>

              <label>
                <span>Phone number</span>
                <input
                  type="tel"
                  value={draft.phone}
                  placeholder="+234 800 000 0000"
                  onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>
            </div>

            <button type="button" className={styles.saveBtn} onClick={saveProfile}>
              <Check size={16} strokeWidth={2.2} />
              Save changes
            </button>
          </div>
        </div>
      )}
    </>
  );
}
