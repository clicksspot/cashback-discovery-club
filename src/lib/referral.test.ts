import { describe, expect, it } from "vitest";
import { isBoosted, normalizeRefCode, referralLink } from "./referral";

describe("referral codes", () => {
  it("accepts and lowercases valid codes", () => {
    expect(normalizeRefCode(" AB12CD34 ")).toBe("ab12cd34");
  });
  it("rejects malformed codes", () => {
    expect(normalizeRefCode("x")).toBeNull();
    expect(normalizeRefCode("bad code!")).toBeNull();
    expect(normalizeRefCode(42)).toBeNull();
  });
  it("builds a signup link carrying the code", () => {
    expect(referralLink("https://site.com/", "ab12cd34")).toBe("https://site.com/auth?mode=signup&ref=ab12cd34");
  });
});

describe("boosted rates", () => {
  it("is boosted only when the current rate is higher than before", () => {
    expect(isBoosted(3, 5)).toBe(true);
    expect(isBoosted(5, 5)).toBe(false);
    expect(isBoosted(null, 5)).toBe(false);
  });
});
