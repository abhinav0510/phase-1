/**
 * The agents' sector and stage codes (INVESTORS.sectors / stage_min / stage_max
 * and STARTUP_PROFILE.sector_codes / stage_code), with readable names and
 * groups for the investor portal. Matching compares codes, never free text.
 */

export interface SectorDef {
  code: string;
  label: string;
  group: string;
}

/** Display order of the groups in the thesis picker. */
export const SECTOR_GROUPS = [
  "Fintech",
  "SaaS, AI & data",
  "Health",
  "Consumer & D2C",
  "Food & beverage",
  "Education",
  "Climate, mobility & agri",
  "Industrial, deeptech & hardware",
  "Real estate & logistics",
] as const;

export const SECTORS: SectorDef[] = [
  { code: "FINTECH_CONSUMER", label: "Consumer fintech", group: "Fintech" },
  { code: "FINTECH_PAYMENTS", label: "Payments", group: "Fintech" },
  { code: "FINTECH_LENDING", label: "Lending", group: "Fintech" },
  { code: "FINTECH_SME_LENDING", label: "SME lending", group: "Fintech" },
  { code: "FINTECH_INFRA", label: "Fintech infrastructure", group: "Fintech" },
  { code: "INSURTECH", label: "Insurtech", group: "Fintech" },

  { code: "SAAS_ENTERPRISE", label: "Enterprise SaaS", group: "SaaS, AI & data" },
  { code: "AI_APPLIED_ENTERPRISE", label: "Applied AI", group: "SaaS, AI & data" },
  { code: "AI_FOUNDATIONAL", label: "Foundational AI", group: "SaaS, AI & data" },
  { code: "DATA_INFRA_DEVTOOLS", label: "Data infra & dev tools", group: "SaaS, AI & data" },
  { code: "CYBERSECURITY", label: "Cybersecurity", group: "SaaS, AI & data" },
  { code: "HRTECH", label: "HR tech", group: "SaaS, AI & data" },
  { code: "MARTECH_ADTECH", label: "Martech & adtech", group: "SaaS, AI & data" },
  { code: "RETAIL_TECH", label: "Retail tech", group: "SaaS, AI & data" },
  { code: "LEGAL_GOV_TECH", label: "Legal & gov tech", group: "SaaS, AI & data" },

  { code: "HEALTHTECH_DIGITAL", label: "Digital health", group: "Health" },
  { code: "HEALTHCARE_DELIVERY", label: "Healthcare delivery", group: "Health" },
  { code: "MEDTECH_DEVICES", label: "Medtech devices", group: "Health" },
  { code: "BIOTECH_PHARMA", label: "Biotech & pharma", group: "Health" },

  { code: "CONSUMER_TECH_APP", label: "Consumer apps", group: "Consumer & D2C" },
  { code: "CONSUMER_SERVICES", label: "Consumer services", group: "Consumer & D2C" },
  { code: "QUICK_HYPERLOCAL_COMMERCE", label: "Quick & hyperlocal commerce", group: "Consumer & D2C" },
  { code: "D2C_BEAUTY_PERSONAL_CARE", label: "D2C beauty & personal care", group: "Consumer & D2C" },
  { code: "D2C_HEALTH_WELLNESS", label: "D2C health & wellness", group: "Consumer & D2C" },
  { code: "D2C_FASHION_JEWELLERY", label: "D2C fashion & jewellery", group: "Consumer & D2C" },
  { code: "D2C_HOME_LIFESTYLE", label: "D2C home & lifestyle", group: "Consumer & D2C" },
  { code: "MEDIA_GAMING_CREATOR", label: "Media, gaming & creators", group: "Consumer & D2C" },
  { code: "TRAVEL_HOSPITALITY", label: "Travel & hospitality", group: "Consumer & D2C" },
  { code: "PET", label: "Pet care", group: "Consumer & D2C" },

  { code: "FNB_PACKAGED_FOOD", label: "Packaged food", group: "Food & beverage" },
  { code: "FNB_BEVERAGE", label: "Beverages", group: "Food & beverage" },
  { code: "FNB_FOODSERVICE", label: "Foodservice", group: "Food & beverage" },
  { code: "MEAT_SEAFOOD", label: "Meat & seafood", group: "Food & beverage" },
  { code: "ALCOHOL", label: "Alcohol", group: "Food & beverage" },

  { code: "EDTECH_K12_TESTPREP", label: "K-12 & test prep", group: "Education" },
  { code: "EDTECH_HIGHER_ED_ADMISSIONS", label: "Higher ed & admissions", group: "Education" },
  { code: "EDTECH_UPSKILLING_ENTERPRISE", label: "Upskilling & workforce learning", group: "Education" },

  { code: "EV_CLEAN_MOBILITY", label: "EV & clean mobility", group: "Climate, mobility & agri" },
  { code: "CLIMATE_ENERGY", label: "Climate & energy", group: "Climate, mobility & agri" },
  { code: "WATER_TECH", label: "Water tech", group: "Climate, mobility & agri" },
  { code: "SUSTAINABLE_MATERIALS_CIRCULAR", label: "Sustainable materials & circular", group: "Climate, mobility & agri" },
  { code: "AGRITECH", label: "Agritech", group: "Climate, mobility & agri" },

  { code: "MANUFACTURING_INDUSTRIAL", label: "Manufacturing & industrial", group: "Industrial, deeptech & hardware" },
  { code: "CONSTRUCTION_INFRA_TECH", label: "Construction & infra tech", group: "Industrial, deeptech & hardware" },
  { code: "IOT_SMART_HARDWARE", label: "IoT & smart hardware", group: "Industrial, deeptech & hardware" },
  { code: "SEMICONDUCTOR_ELECTRONICS", label: "Semiconductors & electronics", group: "Industrial, deeptech & hardware" },
  { code: "XR_IMMERSIVE", label: "XR & immersive", group: "Industrial, deeptech & hardware" },
  { code: "SPACETECH", label: "Spacetech", group: "Industrial, deeptech & hardware" },
  { code: "DEFENCE_AEROSPACE", label: "Defence & aerospace", group: "Industrial, deeptech & hardware" },
  { code: "SAFETY_FIRE_TECH", label: "Safety & fire tech", group: "Industrial, deeptech & hardware" },

  { code: "REAL_ESTATE_COWORKING_PROPTECH", label: "Real estate, coworking & proptech", group: "Real estate & logistics" },
  { code: "LOGISTICS_SUPPLY_CHAIN", label: "Logistics & supply chain", group: "Real estate & logistics" },
];

/** Stored in a thesis instead of codes to mean "any sector". */
export const ANY_SECTOR = "ANY";

/** The agents' stage ladder, earliest first. TRACTION sits between Seed and Pre-Series A. */
export const STAGES: { code: string; label: string }[] = [
  { code: "PRE_SEED", label: "Pre-seed" },
  { code: "SEED", label: "Seed" },
  { code: "TRACTION", label: "Post-seed traction" },
  { code: "PRE_SERIES_A", label: "Pre-Series A" },
  { code: "SERIES_A", label: "Series A" },
  { code: "SERIES_B", label: "Series B" },
  { code: "SERIES_C_PLUS", label: "Series C+" },
];

const BY_CODE = new Map(SECTORS.map((s) => [s.code, s]));
const STAGE_INDEX = new Map(STAGES.map((s, i) => [s.code, i]));

/** "FINTECH_SME_LENDING" → the same; " fintech_sme_lending " → "FINTECH_SME_LENDING". */
export function toCode(v: string | null | undefined): string {
  return (v ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
}

const groupCodes = (...groups: string[]) => SECTORS.filter((s) => groups.includes(s.group)).map((s) => s.code);

/** Older free-text values still on a few INVESTORS rows, mapped to codes. */
const LEGACY: Record<string, string[]> = {
  SAAS: ["SAAS_ENTERPRISE"],
  ENTERPRISE: ["SAAS_ENTERPRISE"],
  "AI/ML": ["AI_APPLIED_ENTERPRISE", "AI_FOUNDATIONAL"],
  AI: ["AI_APPLIED_ENTERPRISE", "AI_FOUNDATIONAL"],
  FINTECH: groupCodes("Fintech"),
  DEVELOPER_TOOLS: ["DATA_INFRA_DEVTOOLS"],
  TECHNOLOGY: groupCodes("SaaS, AI & data", "Fintech"),
};

/**
 * The sector codes a thesis value stands for: a code itself, a legacy word
 * expanded, ANY kept as ANY, anything else dropped.
 */
export function expandSector(v: string | null | undefined): string[] {
  const c = toCode(v);
  if (!c) return [];
  if (c === ANY_SECTOR || c === "AGNOSTIC") return [ANY_SECTOR];
  if (BY_CODE.has(c)) return [c];
  return LEGACY[c] ?? [];
}

export function isSectorCode(c: string): boolean {
  return BY_CODE.has(c);
}

export function isStageCode(c: string): boolean {
  return STAGE_INDEX.has(c);
}

export function sectorLabel(code: string): string {
  if (code === ANY_SECTOR) return "Any sector";
  return BY_CODE.get(code)?.label ?? humanise(code);
}

export function stageLabel(code: string): string {
  return STAGES.find((s) => s.code === code)?.label ?? humanise(code);
}

/** Every stage from min to max, inclusive. Either end missing means open on that side; both missing = []. */
export function stageRange(min: string | null | undefined, max: string | null | undefined): string[] {
  const lo = min ? STAGE_INDEX.get(toCode(min)) : undefined;
  const hi = max ? STAGE_INDEX.get(toCode(max)) : undefined;
  if (lo == null && hi == null) return [];
  const a = lo ?? 0;
  const b = hi ?? STAGES.length - 1;
  return STAGES.slice(Math.min(a, b), Math.max(a, b) + 1).map((s) => s.code);
}

/** "SOME_CODE" → "Some code", for codes added to the sheet after this list. */
function humanise(code: string): string {
  const t = code.toLowerCase().replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}
