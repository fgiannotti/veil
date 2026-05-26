import { z } from "zod";
import { resolveCompanyQuery } from "@/server/companies/domains";
import { ROLES } from "@/lib/roles";

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
  role: Role,
  seniority: Seniority,
  netArs: z.number().int().positive().max(1_000_000_000_000),
  paymentMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Expected YYYY-MM")
    .transform((s) => `${s}-01`),
});

export type SalaryEntryInput = z.infer<typeof SalaryEntryInput>;

export const CalculatorInput = z.object({
  netArs: z.number().int().positive().max(1_000_000_000_000),
  paymentMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .transform((s) => `${s}-01`),
});

export const BenchmarkQuery = z.object({
  role: Role,
  seniority: Seniority,
  companySizeBucket: z.enum(["1-50", "50-200", "200-1000", "1000-5000", "5000+"]).optional(),
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
