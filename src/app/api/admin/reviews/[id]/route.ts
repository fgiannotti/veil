import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
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

const Body = z.object({ action: z.enum(["approve", "reject"]) });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.profileId || !(await isAdmin(session.profileId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const newStatus = parsed.data.action === "approve" ? "published" : "rejected";

  const result = await db
    .update(salaryEntries)
    .set({ status: newStatus })
    .where(and(eq(salaryEntries.id, id), eq(salaryEntries.status, "pending")));

  return NextResponse.json({ ok: true, status: newStatus });
}
