export const SENIORITIES = [
  "junior",
  "ssr",
  "senior",
  "staff",
  "principal",
  "lead",
] as const;

export type Seniority = (typeof SENIORITIES)[number];

const LABELS: Record<Seniority, string> = {
  junior: "Junior",
  ssr: "Semi-senior",
  senior: "Senior",
  staff: "Staff",
  principal: "Principal",
  lead: "Lead",
};

export function formatSeniority(value: Seniority | string): string {
  return LABELS[value as Seniority] ?? value;
}
