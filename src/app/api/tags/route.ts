import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { listTagSuggestions } from "@/server/tags";

export async function GET() {
  const session = await auth();
  if (!session?.profileId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const tags = await listTagSuggestions();
  return NextResponse.json({ tags });
}
