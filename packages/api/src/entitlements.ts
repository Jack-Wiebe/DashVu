import "server-only";

/**
 * Entitlements gate paid/feature-flagged behavior. Today every user resolves to
 * the free plan and is granted everything (no-op) — the shape exists so plan
 * gating becomes a one-line change once billing lands.
 */
export interface Entitlements {
  plan: string;
  has(feature: string): boolean;
  limit(metric: string): number;
}

export const FREE_ENTITLEMENTS: Entitlements = {
  plan: "free",
  has: () => true,
  limit: () => Number.POSITIVE_INFINITY,
};

export function resolveEntitlements(_userId: string | null): Entitlements {
  return FREE_ENTITLEMENTS;
}
