import { expect, test } from "@playwright/test";
import { clearMailHog, waitForVerificationCode } from "./helpers/mailhog";

test.describe.configure({ mode: "serial" });

test("signup → verify work email → publish salary", async ({ page }) => {
  await clearMailHog();

  const stamp = Date.now();
  const personalEmail = `e2e.${stamp}@example.com`;
  const workEmail = `e2e.${stamp}@globant.com`;
  const password = "test-password-e2e";
  const salaryArs = "1500000";

  await page.goto("/signup");
  await page.getByLabel("Email personal").fill(personalEmail);
  await page.getByLabel("Nombre visible (opcional)").fill("E2E");
  await page.getByLabel(/Contraseña/).fill(password);
  await page.getByRole("button", { name: "Registrarse" }).click();

  await expect(page).toHaveURL(/\/verify/);
  await expect(page.getByRole("heading", { name: /Verificá tu email laboral/i })).toBeVisible();

  await page.getByLabel("Email laboral").fill(workEmail);
  await page.getByRole("button", { name: "Enviar código" }).click();
  await expect(page.getByText(/Enviamos un código a/i)).toBeVisible();

  const code = await waitForVerificationCode(workEmail);
  await page.getByLabel("Código de 6 dígitos").fill(code);
  await page.getByRole("button", { name: "Verificar" }).click();

  await expect(page.getByText(/¡Verificado!/i)).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page.getByText(/Verificado en/i)).toBeVisible();
  await expect(page.getByText("@globant.com")).toBeVisible();

  await page.getByRole("link", { name: "Agregar sueldo" }).click();
  await expect(page).toHaveURL(/\/salaries\/new/);
  await expect(page.getByRole("heading", { name: /Registrar un sueldo/i })).toBeVisible();

  await page.getByLabel("Rol").selectOption("backend");
  await page.getByLabel("Seniority").selectOption("senior");
  await page.getByLabel(/Sueldo neto del mes/).fill(salaryArs);

  const [salaryRes] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/salaries") && r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Guardar" }).click(),
  ]);
  expect(salaryRes.ok(), `salaries POST ${salaryRes.status()}`).toBeTruthy();

  // Hard navigation avoids App Router soft-cache showing an empty dashboard.
  await page.goto("/dashboard");
  await expect(page.getByText("Sin entradas todavía.")).toHaveCount(0);
  const entry = page.locator("li").filter({ hasText: "Backend · Senior" });
  await expect(entry).toBeVisible();
  await expect(entry.getByText(/\$\s*1\.500\.000/).first()).toBeVisible();
});
