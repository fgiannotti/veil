import {
  pgSchema,
  text,
  timestamp,
  uuid,
  integer,
  bigint,
  doublePrecision,
  date,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

export const dataSchema = pgSchema("data");

/**
 * IMPORTANT: tables in the data schema MUST NOT have foreign keys into auth.*.
 * They are linked only by an opaque profile_id UUID stored at signup.
 */

export const companyBadges = dataSchema.table(
  "company_badges",
  {
    profileId: uuid("profile_id").notNull(),
    domain: text("domain").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).defaultNow().notNull(),
    currentCompany: text("current_company").default("true").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.profileId, t.domain] }),
    byProfile: index("company_badges_profile_idx").on(t.profileId),
  }),
);

export const salaryEntries = dataSchema.table(
  "salary_entries",
  {
    id: uuid("id").defaultRandom().notNull(),
    profileId: uuid("profile_id").notNull(),
    role: text("role").notNull(),
    seniority: text("seniority").notNull(),
    companyDomain: text("company_domain").notNull(),
    companySizeBucket: text("company_size_bucket").notNull(),
    netArs: bigint("net_ars", { mode: "number" }).notNull(),
    paymentMonth: date("payment_month").notNull(),
    source: text("source").default("user").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.id] }),
    cohortIdx: index("salary_cohort_idx").on(
      t.role,
      t.seniority,
      t.companySizeBucket,
      t.paymentMonth,
    ),
    profileIdx: index("salary_profile_idx").on(t.profileId, t.paymentMonth),
  }),
);

export const economicIndicators = dataSchema.table("economic_indicators", {
  date: date("date").primaryKey(),
  usdBlueBuy: doublePrecision("usd_blue_buy").notNull(),
  usdBlueSell: doublePrecision("usd_blue_sell").notNull(),
  ipcIndex: doublePrecision("ipc_index").notNull(),
  source: text("source").default("mixed").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Phase 1.1 stub - schema only, no routes/UI.
 */
export const grapevinePosts = dataSchema.table(
  "grapevine_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id").notNull(),
    companyDomain: text("company_domain").notNull(),
    body: text("body").notNull(),
    upvotes: integer("upvotes").default(0).notNull(),
    downvotes: integer("downvotes").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    byCompany: index("grapevine_company_idx").on(t.companyDomain, t.createdAt),
  }),
);
