import { describe, expect, it } from "vitest";
import { apiErrorMessage } from "../src/lib/api-errors";

describe("apiErrorMessage", () => {
  it("prefers Spanish message", () => {
    expect(apiErrorMessage({ error: "invalid_email", message: "Dirección de email inválida" })).toBe(
      "Dirección de email inválida",
    );
  });

  it("translates English error codes", () => {
    expect(apiErrorMessage({ error: "invalid_email" })).toBe("Email inválido");
    expect(apiErrorMessage({ error: "invalid_input" })).toBe("Datos inválidos");
    expect(apiErrorMessage({ error: "unauthenticated" })).toBe("Tenés que iniciar sesión");
  });

  it("keeps Spanish error strings from signup", () => {
    expect(
      apiErrorMessage({ error: "No se pudo crear la cuenta. Si ya tenés una, iniciá sesión." }),
    ).toBe("No se pudo crear la cuenta. Si ya tenés una, iniciá sesión.");
  });
});
