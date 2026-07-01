import { useState } from "react";
import { Link } from "react-router-dom";
import { VerifiedBadge, TrustBadge } from "@/components/ui/Badge";
import ImageCarousel from "@/components/ImageCarousel";
import FullscreenViewer from "@/components/FullscreenViewer";
import { formatNaira } from "@/lib/format";
import type { Property } from "@/lib/types";
import styles from "./PropertyCard.module.scss";

const conditionLabels = {
  new: "New",
  renovated: "Renovated",
  "fairly-used": "Fairly used",
};

export default function PropertyCard({ property }: { property: Property }) {
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  const mediaItems = [
    ...(property.video ? [{ type: "video" as const, src: property.video }] : []),
    ...property.images.map((src) => ({ type: "image" as const, src })),
  ];

  return (
    <>
      <Link to={`/property/${property.id}`} className={styles.link}>
        <div className={styles.card}>
          <div className={styles.carouselWrap}>
            <ImageCarousel
              items={mediaItems}
              aspectRatio={4 / 3}
              onItemClick={(i) => {
                setFullscreenIndex(i);
              }}
            />
          </div>
          <div className={styles.body}>
            <div className={styles.titleRow}>
              <span className={styles.title}>{property.title}</span>
              {property.verified && <VerifiedBadge />}
            </div>
            <p className={styles.meta}>
              {formatNaira(property.pricePerYear)} / year · {property.city}
            </p>
            <p className={styles.features}>
              {property.bedrooms} bed · {property.bathrooms} bath ·{" "}
              {property.furnished ? "Furnished" : "Unfurnished"} · {conditionLabels[property.condition]}
            </p>
            <TrustBadge level={property.trustLevel} />
          </div>
        </div>
      </Link>

      {fullscreenIndex !== null && (
        <FullscreenViewer
          items={mediaItems}
          initialIndex={fullscreenIndex}
          onClose={() => setFullscreenIndex(null)}
        />
      )}
    </>
  );
}
