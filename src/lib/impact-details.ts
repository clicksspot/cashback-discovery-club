export type ImpactDetails = {
  description?: string;
  advertiser_url?: string;
  campaign_url?: string;
  shipping_regions?: string[];
};

export function safeWebsite(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function readImpactDetails(value: unknown): ImpactDetails {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return {
    ...(typeof record["description"] === "string" && record["description"].trim() ? { description: record["description"].trim() } : {}),
    ...(safeWebsite(record["advertiser_url"]) ? { advertiser_url: safeWebsite(record["advertiser_url"]) ?? undefined } : {}),
    ...(safeWebsite(record["campaign_url"]) ? { campaign_url: safeWebsite(record["campaign_url"]) ?? undefined } : {}),
    ...(Array.isArray(record["shipping_regions"]) ? { shipping_regions: [...new Set(record["shipping_regions"].filter((r): r is string => typeof r === "string" && !!r.trim()).map((r) => r.trim().toUpperCase()))] } : {}),
  };
}

export function extractImpactDetails(campaign: Record<string, unknown>): ImpactDetails {
  return readImpactDetails({
    description: campaign["CampaignDescription"],
    advertiser_url: campaign["AdvertiserUrl"],
    campaign_url: campaign["CampaignUrl"],
    shipping_regions: campaign["ShippingRegions"],
  });
}

export function countryLabel(region: string): string {
  const normalized = region.replace(/[^a-z]/gi, "").toUpperCase();
  const aliases: Record<string, string> = { UK: "GB", USA: "US", SOUTHAFRICA: "ZA", SOUTHKOREA: "KR", NORTHKOREA: "KP", RUSSIA: "RU", VIETNAM: "VN", CZECHREPUBLIC: "CZ", UAE: "AE" };
  const display = new Intl.DisplayNames(["en"], { type: "region" });
  const code = aliases[normalized] ?? normalized;
  if (/^[A-Z]{2}$/.test(code)) return display.of(code) ?? region;
  // Impact also sends full country names without spaces (UNITEDSTATES, NEWZEALAND, etc.).
  for (const iso of "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ")) {
    const name = display.of(iso);
    if (name?.replace(/[^a-z]/gi, "").toUpperCase() === normalized) return name;
  }
  return region.replace(/_/g, " ");
}