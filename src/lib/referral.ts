const REF_KEY = "cashleaf_ref";

/** Referral codes are 6–12 lowercase letters/digits; anything else is ignored. */
export function normalizeRefCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const c = input.trim().toLowerCase();
  return /^[a-z0-9]{6,12}$/.test(c) ? c : null;
}

export function referralLink(origin: string, code: string): string {
  return `${origin.replace(/\/$/, "")}/auth?mode=signup&ref=${encodeURIComponent(code)}`;
}

/** A store is "boosted" when its current shopper rate beats the previous one. */
export function isBoosted(previous: number | null | undefined, current: number | null | undefined): boolean {
  return previous != null && current != null && current > previous;
}

export function rememberRef(code: string | null) {
  if (code && typeof window !== "undefined") window.localStorage.setItem(REF_KEY, code);
}
export function takeRememberedRef(): string | null {
  if (typeof window === "undefined") return null;
  const c = normalizeRefCode(window.localStorage.getItem(REF_KEY));
  window.localStorage.removeItem(REF_KEY);
  return c;
}
export function peekRememberedRef(): string | null {
  if (typeof window === "undefined") return null;
  return normalizeRefCode(window.localStorage.getItem(REF_KEY));
}
