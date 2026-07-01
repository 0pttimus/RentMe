import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import styles from "./FullscreenViewer.module.scss";

type MediaItem = { type: "image"; src: string } | { type: "video"; src: string };

type Props = {
  items: MediaItem[];
  initialIndex?: number;
  onClose: () => void;
};

export default function FullscreenViewer({ items, initialIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  const current = items[index];

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, items.length - 1));
  }, [items.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goNext, goPrev]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setTouchDelta(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    setTouchDelta(e.touches[0].clientX - touchStart);
  };

  const handleTouchEnd = () => {
    if (Math.abs(touchDelta) > 60) {
      if (touchDelta > 0) goPrev();
      else goNext();
    }
    setTouchStart(null);
    setTouchDelta(0);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className={styles.backdrop}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      <button className={styles.close} onClick={onClose} type="button" aria-label="Close viewer">
        <X size={24} strokeWidth={2} />
      </button>

      <div className={styles.slideArea} key={index}>
        {current.type === "image" ? (
          <img ref={imgRef} src={current.src} alt="" className={styles.image} draggable={false} />
        ) : (
          <video src={current.src} className={styles.video} controls autoPlay playsInline />
        )}
      </div>

      {items.length > 1 && (
        <>
          <button
            className={[styles.arrow, styles.arrowLeft, index === 0 ? styles.arrowHidden : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={goPrev}
            type="button"
            aria-label="Previous"
          >
            <ChevronLeft size={28} strokeWidth={2} />
          </button>
          <button
            className={[styles.arrow, styles.arrowRight, index === items.length - 1 ? styles.arrowHidden : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={goNext}
            type="button"
            aria-label="Next"
          >
            <ChevronRight size={28} strokeWidth={2} />
          </button>

          <div className={styles.dots}>
            {items.map((_, i) => (
              <button
                key={i}
                className={[styles.dot, i === index ? styles.dotActive : ""]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setIndex(i)}
                type="button"
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>

          <span className={styles.counter}>
            {index + 1} / {items.length}
          </span>
        </>
      )}
    </div>
  );
}
