import { describe, expect, it } from "vitest";
import { getOfferCountdown } from "./offer-countdown";

describe("offer deadlines", () => {
  const now = Date.parse("2026-10-26T10:00:00Z");
  it("counts down the actual end time in days, hours, minutes and seconds", () => {
    expect(getOfferCountdown("2026-10-28T13:04:05Z", now)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5, expired: false, endingSoon: false });
  });
  it("does not invent a timer for absent or invalid end dates", () => {
    for (const value of [null, undefined, "", "invalid"]) expect(getOfferCountdown(value, now)).toBeNull();
  });
  it("expires exactly at the deadline without negative values", () => {
    for (const end of ["2026-10-26T10:00:00Z", "2026-10-25T10:00:00Z"]) {
      expect(getOfferCountdown(end, now)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true, endingSoon: false });
    }
  });
  it("respects timezone offsets", () => {
    expect(getOfferCountdown("2026-10-26T16:00:00+05:00", now)?.hours).toBe(1);
  });
  it("updates as time passes and highlights the final day", () => {
    const end = "2026-10-27T10:00:01Z";
    expect(getOfferCountdown(end, now)?.endingSoon).toBe(false);
    expect(getOfferCountdown(end, now + 1000)?.endingSoon).toBe(true);
    expect(getOfferCountdown(end, now + 2000)?.seconds).toBe(59);
  });
});