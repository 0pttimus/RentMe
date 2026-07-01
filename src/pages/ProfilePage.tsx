import { SubPageHeader } from "@/components/SubPageHeader";
import { ProfilePanel } from "@/components/ProfilePanel";
import styles from "./ProfilePage.module.scss";

export default function ProfilePage() {
  return (
    <div className={["page-content", styles.page].join(" ")}>
      <SubPageHeader title="Profile" prevTitle="Markets" backHref="/markets" />
      <ProfilePanel />
    </div>
  );
}