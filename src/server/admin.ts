import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema/auth";
import { getEnv } from "@/server/env";

export async function isAdmin(profileId: string): Promise<boolean> {
  const adminEmail = getEnv().adminEmail;
  if (!adminEmail) return false;
  const [row] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.profileId, profileId))
    .limit(1);
  return row?.email?.toLowerCase() === adminEmail.toLowerCase();
}
