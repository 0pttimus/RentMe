export type CategorySlug =
  | "houses" | "trucks" | "cameras" | "tents" | "halls"
  | "warehouses" | "shops" | "office" | "land" | "construction"
  | "boats";

export type FilterConfig = {
  key: string;
  label: string;
  type: "select" | "range" | "toggle" | "segmented";
  options?: string[];
  unit?: string;
};

export type RoleLabels = {
  renter: string;
  provider: string;
};

export type RentalCategory = {
  slug: CategorySlug;
  name: string;
  emoji: string;
  description: string;
  priceLabel: string;
  filters: FilterConfig[];
  roleLabels: RoleLabels;
};

export const rentalCategories: RentalCategory[] = [
  {
    slug: "houses",
    name: "Houses & Apartments",
    emoji: "🏠",
    description: "Residential properties for rent",
    priceLabel: "/year",
    roleLabels: { renter: "Tenant", provider: "Landlord" },
    filters: [
      { key: "bedrooms", label: "Bedrooms", type: "segmented", options: ["Any", "1", "2", "3", "4+"] },
      { key: "furnished", label: "Furnishing", type: "segmented", options: ["Any", "Furnished", "Unfurnished"] },
      { key: "condition", label: "Condition", type: "segmented", options: ["Any", "New", "Renovated", "Fairly used"] },
    ],
  },
  {
    slug: "trucks",
    name: "Cars, Trucks & Heavy Duty",
    emoji: "🚛",
    description: "Cars, pickup trucks, lorries, and heavy-duty vehicles",
    priceLabel: "/day",
    roleLabels: { renter: "Renter", provider: "Owner" },
    filters: [
      { key: "type", label: "Type", type: "select", options: ["Any", "Car", "Pickup", "Lorry/Truck", "Heavy duty", "Bus"] },
      { key: "transmission", label: "Transmission", type: "segmented", options: ["Any", "Automatic", "Manual"] },
      { key: "capacity", label: "Capacity (tons)", type: "segmented", options: ["Any", "<2", "2–5", "5–15", "15+"] },
    ],
  },
  {
    slug: "cameras",
    name: "Cameras & AV Equipment",
    emoji: "📷",
    description: "Professional cameras, camcorders, lighting, and AV gear",
    priceLabel: "/day",
    roleLabels: { renter: "Renter", provider: "Owner" },
    filters: [
      { key: "type", label: "Type", type: "select", options: ["Any", "DSLR Camera", "Video Camera", "Drone", "Lighting Kit", "Microphone", "Full studio"] },
      { key: "condition", label: "Condition", type: "segmented", options: ["Any", "New", "Like new", "Fairly used"] },
    ],
  },
  {
    slug: "tents",
    name: "Tents, Canopies & Event Furniture",
    emoji: "⛺",
    description: "Tents, canopies, chairs, tables, sofas, and event decor",
    priceLabel: "/day",
    roleLabels: { renter: "Renter", provider: "Vendor" },
    filters: [
      { key: "size", label: "Tent size", type: "select", options: ["Any", "Small (10×10)", "Medium (20×20)", "Large (30×30)", "XL (40×40+)", "Furniture only"] },
      { key: "includes", label: "Includes", type: "segmented", options: ["Any", "Tent only", "Full setup", "With chairs", "With furniture"] },
    ],
  },
  {
    slug: "halls",
    name: "Event Halls & Venues",
    emoji: "🏛️",
    description: "Banquet halls, party venues, conference rooms",
    priceLabel: "/event",
    roleLabels: { renter: "Client", provider: "Venue Owner" },
    filters: [
      { key: "capacity", label: "Capacity", type: "segmented", options: ["Any", "1–50", "51–150", "151–300", "300+"] },
      { key: "catering", label: "Catering", type: "segmented", options: ["Any", "In-house", "External allowed", "None"] },
    ],
  },
  {
    slug: "warehouses",
    name: "Warehouses & Storage",
    emoji: "🏭",
    description: "Storage spaces, warehouses, and logistics hubs",
    priceLabel: "/month",
    roleLabels: { renter: "Lessee", provider: "Lessor" },
    filters: [
      { key: "size", label: "Size (sq ft)", type: "segmented", options: ["Any", "< 500", "500–2000", "2000–5000", "5000+"] },
      { key: "security", label: "Security", type: "segmented", options: ["Any", "24/7 security", "CCTV", "Basic"] },
    ],
  },
  {
    slug: "shops",
    name: "Shops & Retail Spaces",
    emoji: "🏪",
    description: "Shop spaces, boutiques, and storefronts",
    priceLabel: "/month",
    roleLabels: { renter: "Lessee", provider: "Lessor" },
    filters: [
      { key: "size", label: "Size", type: "segmented", options: ["Any", "Small", "Medium", "Large"] },
      { key: "location", label: "Location type", type: "segmented", options: ["Any", "Mall", "Street", "Market"] },
    ],
  },
  {
    slug: "office",
    name: "Office Space",
    emoji: "💼",
    description: "Co-working spaces, private offices, executive suites",
    priceLabel: "/month",
    roleLabels: { renter: "Lessee", provider: "Lessor" },
    filters: [
      { key: "capacity", label: "Capacity", type: "segmented", options: ["Any", "1–5", "6–20", "21–50", "50+"] },
      { key: "furnished", label: "Furnishing", type: "segmented", options: ["Any", "Fully furnished", "Semi-furnished", "Shell"] },
    ],
  },
  {
    slug: "land",
    name: "Land",
    emoji: "🌳",
    description: "Plots of land for short or long-term lease",
    priceLabel: "/year",
    roleLabels: { renter: "Lessee", provider: "Lessor" },
    filters: [
      { key: "size", label: "Plot size", type: "segmented", options: ["Any", "< 1 plot", "1–2 plots", "3–5 plots", "5+ plots"] },
      { key: "purpose", label: "Purpose", type: "segmented", options: ["Any", "Residential", "Commercial", "Agricultural"] },
    ],
  },
  {
    slug: "construction",
    name: "Construction Equipment",
    emoji: "🔧",
    description: "Scaffolding, concrete mixers, block moulders, and tools",
    priceLabel: "/day",
    roleLabels: { renter: "Renter", provider: "Owner" },
    filters: [
      { key: "type", label: "Type", type: "select", options: ["Any", "Scaffolding", "Mixer", "Block moulder", "Compactor", "Generator", "Vibrator", "Pump"] },
      { key: "condition", label: "Condition", type: "segmented", options: ["Any", "New", "Serviced", "Fairly used"] },
    ],
  },
  {
    slug: "boats",
    name: "Boats & Watercraft",
    emoji: "🚤",
    description: "Boats, jet skis, and water sports equipment",
    priceLabel: "/day",
    roleLabels: { renter: "Renter", provider: "Owner" },
    filters: [
      { key: "type", label: "Type", type: "select", options: ["Any", "Speed boat", "Yacht", "Jet ski", "Kayak", "Fishing boat"] },
      { key: "capacity", label: "Capacity", type: "segmented", options: ["Any", "1–4", "5–10", "10+"] },
    ],
  },
];

export function getCategory(slug: string): RentalCategory | undefined {
  return rentalCategories.find((c) => c.slug === slug);
}
