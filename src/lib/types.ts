export type TrustLevel = "Elite" | "Trusted" | "Average" | "Risk";

export type Property = {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  pricePerYear: number;
  bedrooms: number;
  bathrooms: number;
  furnished: boolean;
  condition: "new" | "renovated" | "fairly-used";
  verified: boolean;
  trustLevel: TrustLevel;
  propertyId: string;
  ownershipVerified: boolean;
  priorTenancies: number;
  lastInspected: string;
  images: string[];
  video?: string;
  landlord: {
    name: string;
    initials: string;
    trustLevel: TrustLevel;
    responseRate: number;
  };
};

export type Applicant = {
  id: string;
  name: string;
  initials: string;
  trustLevel: TrustLevel;
  appliedDaysAgo: number;
  propertyTitle: string;
};

export type WalletActivity = {
  id: string;
  label: string;
  amount: number;
  direction: "in" | "out";
};

export type Gig = {
  id: string;
  title: string;
  provider: string;
  trustLevel: TrustLevel;
  price: number;
  category: string;
  icon: "spray" | "bolt" | "tool" | "truck";
};
