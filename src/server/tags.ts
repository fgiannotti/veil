import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { benefitTags } from "@/server/db/schema/data";
import { SUGGESTED_BENEFIT_TAGS, slugifyTag } from "@/lib/benefit-tags";

export async function upsertBenefitTags(tags: { slug: string; label: string }[]): Promise<void> {
  for (const tag of tags) {
    await db
      .insert(benefitTags)
      .values({
        slug: tag.slug,
        label: tag.label,
        useCount: 1,
      })
      .onConflictDoUpdate({
        target: benefitTags.slug,
        set: {
          useCount: sql`${benefitTags.useCount} + 1`,
          // Keep the first label casing; don't overwrite with every submit.
        },
      });
  }
}

export async function listTagSuggestions(limit = 40): Promise<{ slug: string; label: string }[]> {
  const popular = await db
    .select({
      slug: benefitTags.slug,
      label: benefitTags.label,
    })
    .from(benefitTags)
    .orderBy(sql`${benefitTags.useCount} desc`)
    .limit(limit);

  const seen = new Set(popular.map((t) => t.slug));
  const merged = [...popular];

  for (const label of SUGGESTED_BENEFIT_TAGS) {
    const slug = slugifyTag(label);
    if (seen.has(slug)) continue;
    seen.add(slug);
    merged.push({ slug, label });
  }

  return merged;
}
