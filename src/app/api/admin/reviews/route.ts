import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema/auth";
import { salaryEntries } from "@/server/db/schema/data";

async function isAdmin(profileId: string): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return false;
  const [row] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.profileId, profileId))
    .limit(1);
  return row?.email === adminEmail;
}

export async function GET() {
  const session = await auth();
  if (!session?.profileId || !(await isAdmin(session.profileId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const rows = await db
    .select()
    .from(salaryEntries)
    .where(eq(salaryEntries.status, "pending"))
    .orderBy(salaryEntries.createdAt);

  return NextResponse.json({ entries: rows });
}
