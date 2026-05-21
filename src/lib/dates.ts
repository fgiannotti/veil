/**
 * "YYYY-MM-01" - the canonical first-of-month string used in the salary table.
 */
export function firstOfMonth(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function todayFirstOfMonth(): string {
  return firstOfMonth(new Date());
}

export function monthLabel(s: string): string {
  return new Date(s + "T00:00:00Z").toLocaleDateString("es-AR", {
    year: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
