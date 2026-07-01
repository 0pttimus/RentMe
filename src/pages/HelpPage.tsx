import { Link } from "react-router-dom";
import { HelpCircle, Mail, MessageCircle, Phone } from "lucide-react";
import { SubPageHeader } from "@/components/SubPageHeader";
import styles from "./HelpPage.module.scss";

const faqs = [
  {
    q: "How does the reservation deposit work?",
    a: "Pay ₦50,000 to reserve a property for 72 hours. Inspect in person, then accept or get a full refund.",
  },
  {
    q: "Is my money safe?",
    a: "All payments are held in escrow until you confirm the property or the inspection window ends.",
  },
  {
    q: "How are listings verified?",
    a: "Every listing passes AI checks and human review before going live.",
  },
];

export default function HelpPage() {
  return (
    <div className={["page-content", styles.page].join(" ")}>
      <SubPageHeader title="Help & Support" subtitle="We're here to help" prevTitle="Profile" backHref="/profile" />

      <div className={styles.actions}>
        <Link to="/assistant" className={styles.chatBtn}>
          <MessageCircle size={16} />
          Chat with RentMe Assistant
        </Link>

        <div className={styles.contactGrid}>
          <a href="mailto:support@rentme.ng" className={styles.contactCard}>
            <Mail size={20} className={styles.contactIcon} strokeWidth={1.75} />
            <span className={styles.contactLabel}>Email</span>
          </a>
          <a href="tel:+2348000000000" className={styles.contactCard}>
            <Phone size={20} className={styles.contactIcon} strokeWidth={1.75} />
            <span className={styles.contactLabel}>Call</span>
          </a>
        </div>
      </div>

      <div className={styles.faqSection}>
        <h2 className={styles.faqTitle}>Frequently asked</h2>
        <div className={styles.faqList}>
          {faqs.map((faq) => (
            <details key={faq.q} className={styles.faq}>
              <summary className={styles.faqQuestion}>
                <HelpCircle size={16} className={styles.faqIcon} strokeWidth={1.75} />
                {faq.q}
              </summary>
              <p className={styles.faqAnswer}>{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}