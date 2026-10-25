import { describe, expect, it } from "vitest";
import { concealCouponCode, discountLabel, extractCode, extractDiscount, isExpired, isPlaceholderAd, offerTitle } from "./offers";

describe("concealCouponCode", () => {
  it("conceals every occurrence in titles and descriptions regardless of case", () => {
    for (const text of ["Up To $55 Off with code SAVEBIG", "Use savebig at checkout. SAVEBIG ends Sunday.", "SAVEBIG"]) {
      expect(concealCouponCode(text, "SAVEBIG").toLowerCase()).not.toContain("savebig");
    }
  });
  it("handles punctuation in an exact coupon value", () => {
    expect(concealCouponCode('Use code "SAVE+10" today', "SAVE+10")).not.toContain("SAVE+10");
  });
  it("keeps plain deals and unrelated words unchanged", () => {
    expect(concealCouponCode("Save 50% today", null)).toBe("Save 50% today");
    expect(concealCouponCode("Shipping to SAVE50VILLE", "SAVE50")).toBe("Shipping to SAVE50VILLE");
  });
});

describe("extractCode", () => {
  it("uses Impact's default promo code first", () => {
    expect(extractCode({ Name: "Special Xmas offer", DealDefaultPromoCode: "XMASDEAL" })).toBe("XMASDEAL");
  });
  it("finds a code mentioned in the text", () => {
    expect(extractCode({ Name: "Up To $55 Off with code SAVEBIG", Description: "" })).toBe("SAVEBIG");
  });
  it("treats a single code-like name as the code", () => {
    expect(extractCode({ Name: "SAVE50", Description: "Save an extra 50% off" })).toBe("SAVE50");
    expect(extractCode({ Name: "extra66off", Description: "2 years for $95.75" })).toBe("extra66off");
  });
  it("returns null for plain deals", () => {
    expect(extractCode({ Name: "Friday Special Offer 50% OFF", Description: "Use code at checkout" })).toBeNull();
    expect(extractCode({ Name: "Sale", Description: "" })).toBeNull();
  });
});

describe("extractDiscount + discountLabel", () => {
  it("reads structured percent", () => {
    const d = extractDiscount({ DiscountType: "PERCENT", DiscountPercent: "75" });
    expect(discountLabel(d)).toBe("75% off");
  });
  it("reads percent ranges as 'up to'", () => {
    const d = extractDiscount({ DiscountType: "PERCENT_RANGE", DiscountPercentRangeEnd: "40" });
    expect(discountLabel(d)).toBe("Up to 40% off");
  });
  it("reads fixed amounts", () => {
    const d = extractDiscount({ DiscountType: "FIXED", DiscountAmount: "10", DiscountCurrency: "USD" });
    expect(discountLabel(d)).toBe("$10 off");
  });
  it("falls back to the text", () => {
    expect(discountLabel(extractDiscount({ Name: "Up To $55 Off with code SAVEBIG" }))).toBe("Up to $55 off");
    expect(discountLabel(extractDiscount({ Name: "Friday Special Offer 50% OFF" }))).toBe("50% off");
  });
  it("labels free shipping deals", () => {
    expect(discountLabel({ ...extractDiscount({}), deal_type: "FREE_SHIPPING" })).toBe("Free shipping");
  });
});

describe("isExpired", () => {
  const now = new Date("2026-10-22T00:00:00Z");
  it("hides offers Impact marks expired", () => expect(isExpired("EXPIRED", null, now)).toBe(true));
  it("hides offers past their end date", () => expect(isExpired("ACTIVE", "2026-10-01T00:00:00Z", now)).toBe(true));
  it("keeps current offers", () => expect(isExpired("ACTIVE", "2027-01-01T00:00:00Z", now)).toBe(false));
  it("keeps offers with no end date", () => expect(isExpired("", "", now)).toBe(false));
});

describe("isPlaceholderAd", () => {
  it("skips Impact's default tracking link", () => expect(isPlaceholderAd({ Name: "Default tracking link" })).toBe(true));
  it("keeps real offers", () => expect(isPlaceholderAd({ Name: "SAVE50" })).toBe(false));
});

describe("offerTitle", () => {
  it("uses the description when the name is just the code", () => {
    expect(offerTitle({ Name: "FS15", Description: "15% off Sitewide Coupon at FitVille" }, "FS15").title).toBe("15% off Sitewide Coupon at FitVille");
  });
  it("keeps a real name and drops a duplicate description", () => {
    expect(offerTitle({ Name: "Spring sale", Description: "Spring sale" }, null)).toEqual({ title: "Spring sale", description: null });
  });
});
