import { pgSchema, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";

export const authSchema = pgSchema("auth");

export const users = authSchema.table("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  name: text("name"),
  image: text("image"),
  passwordHash: text("password_hash"),
  profileId: uuid("profile_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workEmailVerifications = authSchema.table("work_email_verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").notNull(),
  emailHash: text("email_hash").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
