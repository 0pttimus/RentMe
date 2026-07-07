export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

export function formatAmountInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-NG");
}

export function parseAmountInput(value: string): number {
  return Number(value.replace(/,/g, ""));
}

const STATUS_LABELS: Record<string, string> = {
  available: "Available",
  pending_verification: "Pending Verification",
  verified: "Verified",
  pending_reservation: "Pending Reservation",
  reserved: "Reserved",
  rented: "Rented",
  draft: "Draft",
  suspended: "Suspended",
};

export function formatStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
