import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { switchToTl } from "@/store/slices/accountSlice";
import styles from "./FreelanceMarketsPage.module.scss";

const listings = [
  { id: "1", title: "Fix leaking kitchen pipe", location: "Lekki Phase 1", budget: "₦5,000 – ₦8,000", category: "Plumbing", posted: "2 hrs ago" },
  { id: "2", title: "Rewire living room sockets", location: "Ikeja GRA", budget: "₦12,000 – ₦18,000", category: "Electrical", posted: "5 hrs ago" },
  { id: "3", title: "Deep clean 3-bedroom flat", location: "VI, Lagos", budget: "₦25,000 – ₦35,000", category: "Cleaning", posted: "1 day ago" },
  { id: "4", title: "Install ceiling fans (4 units)", location: "Wuse 2, Abuja", budget: "₦15,000 – ₦22,000", category: "Electrical", posted: "1 day ago" },
  { id: "5", title: "Fix bathroom tiles & grout", location: "Gwarinpa, Abuja", budget: "₦8,000 – ₦12,000", category: "Tiling", posted: "2 days ago" },
  { id: "6", title: "Paint 2-bedroom apartment", location: "Bodija, Ibadan", budget: "₦80,000 – ₦120,000", category: "Painting", posted: "3 days ago" },
];

const categories = ["All", "Plumbing", "Electrical", "Cleaning", "Painting", "Tiling", "Carpentry", "Gardening"];

export default function FreelanceMarketsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  return (
    <div className={["page-content", styles.page].join(" ")}>
      <div className="page-header">
        <div className={styles.headerRow}>
          <div>
            <h1>Freelance Markets</h1>
            <p>Gigs near you</p>
          </div>
          <button
            className={styles.exitBtn}
            onClick={() => { dispatch(switchToTl()); navigate("/markets"); }}
            type="button"
          >
            <LogOut size={14} strokeWidth={2} />
            Exit
          </button>
        </div>
      </div>

      <div className={styles.categories}>
        {categories.map((cat) => (
          <button key={cat} className={cat === "All" ? styles.catActive : styles.cat} type="button">
            {cat}
          </button>
        ))}
      </div>

      <div className={styles.list}>
        {listings.map((item) => (
          <div key={item.id} className={styles.card}>
            <div className={styles.cardTop}>
              <span className={styles.category}>{item.category}</span>
              <span className={styles.posted}>{item.posted}</span>
            </div>
            <p className={styles.title}>{item.title}</p>
            <p className={styles.location}>{item.location}</p>
            <p className={styles.budget}>{item.budget}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
