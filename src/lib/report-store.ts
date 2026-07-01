export type ReportReason =
  | "Harassment"
  | "Scam / Fraud"
  | "Abusive language"
  | "False accusation"
  | "Non-payment"
  | "No-show"
  | "Property damage"
  | "Other";

export const reportReasons: ReportReason[] = [
  "Harassment",
  "Scam / Fraud",
  "Abusive language",
  "False accusation",
  "Non-payment",
  "No-show",
  "Property damage",
  "Other",
];

export type Report = {
  id: string;
  threadId: string;
  reporterRole: "tenant" | "worker";
  reporterName: string;
  reportedUser: string;
  reason: ReportReason;
  proof: string[];
  timestamp: number;
  status: "pending" | "reviewed" | "dismissed";
};

const STORAGE_KEY = "rentme_reports";

function load(): Report[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(reports: Report[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch {}
}

export function submitReport(opts: {
  threadId: string;
  reporterRole: "tenant" | "worker";
  reporterName: string;
  reportedUser: string;
  reason: ReportReason;
  proof: string[];
}): Report {
  const reports = load();
  const report: Report = {
    id: `report-${Date.now()}`,
    threadId: opts.threadId,
    reporterRole: opts.reporterRole,
    reporterName: opts.reporterName,
    reportedUser: opts.reportedUser,
    reason: opts.reason,
    proof: opts.proof,
    timestamp: Date.now(),
    status: "pending",
  };
  reports.unshift(report);
  save(reports);
  return report;
}

export function getReports(): Report[] {
  return load();
}

export function getReportsByThread(threadId: string): Report[] {
  return load().filter((r) => r.threadId === threadId);
}
