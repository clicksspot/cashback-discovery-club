export type OfferCountdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
  endingSoon: boolean;
};

/** Uses only the saved deadline; never invents a deadline for undated offers. */
export function getOfferCountdown(endsAt: string | null | undefined, now: number): OfferCountdown | null {
  if (!endsAt) return null;
  const end = Date.parse(endsAt);
  if (!Number.isFinite(end)) return null;
  const remaining = Math.max(0, Math.ceil((end - now) / 1000));
  return {
    days: Math.floor(remaining / 86400),
    hours: Math.floor((remaining % 86400) / 3600),
    minutes: Math.floor((remaining % 3600) / 60),
    seconds: remaining % 60,
    expired: end <= now,
    endingSoon: end > now && end - now <= 86400000,
  };
}