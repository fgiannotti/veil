/** Query keys used to carry calculator → signup → verify → salary prefill. */
export const ONBOARDING_NET_ARS = "netArs";
export const ONBOARDING_MONTH = "month";

const MIN_PAYMENT_MONTH = "2023-01";

export type OnboardingPrefill = {
  netArs: string | null;
  month: string | null;
};

export function readOnboardingPrefill(
  params: URLSearchParams | { get(name: string): string | null },
): OnboardingPrefill {
  const netArs = params.get(ONBOARDING_NET_ARS)?.trim() || null;
  let month = params.get(ONBOARDING_MONTH)?.trim() || null;
  if (month && !/^\d{4}-\d{2}$/.test(month)) month = null;
  if (month && month < MIN_PAYMENT_MONTH) month = null;
  return { netArs, month };
}

/** Preserve netArs/month on a path (e.g. /verify, /salaries/new). */
export function withOnboardingPrefill(
  path: string,
  prefill: OnboardingPrefill,
  extra?: Record<string, string | null | undefined>,
): string {
  const q = new URLSearchParams();
  if (prefill.netArs) q.set(ONBOARDING_NET_ARS, prefill.netArs);
  if (prefill.month) q.set(ONBOARDING_MONTH, prefill.month);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v) q.set(k, v);
    }
  }
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}

export function hasOnboardingPrefill(prefill: OnboardingPrefill): boolean {
  return Boolean(prefill.netArs || prefill.month);
}
