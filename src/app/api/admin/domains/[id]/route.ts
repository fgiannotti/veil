import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/server/auth";
import { db } from "@/server/db/client";
import { companies, domainRequests } from "@/server/db/schema/data";
import { isAdmin } from "@/server/admin";
import { SIZE_BUCKETS, type SizeBucket } from "@/server/companies/domains";

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    name: z.string().trim().min(2).max(120),
    sizeBucket: z.enum(SIZE_BUCKETS as [SizeBucket, ...SizeBucket[]]),
  }),
  z.object({
    action: z.literal("reject"),
  }),
]);

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.profileId || !(await isAdmin(session.profileId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: "Datos inválidos" },
      { status: 400 },
    );
  }

  const [row] = await db
    .select()
    .from(domainRequests)
    .where(eq(domainRequests.id, params.id))
    .limit(1);

  if (!row || row.status !== "pending") {
    return NextResponse.json(
      { error: "not_found", message: "Solicitud no encontrada" },
      { status: 404 },
    );
  }

  const now = new Date();
  const action = parsed.data.action;

  switch (action) {
    case "approve": {
      await db
        .insert(companies)
        .values({
          domain: row.domain,
          name: parsed.data.name,
          sizeBucket: parsed.data.sizeBucket,
        })
        .onConflictDoUpdate({
          target: companies.domain,
          set: {
            name: parsed.data.name,
            sizeBucket: parsed.data.sizeBucket,
          },
        });

      await db
        .update(domainRequests)
        .set({ status: "approved", resolvedAt: now })
        .where(eq(domainRequests.id, row.id));

      return NextResponse.json({ ok: true, status: "approved" });
    }
    case "reject": {
      await db
        .update(domainRequests)
        .set({ status: "rejected", resolvedAt: now })
        .where(eq(domainRequests.id, row.id));

      return NextResponse.json({ ok: true, status: "rejected" });
    }
    default: {
      const _exhaustive: never = action;
      return NextResponse.json(
        { error: "invalid_action", message: String(_exhaustive) },
        { status: 400 },
      );
    }
  }
}
