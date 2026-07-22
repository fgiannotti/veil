import { createHash, randomInt, createHmac } from "node:crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { workEmailVerifications } from "@/server/db/schema/auth";
import { companyBadges } from "@/server/db/schema/data";
import { extractDomain, isPersonalDomain, isKnownDomain } from "@/server/companies/domains";
import { sendVerificationCode } from "@/server/mail";
import { getEnv } from "@/server/env";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashEmail(email: string): string {
  return createHmac("sha256", getEnv().authSecret).update(email.toLowerCase().trim()).digest("hex");
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export class VerificationError extends Error {
  constructor(public code: string, msg: string) {
    super(msg);
  }
}

export async function startVerification(profileId: string, workEmail: string): Promise<void> {
  const email = workEmail.toLowerCase().trim();
  const domain = extractDomain(email);
  if (!domain) {
    throw new VerificationError("invalid_email", "Dirección de email inválida");
  }
  if (isPersonalDomain(domain)) {
    throw new VerificationError(
      "personal_email",
      "Usá un email laboral, no uno personal (Gmail/Outlook/etc.)",
    );
  }
  if (!isKnownDomain(domain)) {
    throw new VerificationError(
      "unknown_domain",
      `El dominio @${domain} no está en nuestra lista de empresas verificadas.`,
    );
  }

  const code = generateCode();
  const codeHash = hashCode(code);
  const emailHash = hashEmail(email);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  // Invalidate prior in-flight codes for this (profile, emailHash) by deleting them.
  await db
    .delete(workEmailVerifications)
    .where(
      and(
        eq(workEmailVerifications.profileId, profileId),
        eq(workEmailVerifications.emailHash, emailHash),
      ),
    );

  await db.insert(workEmailVerifications).values({
    profileId,
    emailHash,
    codeHash,
    expiresAt,
  });

  // Send the code. The raw email is NEVER stored.
  await sendVerificationCode(email, code);
}

interface ConfirmResult {
  domain: string;
}

export async function confirmVerification(
  profileId: string,
  workEmail: string,
  code: string,
): Promise<ConfirmResult> {
  const email = workEmail.toLowerCase().trim();
  const domain = extractDomain(email);
  if (!domain || isPersonalDomain(domain)) {
    throw new VerificationError("invalid_email", "Email laboral inválido");
  }
  if (!isKnownDomain(domain)) {
    throw new VerificationError(
      "unknown_domain",
      `El dominio @${domain} no está en nuestra lista de empresas verificadas.`,
    );
  }

  const emailHash = hashEmail(email);
  const codeHash = hashCode(code);
  const now = new Date();

  const rows = await db
    .select()
    .from(workEmailVerifications)
    .where(
      and(
        eq(workEmailVerifications.profileId, profileId),
        eq(workEmailVerifications.emailHash, emailHash),
        gte(workEmailVerifications.expiresAt, now),
      ),
    );

  if (rows.length === 0) {
    throw new VerificationError("expired_or_missing", "No hay verificación activa, solicitá un nuevo código");
  }

  const row = rows[0];
  if (row.attempts >= MAX_ATTEMPTS) {
    throw new VerificationError("too_many_attempts", "Demasiados intentos, solicitá un nuevo código");
  }

  if (row.codeHash !== codeHash) {
    await db
      .update(workEmailVerifications)
      .set({ attempts: row.attempts + 1 })
      .where(eq(workEmailVerifications.id, row.id));
    throw new VerificationError("wrong_code", "Código incorrecto");
  }

  // Success - consume the verification record (raw email never persisted).
  await db.delete(workEmailVerifications).where(eq(workEmailVerifications.id, row.id));

  // Mark prior badges for this profile as not current, then upsert the new one as current.
  await db
    .update(companyBadges)
    .set({ currentCompany: "false" })
    .where(eq(companyBadges.profileId, profileId));

  await db
    .insert(companyBadges)
    .values({
      profileId,
      domain,
      currentCompany: "true",
    })
    .onConflictDoUpdate({
      target: [companyBadges.profileId, companyBadges.domain],
      set: {
        verifiedAt: sql`now()`,
        currentCompany: "true",
      },
    });

  return { domain };
}

export async function getCurrentCompany(profileId: string): Promise<string | null> {
  const [row] = await db
    .select({ domain: companyBadges.domain })
    .from(companyBadges)
    .where(
      and(
        eq(companyBadges.profileId, profileId),
        eq(companyBadges.currentCompany, "true"),
      ),
    )
    .limit(1);
  return row?.domain ?? null;
}
