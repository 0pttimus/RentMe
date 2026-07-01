import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Star, Send, CheckCircle } from "lucide-react";
import styles from "./ReviewWorkerPage.module.scss";

export default function ReviewWorkerPage() {
  const { id: _id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const worker = null as { id: string; nickname: string; profilePicture: string; categories: string[]; charge: { type: string; amount: number; min: number; max: number } } | null;

  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!worker) return <Navigate to="/hire" replace />;

  const handleSubmit = async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className={["page-content", styles.page].join(" ")}>
        <div className={styles.doneSection}>
          <div className={styles.doneIcon}>
            <CheckCircle size={48} strokeWidth={1.5} />
          </div>
          <h2 className={styles.doneHeading}>Review submitted!</h2>
          <p className={styles.doneText}>
            Thanks for rating {worker.nickname}. Your feedback helps other tenants make informed decisions.
          </p>
          <button className={styles.doneBtn} onClick={() => navigate("/hire")} type="button">
            Back to Hire
          </button>
          <button className={styles.viewWorkerBtn} onClick={() => navigate(`/worker/${worker.id}`)} type="button">
            View {worker.nickname}'s profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <button className={styles.back} onClick={() => navigate(-1)} type="button">
        <ChevronLeft size={22} strokeWidth={2.5} />
      </button>

      <h1 className={styles.heading}>Review {worker.nickname}</h1>

      <div className={styles.workerPreview}>
        <img src={worker.profilePicture} alt={worker.nickname} className={styles.avatar} />
        <div>
          <p className={styles.workerName}>{worker.nickname}</p>
          <p className={styles.workerCategory}>{worker.categories[0]}</p>
        </div>
      </div>

      <p className={styles.ratingLabel}>Rate your experience</p>
      <div className={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            className={[
              styles.star,
              (hoveredStar || rating) >= star ? styles.starActive : "",
            ].filter(Boolean).join(" ")}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            type="button"
            aria-label={`${star} star${star !== 1 ? "s" : ""}`}
          >
            <Star size={36} strokeWidth={1.5} fill={(hoveredStar || rating) >= star ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <p className={styles.ratingHint}>
          {rating <= 2 ? "Needs improvement" : rating === 3 ? "It was okay" : rating === 4 ? "Good work" : "Excellent!"}
        </p>
      )}

      <div className={styles.field}>
        <label className={styles.label}>Write a review (optional)</label>
        <textarea
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Share details about your experience..."
          rows={5}
          maxLength={5000}
        />
        <span className={styles.counter}>{text.length}/5000</span>
      </div>

      <button
        className={styles.submitBtn}
        disabled={rating === 0 || submitting}
        onClick={handleSubmit}
        type="button"
      >
        {submitting ? (
          <span className={styles.spinner} />
        ) : (
          <Send size={16} strokeWidth={2} />
        )}
        {submitting ? "Submitting..." : "Submit review"}
      </button>
    </div>
  );
}
