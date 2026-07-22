export const MAX_TAGS_PER_ENTRY = 8;
export const MAX_TAG_LENGTH = 40;

/** Curated suggestions shown first in the salary form. */
export const SUGGESTED_BENEFIT_TAGS = [
  "Remoto",
  "Presencial",
  "Híbrido",
  "Sueldo en USD",
  "Contractor",
  "Relación de dependencia",
  "UPTO",
  "Equity / stock options",
  "Bono anual",
  "Prepaga",
  "Wellhub / gym",
  "Home office allowance",
  "Capacitaciones",
  "Vacaciones extras",
  "Día de cumpleaños off",
  "Horario flexible",
  "Guardería / parental",
  "Internet pago",
] as const;

export function slugifyTag(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_TAG_LENGTH);
}

export function normalizeTagLabel(raw: string): string | null {
  const label = raw.replace(/\s+/g, " ").trim();
  if (label.length < 2 || label.length > MAX_TAG_LENGTH) return null;
  if (!slugifyTag(label)) return null;
  return label;
}

/** Dedupe by slug, keep first label casing, cap count. */
export function normalizeTagList(raw: unknown): { slug: string; label: string }[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: { slug: string; label: string }[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const label = normalizeTagLabel(item);
    if (!label) continue;
    const slug = slugifyTag(label);
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push({ slug, label });
    if (out.length >= MAX_TAGS_PER_ENTRY) break;
  }
  return out;
}
