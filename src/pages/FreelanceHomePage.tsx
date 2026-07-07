import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogOut, Edit3, Star, Briefcase, Award, ShieldCheck, UserPlus, Home } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { switchToTl } from "@/store/slices/accountSlice";
import { getFreelanceProfileStatus, getFreelanceProfile, type FreelanceProfile } from "@/lib/api/client";
import styles from "./FreelanceHomePage.module.scss";

export default function FreelanceHomePage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [profile, setProfile] = useState<FreelanceProfile | null>(null);

  useEffect(() => {
    (async () => {
      const statusRes = await getFreelanceProfileStatus();
      if (statusRes.data?.hasProfile) {
        setHasProfile(true);
        const profRes = await getFreelanceProfile();
        if (profRes.data?.profile) setProfile(profRes.data.profile);
      }
      setLoading(false);
    })();
  }, []);

  const handleExit = () => {
    dispatch(switchToTl());
    navigate("/markets");
  };

  if (loading) {
    return (
      <div className={[styles.page, "page-content"].join(" ")}>
        <div className="spinnerWrap"><div className="spinner" /></div>
      </div>
    );
  }

  if (!hasProfile || !profile) {
    return (
      <div className={[styles.page, "page-content"].join(" ")}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}><Home size={28} strokeWidth={1.5} /><UserPlus size={28} strokeWidth={1.5} /></div>
          <p className={styles.emptyTitle}>No freelance profile yet</p>
          <p className={styles.emptyText}>Create a profile to start offering your services. Your real name will be verified through your ID and displayed alongside your chosen display name.</p>
          <Link to="/freelance/edit-profile" className={styles.createBtn}>
            <Edit3 size={16} strokeWidth={2} />
            Create Profile
          </Link>
          <button className={styles.switchBtn} onClick={handleExit} type="button">
            <LogOut size={16} strokeWidth={2} />
            Switch to Tenant / Landlord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={[styles.page, "page-content"].join(" ")}>
      <div className={styles.coverWrap}>
        {profile.bannerUrl ? (
          <img src={profile.bannerUrl} alt="" className={styles.cover} />
        ) : (
          <div className={styles.coverPlaceholder} />
        )}
        <div className={styles.coverOverlay} />
        <button className={styles.exitBtn} onClick={handleExit} type="button" aria-label="Switch account">
          <LogOut size={16} strokeWidth={2} />
        </button>
      </div>

      <div className={styles.profileHeader}>
        <div className={styles.avatarWrap}>
          <img
            src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName)}&background=247a52&color=fff&size=192`}
            alt=""
            className={styles.avatar}
          />
        </div>
        <div className={styles.nameRow}>
          <h1 className={styles.name}>{profile.displayName}</h1>
          {profile.isVerified ? (
            <span className={styles.verifiedBadge}>
              <ShieldCheck size={14} strokeWidth={2.5} /> Verified
            </span>
          ) : null}
        </div>
        <p className={styles.realName}>{profile.realName}</p>
        <Link to="/freelance/edit-profile" className={styles.editBtn}>
          <Edit3 size={14} strokeWidth={2} />
          Edit Profile
        </Link>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <Briefcase size={18} strokeWidth={1.7} />
          <span className={styles.statValue}>{profile.completedJobs}</span>
          <span className={styles.statLabel}>Jobs</span>
        </div>
        <div className={styles.stat}>
          <Star size={18} strokeWidth={1.7} />
          <span className={styles.statValue}>{profile.rating || "—"}</span>
          <span className={styles.statLabel}>Rating</span>
        </div>
        <div className={styles.stat}>
          <Award size={18} strokeWidth={1.7} />
          <span className={styles.statValue}>{profile.categories.length}</span>
          <span className={styles.statLabel}>Skills</span>
        </div>
      </div>

      {profile.bio && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>About</h2>
          <p className={styles.bio}>{profile.bio}</p>
        </div>
      )}

      {profile.categories.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Services</h2>
          <div className={styles.pills}>
            {profile.categories.map((cat) => (
              <span key={cat} className={styles.pill}>{cat}</span>
            ))}
          </div>
        </div>
      )}

      {profile.portfolio.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Portfolio</h2>
          <div className={styles.portfolioGrid}>
            {profile.portfolio.map((item, i) => (
              <div key={i} className={styles.portfolioCard}>
                <div className={styles.portfolioMedia}>
                  {item.type === "image" ? (
                    <img src={item.src} alt="" className={styles.portfolioMedia} />
                  ) : (
                    <video src={item.src} className={styles.portfolioMedia} muted playsInline />
                  )}
                  {item.type === "video" && <span className={styles.playBadge}>▶</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.bottomActions}>
        <Link to="/freelance/portal" className={styles.portalLink}>
          <Briefcase size={16} strokeWidth={2} />
          View Portal
        </Link>
        <button className={styles.switchBtn} onClick={handleExit} type="button">
          <LogOut size={16} strokeWidth={2} />
          Switch to Tenant / Landlord
        </button>
      </div>
    </div>
  );
}
