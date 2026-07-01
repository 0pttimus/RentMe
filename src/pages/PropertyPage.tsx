import { useState } from "react";
import { Link, Navigate, useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { VerifiedBadge, TrustBadge, Pill } from "@/components/ui/Badge";
import ImageCarousel from "@/components/ImageCarousel";
import FullscreenViewer from "@/components/FullscreenViewer";
import { formatNaira } from "@/lib/format";
import styles from "./PropertyPage.module.scss";

export default function PropertyPage() {
  const navigate = useNavigate();
  const { id: _id } = useParams<{ id: string }>();
  const property = undefined as { id: string; title: string; address: string; pricePerYear: number; images: string[]; video?: string; propertyId: string; trustLevel: "Elite" | "Trusted" | "Average" | "Risk"; ownershipVerified: boolean; priorTenancies: number; lastInspected: string; landlord: { initials: string; name: string; responseRate: number; trustLevel: "Elite" | "Trusted" | "Average" | "Risk" } } | undefined;
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  if (!property) {
    return <Navigate to="/markets" replace />;
  }

  const mediaItems = [
    ...(property.video ? [{ type: "video" as const, src: property.video }] : []),
    ...property.images.map((src) => ({ type: "image" as const, src })),
  ];

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <button type="button" onClick={() => navigate(-1)} className={styles.back} aria-label="Back">
        <ChevronLeft size={22} strokeWidth={2.5} />
      </button>

      <ImageCarousel
        items={mediaItems}
        aspectRatio={16 / 9}
        className={styles.hero}
        onItemClick={(i) => setFullscreenIndex(i)}
      />

      <h1 className={styles.title}>{property.title}</h1>
      <p className={styles.address}>{property.address}</p>

      <div className={styles.priceBlock}>
        <p className={styles.price}>
          {formatNaira(property.pricePerYear)}{" "}
          <span className={styles.priceUnit}>/ year</span>
        </p>
        <p className={styles.feeNote}>includes 0.5% platform fee</p>
      </div>

      <div className={styles.badges}>
        <VerifiedBadge />
        <TrustBadge level={property.trustLevel} />
        <Pill>#{property.propertyId}</Pill>
      </div>

      <Card className={styles.passport}>
        <p className={styles.passportTitle}>Property passport</p>
        <div className={styles.passportList}>
          <div className={styles.passportRow}>
            <span>Ownership verified</span>
            {property.ownershipVerified && (
              <Check size={14} className={styles.checkIcon} strokeWidth={2.5} />
            )}
          </div>
          <div className={styles.passportRow}>
            <span>Prior tenancies</span>
            <span>{property.priorTenancies}</span>
          </div>
          <div className={styles.passportRow}>
            <span>Last inspected</span>
            <span>{property.lastInspected}</span>
          </div>
        </div>
      </Card>

      <Card className={styles.landlord}>
        <div className={styles.landlordRow}>
          <div className={styles.landlordAvatar}>{property.landlord.initials}</div>
          <div className={styles.landlordInfo}>
            <p className={styles.landlordName}>{property.landlord.name}</p>
            <p className={styles.landlordMeta}>
              Landlord · {property.landlord.responseRate}% response rate
            </p>
          </div>
          <TrustBadge level={property.landlord.trustLevel} />
        </div>
      </Card>

      <Link to={`/reserve/${property.id}`} className={styles.reserveBtn}>
        Reserve · ₦50,000 deposit
      </Link>

      {fullscreenIndex !== null && (
        <FullscreenViewer
          items={mediaItems}
          initialIndex={fullscreenIndex}
          onClose={() => setFullscreenIndex(null)}
        />
      )}
    </div>
  );
}