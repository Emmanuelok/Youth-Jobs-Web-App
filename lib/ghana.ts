/**
 * Ghana administrative regions (16 since the 2018 reorganisation).
 * Verify against the latest gazette before relying on this list for
 * compliance reporting.
 */
export const GHANA_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Western North",
  "Central",
  "Eastern",
  "Volta",
  "Oti",
  "Northern",
  "Savannah",
  "North East",
  "Upper East",
  "Upper West",
  "Bono",
  "Bono East",
  "Ahafo",
] as const;

export type GhanaRegion = (typeof GHANA_REGIONS)[number];

export const PRIMARY_CITIES: { city: string; region: GhanaRegion }[] = [
  { city: "Accra", region: "Greater Accra" },
  { city: "Kumasi", region: "Ashanti" },
  { city: "Tamale", region: "Northern" },
  { city: "Takoradi", region: "Western" },
  { city: "Cape Coast", region: "Central" },
  { city: "Ho", region: "Volta" },
  { city: "Koforidua", region: "Eastern" },
  { city: "Sunyani", region: "Bono" },
  { city: "Wa", region: "Upper West" },
  { city: "Bolgatanga", region: "Upper East" },
];

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "tw", label: "Twi" },
  { code: "ga", label: "Ga" },
  { code: "ee", label: "Ewe" },
  { code: "dag", label: "Dagbani" },
  { code: "ha", label: "Hausa" },
  { code: "fra", label: "French" },
];

export const JOB_CATEGORIES = [
  "Tailoring & garment making",
  "Hairdressing & beauty",
  "Barbering",
  "Phone & electronics repair",
  "Auto mechanic",
  "Carpentry & joinery",
  "Welding & metal fabrication",
  "Catering & food",
  "Construction",
  "Agriculture & farming",
  "Retail & shopkeeping",
  "Delivery & dispatch",
  "Customer service",
  "Office & admin support",
  "Digital & online",
  "Cleaning & housekeeping",
  "Security",
  "Driving",
  "Healthcare support",
  "Education & teaching support",
];

/**
 * Trades that the platform classifies as hazardous for under-18s by default.
 * The Children's Act 1998 (Act 560) and the Hazardous Child Labour Activity
 * Framework for Ghana define these in detail. CONFIRM the current list with
 * the Ministry of Employment and Labour Relations / Department of Social
 * Welfare before launch — the schedule has been amended over time.
 */
export const HAZARDOUS_CATEGORIES_DEFAULT = new Set([
  "Welding & metal fabrication",
  "Construction",
  "Agriculture & farming",
  "Driving",
  "Security",
]);
