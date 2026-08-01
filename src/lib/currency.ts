export function formatArs(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function parseArsInput(raw: string): number {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return 0;
  return Number(digits);
}

/** Display helper: `1500000` → `1.500.000` (es-AR thousands). */
export function formatArsInput(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
