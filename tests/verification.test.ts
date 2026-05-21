import { describe, expect, it } from "vitest";
import {
  extractDomain,
  isPersonalDomain,
  getCompanyMeta,
} from "../src/server/companies/domains";

describe("extractDomain", () => {
  it("returns lowercased domain after the last @", () => {
    expect(extractDomain("ALICE@Globant.com")).toBe("globant.com");
    expect(extractDomain("bob@sub.example.co")).toBe("sub.example.co");
  });

  it("returns empty for malformed input", () => {
    expect(extractDomain("not-an-email")).toBe("");
  });
});

describe("isPersonalDomain", () => {
  it("flags common personal domains", () => {
    expect(isPersonalDomain("gmail.com")).toBe(true);
    expect(isPersonalDomain("outlook.com")).toBe(true);
    expect(isPersonalDomain("proton.me")).toBe(true);
  });

  it("does not flag corporate domains", () => {
    expect(isPersonalDomain("globant.com")).toBe(false);
    expect(isPersonalDomain("mercadolibre.com")).toBe(false);
  });
});

describe("getCompanyMeta", () => {
  it("returns known metadata for tier-1 companies", () => {
    const m = getCompanyMeta("globant.com");
    expect(m.name).toBe("Globant");
    expect(m.sizeBucket).toBe("5000+");
  });

  it("falls back to a small bucket for unknown domains", () => {
    const m = getCompanyMeta("unknown-startup.io");
    expect(m.name).toBe("unknown-startup.io");
    expect(m.sizeBucket).toBe("1-50");
  });
});
