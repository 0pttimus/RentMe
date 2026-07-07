import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SubPageHeader } from "@/components/SubPageHeader";
import { getVerifierStatus, getNearbyProperties, submitVerification, getVerifierHistory } from "@/lib/api/client";
import { Verified, MapPin, Circle } from "lucide-react";
import styles from "./VerifierDashboardPage.module.scss";

const MAX_RECORDING_MS = 30_000;

export default function VerifierDashboardPage() {
  const navigate = useNavigate();
  const [verifier, setVerifier] = useState<any>(null);
  const [props, setProps] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState("");
  const [timer, setTimer] = useState(MAX_RECORDING_MS / 1000);
  const [notes, setNotes] = useState("");
  const [geolocation, setGeolocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [msg, setMsg] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const v = await getVerifierStatus();
    if (v.error || !v.data?.verifier) { setLoading(false); return; }
    setVerifier(v.data.verifier);

    if (v.data.verifier.status !== "accepted") { setLoading(false); return; }

    // get geolocation then fetch nearby
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      setGeolocation({ lat, lng, accuracy: pos.coords.accuracy ?? undefined });
      const [nearby, hist] = await Promise.all([
        getNearbyProperties(lat, lng),
        getVerifierHistory(),
      ]);
      if (!nearby.error) setProps(nearby.data?.properties ?? []);
      if (!hist.error) setHistory(hist.data?.submissions ?? []);
      setLoading(false);
    }, () => {
      // fallback: try nearby with Lagos coords
      getNearbyProperties(6.5244, 3.3792).then((r) => {
        if (!r.error) setProps(r.data?.properties ?? []);
      });
      setLoading(false);
    });
  }

  async function startRecording(propertyId: string) {
    setSelectedPropertyId(propertyId);
    chunks.current = [];
    setRecordedBlob(null);
    setRecordedUrl("");
    setTimer(MAX_RECORDING_MS / 1000);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: "video/mp4" });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      recorder.start();
      setRecording(true);

      let elapsed = 0;
      timerRef.current = setInterval(() => {
        elapsed += 1;
        setTimer(MAX_RECORDING_MS / 1000 - elapsed);
        if (elapsed >= MAX_RECORDING_MS / 1000) {
          recorder.stop();
          clearInterval(timerRef.current);
          setRecording(false);
        }
      }, 1000);
    } catch {
      setMsg("Camera access denied.");
    }
  }

  function stopRecording() {
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.stop();
    }
    clearInterval(timerRef.current);
    setRecording(false);
  }

  function cancelRecording() {
    clearInterval(timerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    setRecording(false);
    setRecordedBlob(null);
    setRecordedUrl("");
    setSelectedPropertyId(null);
  }

  async function submitVideo() {
    if (!recordedBlob || !selectedPropertyId) return;
    setSubmitting(true);

    // convert blob to base64 data URL
    const reader = new FileReader();
    reader.onload = async () => {
      const videoUrl = String(reader.result);
      const locationLat = geolocation?.lat ?? 6.5244;
      const locationLng = geolocation?.lng ?? 3.3792;
      const locationAccuracy = geolocation?.accuracy;
      const res = await submitVerification({
        propertyId: selectedPropertyId,
        videoUrl,
        locationLat,
        locationLng,
        locationAccuracy,
        notes: notes || undefined,
      });
      setSubmitting(false);
      if (res.error) { setMsg(res.error); return; }
      setMsg("Verification submitted!");
      setRecordedBlob(null);
      setRecordedUrl("");
      setSelectedPropertyId(null);
      setNotes("");
      loadData(); // refresh
    };
    reader.readAsDataURL(recordedBlob);
  }

  if (loading) {
    return (
      <div className={["page-content", styles.page].join(" ")}>
        <SubPageHeader title="Verifier" prevTitle="Profile" backHref="/profile" />
        <div className="spinnerWrap"><div className="spinner" /></div>
      </div>
    );
  }

  if (!verifier) {
    return (
      <div className={["page-content", styles.page].join(" ")}>
        <SubPageHeader title="Verifier" prevTitle="Profile" backHref="/profile" />
        <div className={styles.content}>
          <p className={styles.empty}>You haven't applied to be a verifier yet.</p>
          <button type="button" className={styles.primaryBtn} onClick={() => navigate("/verifier/apply")}>
            Apply Now
          </button>
        </div>
      </div>
    );
  }

  if (verifier.status === "pending") {
    return (
      <div className={["page-content", styles.page].join(" ")}>
        <SubPageHeader title="Verifier" prevTitle="Profile" backHref="/profile" />
        <div className={styles.content}>
          <div className={styles.pending}>
            <p>Your application is pending review. We'll notify you once approved.</p>
          </div>
        </div>
      </div>
    );
  }

  const todayUsed = verifier.daily_count ?? 0;
  const remaining = Math.max(0, 10 - todayUsed);

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <SubPageHeader title="Verifier Dashboard" prevTitle="Profile" backHref="/profile" />
      <div className={styles.content}>
        {/* Stats */}
        <div className={styles.row}>
          <div className={styles.statCard}>
            <p>₦{verifier.total_earned_ngn?.toLocaleString() ?? 0}</p>
            <p>Earned</p>
          </div>
          <div className={styles.statCard}>
            <p>{remaining}</p>
            <p>Left today</p>
          </div>
          <div className={styles.statCard}>
            <p>{props.length}</p>
            <p>Nearby</p>
          </div>
        </div>

        <p className={styles.sectionTitle}>Nearby Properties</p>
        {props.length === 0 && <p className={styles.empty}>No properties within walking distance. Check back later.</p>}

        {props.map((p) => (
          <div key={p.id} className={styles.card}>
            {p.photos?.[0] && <img src={p.photos[0]} alt={p.title} />}
            <div className={styles.cardBody}>
              <p className={styles.cardTitle}>{p.title}</p>
              <p className={styles.cardAddr}>{p.address}, {p.city}</p>
              <div className={styles.row}>
                <span className={styles.cardMeta}><MapPin size={11} /> ~{Math.round(p.distance)}m</span>
                {p.verified_count >= 5 ? (
                  <span className={styles.verifiedBadge}><Verified size={12} /> Verified</span>
                ) : (
                  <span className={styles.cardMeta}>{p.verified_count}/5 verifications</span>
                )}
              </div>
              <button type="button" className={styles.recordBtn} onClick={() => startRecording(p.id)}>
                <Circle size={12} fill="currentColor" /> Record Video
              </button>
            </div>
          </div>
        ))}

        {history.length > 0 && <p className={styles.sectionTitle}>Recent Submissions</p>}
        {history.slice(0, 5).map((s) => (
          <div key={s.id} className={styles.cardBody} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "12px 14px" }}>
            <p className={styles.cardTitle}>{s.property_title}</p>
            <p className={styles.cardMeta}>{s.status} · {new Date(s.created_at).toLocaleDateString()} · {s.city}</p>
          </div>
        ))}

        {msg && <p className={styles.empty}>{msg}</p>}
      </div>

      {/* Recording overlay */}
      {selectedPropertyId && !recordedBlob && (
        <div className={styles.overlay}>
          <p className={styles.timer}>{timer}s</p>
          <video ref={videoRef} autoPlay muted playsInline />
          {!recording ? (
            <div className={styles.overlayActions}>
              <button type="button" className={styles.cancelBtn} onClick={cancelRecording}>Cancel</button>
              <button type="button" className={styles.recBtn} onClick={() => startRecording(selectedPropertyId)}>Record</button>
            </div>
          ) : (
            <div className={styles.overlayActions}>
              <button type="button" className={styles.stopBtn} onClick={stopRecording}>Stop</button>
            </div>
          )}
        </div>
      )}

      {/* Preview overlay */}
      {recordedUrl && (
        <div className={styles.overlay}>
          <video src={recordedUrl} controls playsInline style={{ maxWidth: 400, borderRadius: 12 }} />
          <textarea
            className={styles.notesInput}
            placeholder="Add notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <p className={styles.locationNote}>
            <MapPin size={11} /> Location will be recorded at submission
          </p>
          <div className={styles.overlayActions}>
            <button type="button" className={styles.cancelBtn} onClick={cancelRecording}>Retake</button>
            <button type="button" className={styles.submitBtn} disabled={submitting} onClick={submitVideo}>
              {submitting ? "Submitting..." : "Submit Verification"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
