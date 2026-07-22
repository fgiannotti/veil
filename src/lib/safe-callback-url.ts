/**
 * Allow only relative same-origin paths (open-redirect safe).
 */
export function safeCallbackUrl(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw) return fallback;
  const url = raw.trim();
  if (!url.startsWith("/")) return fallback;
  if (url.startsWith("//")) return fallback;
  if (url.includes("://")) return fallback;
  if (url.includes("\\")) return fallback;
  return url;
}
