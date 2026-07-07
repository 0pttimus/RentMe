import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Check, Clock, X, Home, AlertTriangle, ExternalLink, MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SkeletonTitle } from "@/components/ui/Skeleton";
import { getProperty, createReservation, getReservationByProperty, payReservation, depositToEscrow, cancelReservation, backOutReservation, payBalance, extendInspection } from "@/lib/api/client";
import { formatNaira } from "@/lib/format";
import styles from "./ReservePage.module.scss";

const DEP_NGN = 50_000;
const EXTEND_NGN = 5_000;

function mapsUrl(address: string): string {
  const q = encodeURIComponent(address);
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return `geo:0,0?q=${q}`;
  if (/iphone|ipad|ipod/i.test(ua)) return `maps://?q=${q}`;
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function timeLeft(deadline: string): { text: string; urgent: boolean } {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return { text: "Expired", urgent: true };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { text: `${h}h ${m}m ${s}s`, urgent: h < 1 };
}

export default function ReservePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<any>(null);
  const [reservation, setReservation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stepLabel, setStepLabel] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState({ text: "", urgent: false });
  const [txHash, setTxHash] = useState("");

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [propRes, reservRes] = await Promise.all([
      getProperty(id),
      getReservationByProperty(id),
    ]);
    if (propRes.data?.property) setProperty(propRes.data.property);
    if (reservRes.data) setReservation(reservRes.data.reservation);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (!reservation || !["inspecting", "occupied"].includes(reservation.status) || !reservation.inspection_deadline) return;
    const tick = () => setCountdown(timeLeft(reservation.inspection_deadline));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [reservation]);

  const handleReserveNow = async () => {
    if (!id) return;
    setSubmitting(true); setError(""); setTxHash("");
    setStepLabel("Creating reservation...");
    const createRes = await createReservation(id);
    if (createRes.error) { setError(createRes.error); setSubmitting(false); return; }
    const rid = createRes.data!.reservationId;

    setStepLabel("Setting up escrow...");
    const payRes = await payReservation(rid);
    if (payRes.error) { setError(payRes.error); setSubmitting(false); return; }

    setStepLabel("Depositing ₦50,000...");
    const depRes = await depositToEscrow(payRes.data!.escrowAddress, payRes.data!.amount);
    if (depRes.error) { setError(depRes.error); setSubmitting(false); return; }
    if (depRes.data?.txHash) setTxHash(depRes.data.txHash);

    setSubmitting(false);
    await fetch();
  };

  const handlePayBalance = async () => {
    if (!reservation) return;
    setSubmitting(true); setError(""); setStepLabel("Processing payment...");
    const res = await payBalance(reservation.id);
    setSubmitting(false);
    if (res.error) { setError(res.error); return; }
    await fetch();
  };

  const handleBackOut = async () => {
    if (!reservation) return;
    setSubmitting(true); setError(""); setStepLabel("Refunding deposit...");
    const res = await backOutReservation(reservation.id);
    setSubmitting(false);
    if (res.error) { setError(res.error); return; }
    await fetch();
  };

  const handleCancel = async () => {
    if (!reservation) return;
    setSubmitting(true); setError("");
    const res = await cancelReservation(reservation.id);
    setSubmitting(false);
    if (res.error) { setError(res.error); return; }
    await fetch();
  };

  const handleExtend = async () => {
    if (!reservation) return;
    setSubmitting(true); setError(""); setStepLabel("Sending extension fee...");
    const res = await extendInspection(reservation.id);
    setSubmitting(false);
    if (res.error) { setError(res.error); return; }
    await fetch();
  };

  if (loading) {
    return (
      <div className={["page-content", styles.page].join(" ")}>
        <div className="page-header">
          <SkeletonTitle />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 16px" }}>
          <div className="skeleton" style={{ width: "100%", height: 180, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 20, width: "60%", borderRadius: 8 }} />
          <div className="skeleton" style={{ height: 12, width: "40%", borderRadius: 6 }} />
          <div className="skeleton" style={{ height: 48, width: "100%", borderRadius: 14 }} />
          <div className="skeleton" style={{ height: 48, width: "100%", borderRadius: 14 }} />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className={["page-content", styles.page].join(" ")}>
        <p className={styles.statusText}>Property not found.</p>
        <button type="button" className={styles.primaryBtn} onClick={() => navigate("/markets")}>Browse markets</button>
      </div>
    );
  }

  const status = reservation?.status;
  const address = property.address || property.city || "";
  const remainingNgn = Math.max(0, (property.rentAmountNgn || 0) - DEP_NGN);
  const feeNgn = Math.floor(remainingNgn * 0.05);

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <div className="page-header">
        <h1>Reservation</h1>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {!reservation ? (
        <div className={styles.center}>
          <div className={styles.iconCircle}><Home size={28} strokeWidth={1.5} /></div>
          <h2 className={styles.heading}>{property.title}</h2>
          <p className={styles.price}>{formatNaira(property.rentAmountNgn)} / {property.rentPeriod === "any" ? "Any period" : property.rentPeriod}{property.rentDuration ? ` (×${property.rentDuration})` : ""}</p>
          <p className={styles.copy}>Pay {formatNaira(DEP_NGN)} to reserve this property. The deposit stays safe in escrow until you decide to proceed. If the landlord rejects, you get a full refund.</p>
          <button type="button" className={styles.primaryBtn} onClick={handleReserveNow} disabled={submitting}>
            {submitting ? stepLabel : `Reserve with ${formatNaira(DEP_NGN)}`}
          </button>
          {txHash && (
            <a href={`https://solscan.io/tx/${txHash}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className={styles.txLink}>
              <ExternalLink size={12} strokeWidth={2} /> View transaction
            </a>
          )}
        </div>
      ) : status === "pending_landlord" ? (
        <div className={styles.center}>
          <div className={[styles.iconCircle, styles.iconPending].join(" ")}><Clock size={28} strokeWidth={1.5} /></div>
          <h2 className={styles.heading}>Awaiting Landlord</h2>
          <p className={styles.copy}>Your {formatNaira(DEP_NGN)} deposit is safely in escrow. The landlord will review your request soon.</p>
          <div className={styles.statusBadge}>Pending landlord response</div>
          <button type="button" className={styles.dangerBtn} onClick={handleCancel} disabled={submitting}>
            <X size={14} strokeWidth={2.5} /> Cancel & refund
          </button>
        </div>
      ) : status === "inspecting" ? (
        <>
          <Card className={styles.propertyCard}>
            {property.photos?.length > 0 && (
              <img src={property.photos[0]} alt="" className={styles.propertyImage} />
            )}
            <div className={styles.propertyBody}>
              <h2 className={styles.heading}>{property.title}</h2>
              {address && (
                <a href={mapsUrl(address)} target="_blank" rel="noopener noreferrer" className={styles.mapLink}>
                  <MapPin size={14} strokeWidth={2} />
                  {address}
                </a>
              )}
              <p className={styles.price}>{formatNaira(property.rentAmountNgn)} / {property.rentPeriod}</p>
            </div>
          </Card>

          <div className={`${styles.countdownCard} ${countdown.urgent ? styles.countdownUrgent : ""}`}>
            <Clock size={16} strokeWidth={1.75} />
            <span>{countdown.text || "Calculating..."}</span>
          </div>

          <div className={styles.center}>
            <p className={styles.copy}>Inspect the property. Satisfied? Pay the remaining balance. Not satisfied? Back out and your deposit will be refunded.</p>

            <button type="button" className={styles.primaryBtn} onClick={handlePayBalance} disabled={submitting}>
              {submitting ? stepLabel : `Pay Balance ${formatNaira(remainingNgn + feeNgn)} (incl. ${formatNaira(feeNgn)} fee)`}
            </button>

            <button type="button" className={styles.dangerBtn} onClick={handleBackOut} disabled={submitting}>
              <X size={14} strokeWidth={2.5} /> Back Out (refund deposit)
            </button>
          </div>
        </>
      ) : status === "expired_inspection" ? (
        <div className={styles.center}>
          <div className={[styles.iconCircle, styles.iconDanger].join(" ")}><AlertTriangle size={28} strokeWidth={1.5} /></div>
          <h2 className={styles.heading}>Inspection Expired</h2>
          <p className={styles.copy}>Your 24-hour inspection window has closed. Extend by 24 hours for {formatNaira(EXTEND_NGN)} (non-refundable, goes to landlord), or cancel for a full refund.</p>
          <button type="button" className={styles.primaryBtn} onClick={handleExtend} disabled={submitting}>
            {submitting ? stepLabel : `Extend 24h — ${formatNaira(EXTEND_NGN)}`}
          </button>
          <button type="button" className={styles.dangerBtn} onClick={handleCancel} disabled={submitting}>
            <X size={14} strokeWidth={2.5} /> Cancel & refund
          </button>
        </div>
      ) : status === "extend_pending" ? (
        <div className={styles.center}>
          <div className={[styles.iconCircle, styles.iconPending].join(" ")}><Clock size={28} strokeWidth={1.5} /></div>
          <h2 className={styles.heading}>Extension Pending</h2>
          <p className={styles.copy}>The landlord has been notified and will respond to your extension request soon.</p>
          <div className={styles.statusBadge}>Awaiting landlord</div>
        </div>
      ) : status === "occupied" ? (
        <div className={styles.center}>
          <div className={[styles.iconCircle, styles.iconSuccess].join(" ")}><Check size={28} strokeWidth={2} /></div>
          <h2 className={styles.heading}>Active Rental</h2>
          <p className={styles.copy}><strong>{property.title}</strong> is yours. Rental ends in:</p>
          <div className={`${styles.countdownCard} ${countdown.urgent ? styles.countdownUrgent : ""}`}>
            <Clock size={16} strokeWidth={1.75} />
            <span>{countdown.text || "Calculating..."}</span>
          </div>
          <button type="button" className={styles.primaryBtn} onClick={() => navigate("/portal")}>Go to Portal</button>
        </div>
      ) : status === "cancelled" ? (
        <div className={styles.center}>
          <div className={[styles.iconCircle, styles.iconDanger].join(" ")}><X size={28} strokeWidth={2} /></div>
          <h2 className={styles.heading}>Cancelled</h2>
          <p className={styles.copy}>The reservation has been cancelled and your deposit has been refunded.</p>
          <button type="button" className={styles.primaryBtn} onClick={() => navigate("/markets")}>Browse properties</button>
        </div>
      ) : status === "rejected" ? (
        <div className={styles.center}>
          <div className={[styles.iconCircle, styles.iconDanger].join(" ")}><AlertTriangle size={28} strokeWidth={1.5} /></div>
          <h2 className={styles.heading}>Request Declined</h2>
          <p className={styles.copy}>The landlord declined your request for <strong>{property.title}</strong>. Your deposit has been refunded.</p>
          <button type="button" className={styles.primaryBtn} onClick={() => navigate("/markets")}>Browse other properties</button>
        </div>
      ) : null}
    </div>
  );
}
