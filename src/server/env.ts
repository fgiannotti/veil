import { z } from "zod";

const isProd = process.env.NODE_ENV === "production";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(1).optional(),
  AUTH_URL: z.string().url().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  INDICATORS_REFRESH_TOKEN: z.string().optional(),
  ADMIN_EMAIL: z.string().email().optional().or(z.literal("")),
  USD_BLUE_API_URL: z.string().url().optional(),
});

export type AppEnv = {
  isProd: boolean;
  databaseUrl: string;
  authSecret: string;
  authUrl: string | undefined;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string | undefined;
  smtpPass: string | undefined;
  smtpFrom: string;
  smtpSecure: string | undefined;
  indicatorsRefreshToken: string | undefined;
  adminEmail: string | undefined;
  usdBlueApiUrl: string;
  googleId: string | undefined;
  googleSecret: string | undefined;
};

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;

  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${detail}`);
  }

  const v = parsed.data;

  cached = {
    isProd,
    databaseUrl: v.DATABASE_URL ?? "postgres://bench:bench@localhost:5432/bench",
    authSecret: v.AUTH_SECRET ?? "dev-secret",
    authUrl: v.AUTH_URL,
    smtpHost: v.SMTP_HOST ?? "localhost",
    smtpPort: Number(v.SMTP_PORT ?? 1025),
    smtpUser: v.SMTP_USER || undefined,
    smtpPass: v.SMTP_PASS || undefined,
    smtpFrom: v.SMTP_FROM ?? "Bench <no-reply@bench.com.ar>",
    smtpSecure: v.SMTP_SECURE,
    indicatorsRefreshToken: v.INDICATORS_REFRESH_TOKEN,
    adminEmail: v.ADMIN_EMAIL || undefined,
    usdBlueApiUrl: v.USD_BLUE_API_URL ?? "https://api.bluelytics.com.ar/v2/latest",
    googleId: v.AUTH_GOOGLE_ID?.trim() || undefined,
    googleSecret: v.AUTH_GOOGLE_SECRET?.trim() || undefined,
  };

  return cached;
}

/** Call at real server boot (`next start`), not during `next build`. */
export function assertProdEnv(): void {
  if (!isProd) return;
  if (process.argv.includes("build")) return;
  // Playwright CI boots `next start` against local Postgres + MailHog.
  if (process.env.BENCH_E2E === "1") return;

  const env = getEnv();
  const problems: string[] = [];

  if (!process.env.DATABASE_URL) problems.push("DATABASE_URL is required");
  if (
    !process.env.AUTH_SECRET ||
    process.env.AUTH_SECRET === "change-me-to-a-long-random-string" ||
    process.env.AUTH_SECRET === "dev-secret" ||
    env.authSecret.length < 16
  ) {
    problems.push("AUTH_SECRET must be a strong secret (≥16 chars)");
  }
  if (!env.authUrl?.startsWith("https://")) {
    problems.push("AUTH_URL must be an https:// public origin");
  }
  if (!env.smtpHost || env.smtpHost === "localhost" || env.smtpHost === "127.0.0.1") {
    problems.push("SMTP_HOST must be a real SMTP host (not localhost)");
  }
  if (!process.env.SMTP_FROM) problems.push("SMTP_FROM is required");
  if (
    !env.indicatorsRefreshToken ||
    env.indicatorsRefreshToken === "change-me-cron-token"
  ) {
    problems.push("INDICATORS_REFRESH_TOKEN must be set");
  }

  if (problems.length > 0) {
    throw new Error(`Invalid production environment:\n- ${problems.join("\n- ")}`);
  }
}
