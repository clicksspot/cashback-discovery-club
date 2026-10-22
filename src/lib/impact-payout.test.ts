import { describe, expect, it } from "vitest";
import { extractPayout } from "./impact.server";

describe("reading Impact commission rates", () => {
  it("reads the percent rate from a contract's sale payout", () => {
    const contract = { Terms: { EventPayouts: [{ EventCategory: "SALE", DefaultPayoutRate: "8" }] } };
    expect(extractPayout(contract)).toEqual({ type: "percent", rate: 8 });
  });

  it("uses the highest tier rate for 'up to' display", () => {
    const contract = {
      Terms: { EventPayouts: [{ DefaultPayoutRate: "3", PayoutGroups: [{ PayoutRate: "0" }, { PayoutRate: "12" }] }] },
    };
    expect(extractPayout(contract)).toEqual({ type: "percent", rate: 12 });
  });

  it("falls back to a flat amount when there is no percent", () => {
    const contract = { Terms: { EventPayouts: [{ EventCategory: "LEAD", DefaultPayout: "20.00" }] } };
    expect(extractPayout(contract)).toEqual({ type: "flat", rate: 20 });
  });

  it("ignores performance bonuses", () => {
    const contract = { Terms: { EventPayouts: [{ DefaultPayoutRate: "5", PerformanceBonus: { PayoutRate: "30" } }] } };
    expect(extractPayout(contract)).toEqual({ type: "percent", rate: 5 });
  });
});
