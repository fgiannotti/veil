/**
 * Maps API error codes / English fallbacks to Spanish UI copy.
 */
const API_ERROR_ES: Record<string, string> = {
  invalid_email: "Email inválido",
  invalid_input: "Datos inválidos",
  invalid_domain: "Dominio inválido",
  unauthenticated: "Tenés que iniciar sesión",
  unauthorized: "No autorizado",
  forbidden: "Acceso denegado",
  internal: "Error interno. Probá de nuevo.",
  rate_limited: "Demasiados intentos. Probá de nuevo en un rato.",
  unknown_domain: "Ese dominio no está en nuestra lista de empresas verificadas",
  unknown_company: "Empresa desconocida",
  needs_verification: "Primero verificá tu email laboral",
  needs_salary_entry: "Cargá al menos un sueldo verificado para continuar",
  duplicate_entry: "Ya cargaste un sueldo para ese mes",
  salary_out_of_range: "Ese monto no es válido para esta posición",
  salary_too_low: "El monto es muy bajo para esta posición",
  salary_too_high: "El monto es muy alto para esta posición",
  no_indicators: "Indicadores económicos no disponibles",
  expired_or_missing: "No hay verificación activa, solicitá un nuevo código",
  too_many_attempts: "Demasiados intentos, solicitá un nuevo código",
  wrong_code: "Código incorrecto",
  personal_email: "Usá un email laboral, no uno personal (Gmail/Outlook/etc.)",
};

function looksLikeEnglishCode(value: string): boolean {
  if (API_ERROR_ES[value] !== undefined) return true;
  return /^[a-z][a-z0-9_]*$/i.test(value) && value.includes("_");
}

/** Prefer Spanish `message`; otherwise translate known `error` codes. */
export function apiErrorMessage(
  json: { message?: unknown; error?: unknown } | null | undefined,
  fallback = "Algo salió mal. Probá de nuevo.",
): string {
  const message = typeof json?.message === "string" ? json.message.trim() : "";
  if (message && !looksLikeEnglishCode(message)) return message;

  const code = typeof json?.error === "string" ? json.error.trim() : "";
  if (code && API_ERROR_ES[code]) return API_ERROR_ES[code];
  if (message && API_ERROR_ES[message]) return API_ERROR_ES[message];

  // Already-Spanish API errors sometimes live in `error` (e.g. signup).
  if (code && /[áéíóúñüÁÉÍÓÚÑÜ ]/.test(code)) return code;
  if (code && !looksLikeEnglishCode(code) && code.includes(" ")) return code;

  return fallback;
}
