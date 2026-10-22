import { describe, expect, it } from "vitest";
import {
  buildTrackingUrl,
  computeCashback,
  displayRate,
  effectiveShare,
  formatRate,
} from "./cashback";

const base = { commission_type: "percent", commission_rate: 8, cashback_share: null, display_rate_override: null };

describe("cashback rules", () => {
  it("gives the shopper 50% of a $10 commission by default", () => {
    expect(computeCashback(10, effectiveShare(null, 50))).toBe(5);
  });

  it("uses a store's own share instead of the site default", () => {
    expect(effectiveShare({ cashback_share: 70 }, 50)).toBe(70);
  });

  it("rounds cashback down to the cent", () => {
    expect(computeCashback(3.33, 50)).toBe(1.66);
  });

  it("pays nothing for zero or reversed (negative) commissions", () => {
    expect(computeCashback(0, 50)).toBe(0);
    expect(computeCashback(-4, 50)).toBe(0);
  });

  it("shows half of an 8% commission as a 4% cashback rate", () => {
    expect(displayRate(base, 50)).toBe(4);
    expect(formatRate(base, 50)).toBe("4%");
  });

  it("lets the admin override the displayed rate", () => {
    expect(displayRate({ ...base, display_rate_override: 6 }, 50)).toBe(6);
  });

  it("shows flat-fee stores as a money amount", () => {
    expect(formatRate({ ...base, commission_type: "flat", commission_rate: 5 }, 50)).toBe("$2.50");
  });

  it("sends the click id to Impact as subId1", () => {
    const url = buildTrackingUrl("https://brand.sjv.io/c/1/2/3?u=https%3A%2F%2Fx.com", "abc-123");
    const parsed = new URL(url);
    expect(parsed.searchParams.get("subId1")).toBe("abc-123");
    expect(parsed.searchParams.get("u")).toBe("https://x.com");
  });
});
