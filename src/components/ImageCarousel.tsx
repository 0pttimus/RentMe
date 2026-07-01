import { useCallback, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import styles from "./ImageCarousel.module.scss";

type MediaItem = { type: "image"; src: string } | { type: "video"; src: string };

type Props = {
  items: MediaItem[];
  aspectRatio?: number;
  onItemClick?: (index: number) => void;
  className?: string;
};

export default function ImageCarousel({ items, aspectRatio = 4 / 3, onItemClick, className }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);

  const scrollTo = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const child = track.children[index] as HTMLElement | undefined;
    if (!child) return;
    child.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }, []);

  const goNext = useCallback(() => {
    const next = Math.min(activeIndex + 1, items.length - 1);
    setActiveIndex(next);
    scrollTo(next);
  }, [activeIndex, items.length, scrollTo]);

  const goPrev = useCallback(() => {
    const prev = Math.max(activeIndex - 1, 0);
    setActiveIndex(prev);
    scrollTo(prev);
  }, [activeIndex, scrollTo]);

  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  }, [activeIndex]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setTouchDelta(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStart === null) return;
    setTouchDelta(e.touches[0].clientX - touchStart);
  }, [touchStart]);

  const handleTouchEnd = useCallback(() => {
    if (Math.abs(touchDelta) > 60) {
      if (touchDelta > 0) goPrev();
      else goNext();
    }
    setTouchStart(null);
    setTouchDelta(0);
  }, [touchDelta, goNext, goPrev]);

  const showNav = items.length > 1;

  return (
    <div
      className={[styles.wrapper, className].filter(Boolean).join(" ")}
      style={{ aspectRatio }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        ref={trackRef}
        className={styles.track}
        onScroll={handleScroll}
      >
        {items.map((item, i) => (
          <div
            key={i}
            className={styles.slide}
            onClick={() => onItemClick?.(i)}
          >
            {item.type === "image" ? (
              <img
                src={item.src}
                alt=""
                loading={i === 0 ? "eager" : "lazy"}
                draggable={false}
              />
            ) : (
              <div className={styles.videoOverlay}>
                <video src={item.src} preload="metadata" muted playsInline />
                <div className={styles.playBadge}>
                  <Play size={20} fill="currentColor" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showNav && (
        <>
          <button
            className={[styles.arrow, styles.arrowLeft].join(" ")}
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            aria-label="Previous image"
            type="button"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <button
            className={[styles.arrow, styles.arrowRight].join(" ")}
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            aria-label="Next image"
            type="button"
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>

          <div className={styles.dots}>
            {items.map((_, i) => (
              <button
                key={i}
                className={[styles.dot, i === activeIndex ? styles.dotActive : ""]
                  .filter(Boolean)
                  .join(" ")}
                onClick={(e) => { e.stopPropagation(); setActiveIndex(i); scrollTo(i); }}
                aria-label={`Go to image ${i + 1}`}
                type="button"
              />
            ))}
          </div>

          <span className={styles.counter}>
            {activeIndex + 1}/{items.length}
          </span>
        </>
      )}
    </div>
  );
}
