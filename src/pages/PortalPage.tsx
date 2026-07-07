import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bell, Check, Edit3, MapPin, MessageCircle, Plus, X, Wrench } from "lucide-react";
import { Card } from "@/components/ui/Card";
import ActionSheet from "@/components/ui/ActionSheet";
import { getMyProperties, getLandlordReservations, getReservations, approveReservation, rejectReservation, deleteProperty, landlordUnreserve } from "@/lib/api/client";
import { formatNaira, formatStatus } from "@/lib/format";
import { SkeletonText, SkeletonCard } from "@/components/ui/Skeleton";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import styles from "./PortalPage.module.scss";

export default function PortalPage() {
  const [searchParams] = useSearchParams();
  const [showRenter, setShowRenter] = useState(searchParams.get("tab") !== "provider");
  const { count: unread } = useUnreadCount();

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ flex: 1 }}>Portal</h1>
          <Link to="/notifications" aria-label="Notifications" className={styles.bellLink}>
            <Bell size={20} strokeWidth={1.75} />
            {unread > 0 && <span className={styles.bellBadge}>{unread}</span>}
          </Link>
        </div>
      </div>

      <div className={styles.roleToggle}>
        <button type="button" onClick={() => setShowRenter(true)}
          className={[styles.roleBtn, showRenter ? styles.roleBtnActive : ""].filter(Boolean).join(" ")}>Renter</button>
        <button type="button" onClick={() => setShowRenter(false)}
          className={[styles.roleBtn, !showRenter ? styles.roleBtnActive : ""].filter(Boolean).join(" ")}>Provider</button>
      </div>

      {showRenter ? <RenterTab /> : <ProviderTab />}
    </div>
  );
}

function RenterTab() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReservations().then(r => {
      if (r.data?.reservations) setReservations(r.data.reservations);
      setLoading(false);
    });
  }, []);

  const active = reservations.filter(r => ["pending_landlord", "inspecting", "expired_inspection", "extend_pending", "occupied"].includes(r.status));
  const past = reservations.filter(r => ["cancelled", "rejected"].includes(r.status));

  return (
    <div className={styles.section}>
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <>
              <p className={styles.sectionLabel}>Active Rentals ({active.length})</p>
              <div className={`${styles.rentalList} stagger-in`}>
                {active.map(r => {
                  const photos = safeParse(r.photos);
                  const linkTo = ["inspecting", "expired_inspection", "extend_pending", "pending_landlord"].includes(r.status) ? `/reserve/${r.property_id}` : `/property/${r.property_id}`;
                  return (
                    <Link to={linkTo} key={r.id} className={styles.rentalCard}>
                      <div className={styles.rentalTop}>
                        {photos.length > 0 && <img src={photos[0]} alt="" className={styles.rentalThumb} />}
                        <div className={styles.rentalInfo}>
                          <p className={styles.rentalTitle}>{r.title}</p>
                          <p className={styles.rentalMeta}>{formatNaira(r.rent_amount_ngn)}/{r.rent_period} &middot; {r.landlord_name}</p>
                          <p className={styles.rentalMeta}>{formatStatus(r.status)}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}

          <p className={styles.sectionLabel}>Rental History ({past.length})</p>
          {past.length === 0 && active.length === 0 ? (
            <Card className={styles.emptyCard}>
              <p className={styles.emptyTitle}>No rentals yet</p>
              <p className={styles.emptyText}>Browse the markets to find something to rent.</p>
              <Link to="/markets" className={styles.emptyBtn}>Browse markets</Link>
            </Card>
          ) : past.length === 0 ? (
            <Card className={styles.emptyCard}><p className={styles.emptyText}>No past rentals.</p></Card>
          ) : (
            <div className={`${styles.rentalList} stagger-in`}>
              {past.map(r => {
                const photos = safeParse(r.photos);
                return (
                  <Link to={`/property/${r.property_id}`} key={r.id} className={styles.rentalCard}>
                    <div className={styles.rentalTop}>
                      {photos.length > 0 && <img src={photos[0]} alt="" className={styles.rentalThumb} />}
                      <div className={styles.rentalInfo}>
                        <p className={styles.rentalTitle}>{r.title}</p>
                        <p className={styles.rentalMeta}>{formatNaira(r.rent_amount_ngn)}/{r.rent_period} &middot; {r.landlord_name}</p>
                        <p className={styles.rentalMeta}>{formatStatus(r.status)}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      <p className={styles.sectionLabel}>Quick actions</p>
      <div className={styles.actionGrid}>
        <Link to="/markets" className={styles.actionBtn}><Plus size={14} strokeWidth={1.75} /> Rent something new</Link>
        <Link to="/repair-request" className={styles.actionBtn}><Wrench size={14} strokeWidth={1.75} /> Request repair</Link>
        <Link to="/messages" className={styles.actionBtn}><MessageCircle size={14} strokeWidth={1.75} /> Messages</Link>
      </div>
    </div>
  );
}

function ProviderTab() {
  const [myProperties, setMyProperties] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; action: "accept" | "reject" } | null>(null);

  useEffect(() => {
    Promise.all([
      getMyProperties(),
      getLandlordReservations(),
    ]).then(([propRes, reqRes]) => {
      if (propRes.data?.properties) setMyProperties(propRes.data.properties);
      if (reqRes.data?.reservations) setRequests(reqRes.data.reservations);
      setLoading(false);
    });
  }, []);

  const handleApprove = async (reservationId: string) => {
    setProcessingId(reservationId);
    await approveReservation(reservationId);
    setRequests((prev) => prev.filter((r) => r.id !== reservationId));
    setProcessingId(null);
  };

  const handleReject = async (reservationId: string) => {
    setProcessingId(reservationId);
    await rejectReservation(reservationId);
    setRequests((prev) => prev.filter((r) => r.id !== reservationId));
    setProcessingId(null);
  };

  const handleDelete = async (propertyId: string) => {
    setDeletingId(propertyId);
    await deleteProperty(propertyId);
    setMyProperties((prev) => prev.filter((p) => p.id !== propertyId));
    setDeletingId(null);
  };

  const handleUnreserve = async (propertyId: string) => {
    if (!confirm("Cancel all reservations for this property and make it available?")) return;
    setProcessingId(propertyId);
    await landlordUnreserve(propertyId);
    setProcessingId(null);
    const [reqRes] = await Promise.all([getLandlordReservations()]);
    if (reqRes.data?.reservations) setRequests(reqRes.data.reservations);
  };

  const pendingRequests = requests.filter((r) => r.status === "pending_landlord");

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <p className={styles.sectionLabel}>My Listings ({myProperties.length})</p>
        <Link to="/list-property" className={styles.addBtn}><Plus size={14} strokeWidth={2} /> List new</Link>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingRight: 16 }}>
          <SkeletonText lines={2} />
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          {pendingRequests.length > 0 && (
            <>
              <p className={styles.sectionLabel}>Reservation Requests ({pendingRequests.length})</p>
              <div className={styles.requestList}>
                {pendingRequests.map((r) => (
                  <Card key={r.id} className={styles.requestCard}>
                      <div className={styles.requestBody}>
                        <Link to={`/user/${r.tenant_id}`} className={styles.requestTenant}>{r.tenant_name || "Tenant"}</Link>
                      <p className={styles.requestProperty}>{r.title}</p>
                      {r.address && <p className={styles.requestAddress}>{r.address}</p>}
                    </div>
                    <div className={styles.requestActions}>
                      <button type="button" className={styles.approveBtn}
                        onClick={() => setConfirmTarget({ id: r.id, action: "accept" })} disabled={processingId === r.id}>
                        <Check size={14} strokeWidth={2.5} /> Accept
                      </button>
                      <button type="button" className={styles.rejectBtn}
                        onClick={() => setConfirmTarget({ id: r.id, action: "reject" })} disabled={processingId === r.id}>
                        <X size={14} strokeWidth={2.5} /> Reject
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          <p className={styles.sectionLabel}>Listings</p>
          {myProperties.length === 0 ? (
            <Card className={styles.emptyCard}>
              <p className={styles.emptyTitle}>You haven't listed any items yet</p>
              <p className={styles.emptyText}>List a property for rent.</p>
              <Link to="/list-property" className={styles.emptyBtn}>List an item</Link>
            </Card>
          ) : (
            <div className={styles.propertyList}>
              {myProperties.map((p) => {
                const photos = safeParse(p.photos);
                return (
                  <div key={p.id} className={styles.propertyCard}>
                    <Link to={`/property/${p.id}`} className={styles.propertyLink}>
                      <div className={styles.propertyImage}>
                        {photos.length > 0 ? <img src={photos[0]} alt="" /> : <div className={styles.propertyImagePlaceholder} />}
                      </div>
                      <div className={styles.propertyBody}>
                        <h3 className={styles.propertyTitle}>{p.title}</h3>
                        <p className={styles.propertyLocation}><MapPin size={11} strokeWidth={2} />{p.city}, {p.state}</p>
                        <p className={styles.propertyPrice}>{formatNaira(p.rentAmountNgn)}<span className={styles.propertyPriceUnit}>/{p.rentPeriod}</span></p>
                        <p className={`${styles.propertyStatus} ${p.status === "available" || p.status === "pending_verification" || p.status === "verified" ? styles.statusActive : styles.statusInactive}`}>{formatStatus(p.status)}</p>
                        <span className={styles.verifyCount}>{p.verificationCount}/5 verified</span>
                      </div>
                    </Link>
                    <Link to={`/property/${p.id}/edit`} className={styles.editBtn} aria-label="Edit listing"><Edit3 size={15} strokeWidth={2} /></Link>
                      <button type="button" className={styles.deleteBtn} onClick={() => setDeleteTarget(p.id)} disabled={deletingId === p.id} aria-label="Delete listing">
                        {deletingId === p.id ? <span>...</span> : <X size={15} strokeWidth={2} />}
                      </button>
                      {requests.some((r) => r.property_id === p.id && r.status === "pending_landlord") && (
                        <button type="button" className={styles.unreserveBtn} onClick={() => handleUnreserve(p.id)} disabled={processingId === p.id}>
                          {processingId === p.id ? "..." : "Unreserve"}
                        </button>
                      )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {confirmTarget && (
        <ActionSheet
          title={confirmTarget.action === "accept" ? "Accept Request" : "Reject Request"}
          description={`This will ${confirmTarget.action === "accept" ? "approve the reservation and give the tenant 48 hours to inspect" : "decline this reservation request"}.\nAre you sure?`}
          options={[
            { label: confirmTarget.action === "accept" ? "Accept" : "Reject", destructive: confirmTarget.action === "reject", onClick: () => (confirmTarget.action === "accept" ? handleApprove : handleReject)(confirmTarget.id) },
          ]}
          onClose={() => setConfirmTarget(null)}
        />
      )}

      {deleteTarget && (
        <ActionSheet
          options={[
            { label: "Delete listing", destructive: true, onClick: () => handleDelete(deleteTarget) },
          ]}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function safeParse(v: string | string[]): string[] {
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v); } catch { return []; }
}
