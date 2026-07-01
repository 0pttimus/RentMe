import { useNavigate } from "react-router-dom";
import { Bell, Globe, Lock, Moon, Shield, Sun, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SubPageHeader } from "@/components/SubPageHeader";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { useNotificationPref } from "@/lib/notifications";
import styles from "./SettingsPage.module.scss";

const settings = [
  { icon: Globe, label: "Language", value: "English" },
  { icon: Shield, label: "Privacy & Security", value: "" },
];

export default function SettingsPage() {
  const { isDark, toggleMode } = useTheme();
  const { enabled, setEnabled } = useNotificationPref();
  const navigate = useNavigate();
  const AppearanceIcon = isDark ? Moon : Sun;

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <SubPageHeader title="Settings" prevTitle="Profile" backHref="/profile" />

      <div className={styles.list}>
        <button
          className={[styles.item, styles.buttonItem, styles.notifItem].join(" ")}
          type="button"
          onClick={() => setEnabled(!enabled)}
        >
          <div className={styles.itemIcon}>
            <Bell size={16} className={styles.itemIconSvg} strokeWidth={1.75} />
          </div>
          <span className={styles.itemLabel}>Notifications</span>
          <span className={styles.itemValue}>{enabled ? "On" : "Off"}</span>
          <span className={[styles.track, enabled ? styles.trackOn : ""].filter(Boolean).join(" ")}>
            <span className={[styles.thumb, enabled ? styles.thumbOn : ""].filter(Boolean).join(" ")} />
          </span>
        </button>

        <button
          className={[styles.item, styles.buttonItem, styles.appearanceItem].join(" ")}
          type="button"
          aria-pressed={isDark}
          onClick={toggleMode}
        >
          <div className={styles.itemIcon}>
            <AppearanceIcon size={16} className={styles.itemIconSvg} strokeWidth={1.75} />
          </div>
          <span className={styles.itemLabel}>Appearance</span>
          <span className={styles.itemValue}>{isDark ? "Dark" : "Light"}</span>
          <span className={styles.themeSwitch} aria-hidden="true">
            <span className={styles.themeThumb}>
              {isDark ? <Moon size={12} strokeWidth={2.2} /> : <Sun size={12} strokeWidth={2.2} />}
            </span>
          </span>
        </button>

        <button
          className={[styles.item, styles.buttonItem].join(" ")}
          type="button"
          onClick={() => navigate("/wallet/export")}
        >
          <div className={styles.itemIcon}>
            <Lock size={16} className={styles.itemIconSvg} strokeWidth={1.75} />
          </div>
          <span className={styles.itemLabel}>Wallet Security</span>
          <span className={styles.itemValue} />
        </button>

        {settings.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className={styles.item}>
              <div className={styles.itemIcon}>
                <Icon size={16} className={styles.itemIconSvg} strokeWidth={1.75} />
              </div>
              <span className={styles.itemLabel}>{item.label}</span>
              {item.value && <span className={styles.itemValue}>{item.value}</span>}
            </Card>
          );
        })}
      </div>

      <div className={styles.roadmap}>
        <p className={styles.roadmapLabel}>Product TODO</p>
        <Card className={styles.roadmapCard}>
          <div className={styles.itemIcon}>
            <WalletCards size={16} className={styles.itemIconSvg} strokeWidth={1.75} />
          </div>
          <div className={styles.roadmapText}>
            <p className={styles.roadmapTitle}>TON gasless USDT rail</p>
            <p className={styles.roadmapBody}>
              Deferred for now. Keep wallet flows in Naira while the app matures.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
