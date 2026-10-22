export type Settings = {
  site_name: string;
  tagline: string;
  hero_title: string;
  hero_subtitle: string;
  default_cashback_percent: number;
  min_withdrawal: number;
  currency: string;
  payout_paypal: boolean;
  payout_bank: boolean;
  payout_jazzcash: boolean;
  payout_easypaisa: boolean;
  auto_sync_enabled: boolean;
  auto_publish_new_stores: boolean;
  auto_publish_new_offers: boolean;
  show_deals: boolean;
  actions_lookback_days: number;
  support_email: string;
  announcement: string;
};

export const DEFAULT_SETTINGS: Settings = {
  site_name: "CashLeaf",
  tagline: "Get paid every time you shop online",
  hero_title: "Shop your favourite stores. Get real cash back.",
  hero_subtitle:
    "Hundreds of top brands pay us when you shop through our links — we share that money with you.",
  default_cashback_percent: 50,
  min_withdrawal: 10,
  currency: "USD",
  payout_paypal: true,
  payout_bank: true,
  payout_jazzcash: true,
  payout_easypaisa: true,
  auto_sync_enabled: true,
  auto_publish_new_stores: true,
  auto_publish_new_offers: true,
  show_deals: true,
  actions_lookback_days: 30,
  support_email: "",
  announcement: "",
};

export function parseSettings(rows: { key: string; value: unknown }[] | null | undefined): Settings {
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const row of rows ?? []) {
    if (!(row.key in DEFAULT_SETTINGS)) continue;
    const def = (DEFAULT_SETTINGS as Record<string, unknown>)[row.key];
    const v = row.value;
    if (typeof def === "number") {
      const n = Number(v);
      out[row.key] = Number.isFinite(n) ? n : def;
    } else if (typeof def === "boolean") {
      out[row.key] = v === true || v === "true";
    } else {
      out[row.key] = v == null ? "" : String(v);
    }
  }
  return out as Settings;
}

export const PAYOUT_METHODS = [
  { id: "paypal", label: "PayPal", settingKey: "payout_paypal" },
  { id: "bank", label: "Bank transfer", settingKey: "payout_bank" },
  { id: "jazzcash", label: "JazzCash", settingKey: "payout_jazzcash" },
  { id: "easypaisa", label: "Easypaisa", settingKey: "payout_easypaisa" },
] as const;

export type PayoutMethodId = (typeof PAYOUT_METHODS)[number]["id"];

export function payoutLabel(id: string) {
  return PAYOUT_METHODS.find((m) => m.id === id)?.label ?? id;
}
