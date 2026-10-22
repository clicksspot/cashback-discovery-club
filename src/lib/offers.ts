// Pure rules for coupons & deals imported from Impact. Client-safe; tested in offers.test.ts.

type AdLike = Record<string, unknown>;

const s = (v: unknown) => (v == null ? "" : String(v).trim());
const n = (v: unknown) => {
  const x = parseFloat(s(v));
  return Number.isFinite(x) && x > 0 ? x : null;
};

const CODE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9_-]{2,24}$/;

function looksLikeCode(token: string, strict: boolean) {
  if (!CODE_TOKEN.test(token)) return false;
  const hasDigit = /\d/.test(token);
  const allCaps = token === token.toUpperCase() && /[A-Z]/.test(token);
  return strict ? hasDigit || (allCaps && token.length >= 4) : hasDigit || allCaps;
}

/** Finds the promo code for an Impact ad, or null when it's a plain deal. */
export function extractCode(ad: AdLike): string | null {
  const direct = s(ad["DealDefaultPromoCode"]) || s(ad["Code"]);
  if (direct) return direct;
  const text = `${s(ad["Name"])} ${s(ad["Description"])}`;
  const m = text.match(/\b(?:promo\s*code|coupon\s*code|code|coupon)\s*[:\-]?\s*["“'‘]?([A-Za-z0-9][A-Za-z0-9_-]{2,24})/i);
  if (m && looksLikeCode(m[1]!, false)) return m[1]!;
  const name = s(ad["Name"]);
  if (!name.includes(" ") && looksLikeCode(name, true)) return name;
  return null;
}

export type OfferDiscount = {
  discount_type: string | null;
  discount_percent: number | null;
  discount_amount: number | null;
  discount_currency: string | null;
};

/** Reads the discount from Impact's structured fields, falling back to "50% off" / "$10 off" in the text. */
export function extractDiscount(ad: AdLike): OfferDiscount {
  const type = s(ad["DiscountType"]).toUpperCase();
  const currency = s(ad["DiscountCurrency"]) || null;
  if (type === "PERCENT" && n(ad["DiscountPercent"]))
    return { discount_type: "percent", discount_percent: n(ad["DiscountPercent"]), discount_amount: null, discount_currency: null };
  if (type === "PERCENT_RANGE" && n(ad["DiscountPercentRangeEnd"]))
    return { discount_type: "up_to_percent", discount_percent: n(ad["DiscountPercentRangeEnd"]), discount_amount: null, discount_currency: null };
  if (type === "PERCENT_MAXIMUM" && n(ad["DiscountMaximumPercent"]))
    return { discount_type: "up_to_percent", discount_percent: n(ad["DiscountMaximumPercent"]), discount_amount: null, discount_currency: null };
  if (type === "FIXED" && n(ad["DiscountAmount"]))
    return { discount_type: "amount", discount_percent: null, discount_amount: n(ad["DiscountAmount"]), discount_currency: currency };

  const text = `${s(ad["Name"])} ${s(ad["Description"])}`;
  const pct = text.match(/(up to\s+)?(\d{1,2}(?:\.\d+)?)\s?%\s*off/i);
  if (pct) {
    return { discount_type: pct[1] ? "up_to_percent" : "percent", discount_percent: Number(pct[2]), discount_amount: null, discount_currency: null };
  }
  const amt = text.match(/(up to\s+)?\$\s?(\d+(?:\.\d{1,2})?)\s*off/i);
  if (amt) {
    return { discount_type: amt[1] ? "up_to_amount" : "amount", discount_percent: null, discount_amount: Number(amt[2]), discount_currency: "USD" };
  }
  return { discount_type: null, discount_percent: null, discount_amount: null, discount_currency: null };
}

export type OfferLabelInput = OfferDiscount & { deal_type?: string | null };

function fmtAmount(amount: number, currency: string | null) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `$${amount}`;
  }
}

/** Short badge text such as "75% off", "Up to 40% off", "$10 off", "Free shipping"; null when unknown. */
export function discountLabel(o: OfferLabelInput): string | null {
  const pct = o.discount_percent != null ? Number(o.discount_percent) : null;
  const amt = o.discount_amount != null ? Number(o.discount_amount) : null;
  if (pct && (o.discount_type === "percent" || o.discount_type === "up_to_percent"))
    return `${o.discount_type === "up_to_percent" ? "Up to " : ""}${pct}% off`;
  if (amt && (o.discount_type === "amount" || o.discount_type === "up_to_amount"))
    return `${o.discount_type === "up_to_amount" ? "Up to " : ""}${fmtAmount(amt, o.discount_currency)} off`;
  const deal = (o.deal_type ?? "").toUpperCase();
  if (deal === "FREE_SHIPPING") return "Free shipping";
  if (deal === "BOGO") return "Buy 1 get 1";
  if (deal === "GIFT_WITH_PURCHASE") return "Free gift";
  return null;
}

/** True when an offer should no longer be shown (marked expired by Impact or past its end date). */
export function isExpired(state: string | null | undefined, endsAt: string | null | undefined, now = new Date()): boolean {
  const st = (state ?? "").toUpperCase();
  if (st === "EXPIRED" || st === "INACTIVE" || st === "DELETED") return true;
  if (endsAt) {
    const t = Date.parse(endsAt);
    if (Number.isFinite(t) && t < now.getTime()) return true;
  }
  return false;
}

/** Impact placeholder ads that aren't real offers. */
export function isPlaceholderAd(ad: AdLike): boolean {
  const name = s(ad["Name"]).toLowerCase();
  return !name || name === "default tracking link" || name === "homepage" || name === "home page";
}

/** Shopper-facing title. Impact often puts the bare code in the name, so prefer the description then. */
export function offerTitle(ad: AdLike, code: string | null): { title: string; description: string | null } {
  const name = s(ad["Name"]);
  const desc = s(ad["Description"]).replace(/\s+/g, " ");
  if (code && name.toLowerCase() === code.toLowerCase()) {
    if (desc) return { title: desc.length > 140 ? desc.slice(0, 137) + "…" : desc, description: desc.length > 140 ? desc : null };
    const label = discountLabel({ ...extractDiscount(ad), deal_type: s(ad["DealType"]) });
    return { title: label ? `${label} with this code` : "Exclusive promo code", description: null };
  }
  return { title: name.slice(0, 200), description: desc && desc.toLowerCase() !== name.toLowerCase() ? desc : null };
}
