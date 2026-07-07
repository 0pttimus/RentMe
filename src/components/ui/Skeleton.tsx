import styles from "./Skeleton.module.scss";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ width, height = 12, borderRadius, className, style }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className ?? ""}`}
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

export function SkeletonTitle({ className }: { className?: string }) {
  return <div className={`skeleton ${styles.title} ${className ?? ""}`} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: 12, borderRadius: 6, width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={className} style={{ display: "flex", gap: 12, padding: 10 }}>
      <div className="skeleton" style={{ width: 120, height: 90, borderRadius: 12, flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
        <div className="skeleton" style={{ height: 14, width: "70%", borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 11, width: "50%", borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 15, width: "40%", borderRadius: 6 }} />
        <div style={{ display: "flex", gap: 4 }}>
          <div className="skeleton" style={{ height: 18, width: 50, borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 18, width: 60, borderRadius: 6 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div className="skeleton" style={{ width: 18, height: 18, borderRadius: "50%" }} />
          <div className="skeleton" style={{ height: 11, width: 80, borderRadius: 6 }} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "20px 10px" }}>
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <div className="skeleton" style={{ height: 12, width: "70%", borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 10, width: "50%", borderRadius: 6 }} />
        </div>
      ))}
    </div>
  );
}
