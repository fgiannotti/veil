import { z } from "zod";
import { resolveCompanyQuery } from "@/server/companies/domains";
import { ROLES } from "@/lib/roles";
import { normalizeTagList } from "@/lib/benefit-tags";

const MIN_PAYMENT_MONTH = "2023-01";

function paymentMonthSchema(futureMessage: string) {
  return z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Expected YYYY-MM")
    .refine((s) => s >= MIN_PAYMENT_MONTH, "El mes mínimo es enero 2023")
    .refine((s) => {
      const d = new Date();
      const current = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return s <= current;
    }, futureMessage)
    .transform((s) => `${s}-01`);
}

export const Seniority = z.enum(["junior", "ssr", "senior", "staff", "principal", "lead"]);
export type Seniority = z.infer<typeof Seniority>;

export const RoleCategory = z.enum(ROLES);
export type RoleCategory = z.infer<typeof RoleCategory>;

export const Role = z
  .string()
  .min(2)
  .max(80)
  .transform((s) => s.trim().toLowerCase());

export const SalaryEntryInput = z.object({
  role: RoleCategory,
  seniority: Seniority,
  netArs: z.number().int().positive().max(100_000_000),
  paymentMonth: paymentMonthSchema("No se puede cargar un sueldo de un mes futuro"),
  tags: z
    .array(z.string())
    .max(8)
    .optional()
    .transform((raw) => normalizeTagList(raw ?? []).map((t) => t.label)),
});

export type SalaryEntryInput = z.infer<typeof SalaryEntryInput>;

export const CalculatorInput = z.object({
  netArs: z.number().int().positive().max(1_000_000_000_000),
  paymentMonth: paymentMonthSchema("No se puede calcular para un mes futuro"),
});

export const BenchmarkQuery = z.object({
  role: RoleCategory,
  seniority: Seniority.optional(),
  companySizeBucket: z.enum(["auto", "1-50", "50-200", "200-1000", "1000-5000", "5000+"]).optional(),
  companyDomain: z
    .string()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i)
    .transform((s) => s.toLowerCase())
    .optional(),
});

export const CompanySalariesQuery = z
  .object({
    company: z.string().min(2).max(120),
    role: RoleCategory.optional(),
    seniority: Seniority.optional(),
  })
  .transform((data) => {
    const domain = resolveCompanyQuery(data.company);
    if (!domain) {
      throw new z.ZodError([
        {
          code: "custom",
          path: ["company"],
          message: "Unknown company — try the full name or email domain",
        },
      ]);
    }
    return {
      domain,
      role: data.role,
      seniority: data.seniority,
    };
  });
