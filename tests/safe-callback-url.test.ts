import { describe, expect, it } from "vitest";
import { safeCallbackUrl } from "../src/lib/safe-callback-url";

describe("safeCallbackUrl", () => {
  it("allows relative paths", () => {
    expect(safeCallbackUrl("/dashboard")).toBe("/dashboard");
    expect(safeCallbackUrl("/verify?x=1")).toBe("/verify?x=1");
  });

  it("rejects open redirects", () => {
    expect(safeCallbackUrl("https://evil.com")).toBe("/dashboard");
    expect(safeCallbackUrl("//evil.com")).toBe("/dashboard");
    expect(safeCallbackUrl("http://evil.com")).toBe("/dashboard");
    expect(safeCallbackUrl("\\evil")).toBe("/dashboard");
  });

  it("falls back when empty", () => {
    expect(safeCallbackUrl(null)).toBe("/dashboard");
    expect(safeCallbackUrl("")).toBe("/dashboard");
  });
});
