export const APP_NAME = "RentMe";
export const APP_TAGLINE = "Find real homes. Rent with trust.";

export const RESERVATION_DEPOSIT_NGN = 50_000;
export const INSPECTION_WINDOW_HOURS = 72;
export const PLATFORM_FEE_RENTAL_PERCENT = 0.5;
export const PLATFORM_FEE_SERVICE_PERCENT = 0.1;

export const TRUST_LEVELS = [
  "elite",
  "trusted",
  "average",
  "risk",
  "restricted",
  "banned",
] as const;

export const TRUST_THRESHOLDS = {
  elite: 900,
  trusted: 750,
  average: 500,
  risk: 300,
  restricted: 100,
  banned: 0,
} as const;

export const PROPERTY_TYPES = [
  "apartment",
  "duplex",
  "bungalow",
  "self_contain",
  "studio",
  "penthouse",
  "commercial",
] as const;

export const USER_ROLES = ["tenant", "landlord", "service_provider", "admin"] as const;

export const SERVICE_CATEGORIES = [
  "cleaning",
  "plumbing",
  "electrical",
  "moving",
  "painting",
  "internet",
  "security",
  "repairs",
] as const;

export const KYC_STATUS = ["pending", "in_review", "verified", "rejected"] as const;

export const LISTING_STATUS = [
  "draft",
  "pending_verification",
  "verified",
  "reserved",
  "rented",
  "suspended",
] as const;

export const CURRENCY = {
  display: "NGN",
  symbol: "₦",
  blockchain: "USDT",
} as const;