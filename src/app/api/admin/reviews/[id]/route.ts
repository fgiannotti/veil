import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/server/auth";
import { db } from "@/server/db/client";
import { salaryEntries } from "@/server/db/schema/data";
import { isAdmin } from "@/server/admin";

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

  await db
    .update(salaryEntries)
    .set({ status: newStatus })
    .where(and(eq(salaryEntries.id, id), eq(salaryEntries.status, "pending")));

  return NextResponse.json({ ok: true, status: newStatus });
}
