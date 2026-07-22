import { describe, expect, it } from "vitest";
import { normalizeTagList, slugifyTag } from "../src/lib/benefit-tags";

describe("benefit tags", () => {
  it("slugifies accents and symbols", () => {
    expect(slugifyTag("Sueldo en USD")).toBe("sueldo-en-usd");
    expect(slugifyTag("Híbrido")).toBe("hibrido");
  });

  it("dedupes and caps tags", () => {
    const tags = normalizeTagList([
      "Remoto",
      "remoto",
      "  Prepaga  ",
      "x",
      ...Array.from({ length: 20 }, (_, i) => `Tag ${i}`),
    ]);
    expect(tags[0]?.label).toBe("Remoto");
    expect(tags.some((t) => t.slug === "remoto" && t.label === "remoto")).toBe(false);
    expect(tags.length).toBeLessThanOrEqual(8);
  });
});
