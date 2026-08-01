import { describe, expect, it } from "vitest";
import {
  hasOnboardingPrefill,
  readOnboardingPrefill,
  withOnboardingPrefill,
} from "@/lib/onboarding";

describe("onboarding prefill", () => {
  it("reads valid netArs and month", () => {
    const p = readOnboardingPrefill(
      new URLSearchParams("netArs=1500000&month=2024-06"),
    );
    expect(p).toEqual({ netArs: "1500000", month: "2024-06" });
    expect(hasOnboardingPrefill(p)).toBe(true);
  });

  it("drops invalid month", () => {
    const p = readOnboardingPrefill(
      new URLSearchParams("netArs=1&month=not-a-month"),
    );
    expect(p.month).toBeNull();
    expect(p.netArs).toBe("1");
  });

  it("drops months before 2023-01", () => {
    const p = readOnboardingPrefill(
      new URLSearchParams("month=2022-12"),
    );
    expect(p.month).toBeNull();
  });

  it("builds path with query", () => {
    expect(
      withOnboardingPrefill("/verify", { netArs: "500000", month: "2024-01" }),
    ).toBe("/verify?netArs=500000&month=2024-01");
    expect(withOnboardingPrefill("/signup", { netArs: null, month: null })).toBe(
      "/signup",
    );
  });
});
