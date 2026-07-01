import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Check, ArrowRight, AlertTriangle, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { BottomSheet } from "@/components/BottomSheet";
import { getProperty, submitReport } from "@/lib/api/client";
import { formatNaira } from "@/lib/format";
import styles from "./ReservePage.module.scss";

type Property = {
  id: string;
  title: string;
  rent_amount_ngn: number;
};

export default function ReservePage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("Property unavailable");
  const [reporting, setReporting] = useState(false);
  const [reportStatus, setReportStatus] = useState("");

  useEffect(() => {
    if (!id) return;
    getProperty(id).then((res) => {
      setProperty(res.data?.property ?? null);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="page-content"><p>Loading...</p></div>;
  if (!property) return <Navigate to="/markets" replace />;

  async function sendReport() {
    if (!property || reporting) return;
    setReporting(true);
    setReportStatus("");

    const result = await submitReport({
      targetType: "property",
      targetId: property.id,
      reason,
    });

    setReporting(false);
    if (result.error) {
      setReportStatus(result.error);
      return;
    }
    setReportStatus("Report sent. Our moderation team will review it.");
  }

  return (
    <>
      <div className={["page-content", styles.page].join(" ")}>
        <div className="page-header">
          <h1>Reservation</h1>
        </div>

        <div className={styles.steps}>
          <span className={styles.stepDone}>
            <Check size={11} strokeWidth={2.5} />
            Deposit paid
          </span>
          <ArrowRight size={12} className={styles.stepArrow} />
          <span className={styles.stepActive}>Inspecting</span>
          <ArrowRight size={12} className={styles.stepArrow} />
          <span className={styles.stepPending}>Confirm</span>
        </div>

        <Card className={styles.propertyCard}>
          <div className={styles.propertyRow}>
            <div>
              <p className={styles.propertyTitle}>{property.title}</p>
              <p className={styles.propertyPrice}>
                {formatNaira(property.rent_amount_ngn)} / year
              </p>
            </div>
            <div className={styles.propertyThumb}>
              <ImageIcon size={16} className={styles.thumbIcon} strokeWidth={1.5} />
            </div>
          </div>
        </Card>

        <Link to="/portal" className={styles.acceptBtn}>
          Accept &amp; pay balance
        </Link>
        <button type="button" className={styles.reportBtn} onClick={() => setReportOpen(true)}>
          <AlertTriangle size={14} strokeWidth={2} />
          Report an issue
        </button>
      </div>

      <BottomSheet open={reportOpen} title="Report issue" onClose={() => setReportOpen(false)}>
        <div className={styles.reportSheet}>
          <p className={styles.reportCopy}>
            Tell us what went wrong with this reservation. Reports are reviewed before penalties
            are applied.
          </p>

          <label className={styles.field}>
            <span>Reason</span>
            <select value={reason} onChange={(event) => setReason(event.target.value)}>
              <option>Property unavailable</option>
              <option>Wrong address</option>
              <option>Fake photos or videos</option>
              <option>Landlord requested off-platform payment</option>
              <option>Safety concern</option>
            </select>
          </label>

          {reportStatus && <p className={styles.reportStatus}>{reportStatus}</p>}

          <div className={styles.sheetActions}>
            <button
              type="button"
              className={styles.submitReportBtn}
              disabled={reporting}
              onClick={sendReport}
            >
              {reporting ? "Sending..." : "Send report"}
            </button>
            <button
              type="button"
              className={styles.cancelReportBtn}
              onClick={() => setReportOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
