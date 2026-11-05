// Reads the Sidana team's "Startup Profiles" spreadsheet and turns each row into
// Complete Profile answers. A blank cell stays blank, so the founder answers that
// question themselves.

export { readXlsxRows } from "../../src/server/validators/xlsx-reader.mjs";

/** Spreadsheet heading -> Complete Profile answer key. */
export const COLUMNS = {
  "One-line Pitch": "one_liner",
  "What the Company Does": "description",
  "Website": "website",
  "Sector": "sector",
  "Sub-sector / Niche": "subsector",
  "Business Model": "business_model",
  "Markets You Sell In": "markets",
  "Headquarters City": "hq_city",
  "Year Founded": "founded_year",
  "Founder Names & Roles": "founders",
  "Lead Founder LinkedIn": "founder_linkedin",
  "Woman Co-founder?": "women_led",
  "Full-time Team Size": "team_size",
};

// The sheet writes sectors like "HRTech | AI Hiring OS"; the form only accepts its own list.
const SECTOR_RULES = [
  [/fintech|insurtech|lending|nbfc|payments|wealth/, "Fintech"],
  [/healthtech|health|medtech|diagnostic|clinic|pharma/, "HealthTech"],
  [/edtech|learning|education/, "EdTech"],
  [/hrtech|hiring|talent|workforce|recruit/, "HRTech"],
  [/foodtech|f&b|food/, "FoodTech"],
  [/agritech|agri/, "Agritech"],
  [/logistics|supply chain|freight|3pl/, "Logistics / Supply chain"],
  [/proptech|coworking|real estate/, "PropTech / Real estate"],
  [/mobility|\bev\b|electric vehicle/, "Mobility / EV"],
  [/climate|energy|water|cleantech/, "Climate / Energy"],
  [/deeptech|hardware|iot|robot/, "DeepTech / Hardware"],
  [/space|aero|drone/, "SpaceTech / Aerospace"],
  [/media|creator|content/, "Media / Creator economy"],
  [/saas/, "B2B SaaS"],
  [/\bai\b/, "AI / Applied AI"],
  [/consumer|fmcg|beauty|jewellery|beverage|d2c|retail|fashion|lifestyle|pet|recommerce|marketplace|hyperlocal/, "Consumer / D2C"],
];

/**
 * The form's sector for the sheet's text, matched on the part before "|" first. Null when
 * nothing fits, so the question stays empty for the founder to pick.
 */
export function mapSector(text) {
  const s = String(text ?? "").trim();
  if (!s) return null;
  const lead = s.split("|")[0].toLowerCase();
  for (const scope of [lead, s.toLowerCase()]) {
    for (const [pattern, option] of SECTOR_RULES) if (pattern.test(scope)) return option;
  }
  return null;
}

/** One spreadsheet row -> { name, answers }. Blank or unusable cells are left out. */
export function rowToAnswers(header, row) {
  const at = (h) => String(row[header.indexOf(h)] ?? "").trim();
  const answers = {};
  for (const [heading, key] of Object.entries(COLUMNS)) {
    const value = at(heading);
    if (!value) continue;
    if (key === "sector") {
      const option = mapSector(value);
      if (option) answers.sector = option;
    } else if (key === "markets") {
      const list = value.split(/[,;/|]/).map((x) => x.trim()).filter(Boolean);
      if (list.length) answers.markets = list;
    } else if (key === "women_led") {
      const yn = /^(y|yes|true)$/i.test(value) ? "Yes" : /^(n|no|false)$/i.test(value) ? "No" : null;
      if (yn) answers.women_led = yn;
    } else if (key === "founded_year" || key === "team_size") {
      const n = Number(value.replace(/,/g, ""));
      if (Number.isFinite(n) && n >= 0) answers[key] = String(Math.round(n));
    } else {
      answers[key] = value;
    }
  }
  return { name: at("Company Name"), answers };
}
