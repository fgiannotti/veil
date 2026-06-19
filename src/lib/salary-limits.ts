import type { Seniority } from "@/lib/seniority";

// Limits in ARS. Approximate USD at ~1200 ARS/USD (update periodically).
// junior: $100–$3500/mo | ssr: $300–$6000 | senior: $500–$10000 | staff+: $800–$15000
export const SALARY_LIMITS: Record<Seniority, { min: number; max: number }> = {
  junior:    { min: 120_000,    max: 4_200_000 },
  ssr:       { min: 360_000,    max: 7_200_000 },
  senior:    { min: 600_000,    max: 12_000_000 },
  staff:     { min: 960_000,    max: 18_000_000 },
  principal: { min: 1_200_000,  max: 22_000_000 },
  lead:      { min: 960_000,    max: 18_000_000 },
};
