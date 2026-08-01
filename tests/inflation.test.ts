import { describe, it, expect } from "vitest";
import {
  computeRealWage,
  resolveIndicatorForDate,
  toRealARS,
  toUSDBlue,
  type IndicatorRow,
} from "../src/server/inflation";

const jan23: IndicatorRow = {
  date: "2023-01-01",
  usdBlueBuy: 360,
  usdBlueSell: 365,
  ipcIndex: 1430,
};

const may26: IndicatorRow = {
  date: "2026-05-01",
  usdBlueBuy: 1725,
  usdBlueSell: 1745,
  ipcIndex: 12512,
};

describe("resolveIndicatorForDate", () => {
  const mar1: IndicatorRow = {
    date: "2026-03-01",
    usdBlueBuy: 1645,
    usdBlueSell: 1665,
    ipcIndex: 12121,
  };
  const mar6: IndicatorRow = {
    date: "2026-03-06",
    usdBlueBuy: 1405,
    usdBlueSell: 1405,
    ipcIndex: 12158,
  };

  it("prefers at-or-before when present", () => {
    expect(resolveIndicatorForDate("2026-03-01", mar1, mar6)).toBe(mar1);
  });

  it("falls back to a later row in the same month only", () => {
    expect(resolveIndicatorForDate("2026-03-01", undefined, mar6)).toBe(mar6);
    expect(() => resolveIndicatorForDate("2025-08-01", undefined, mar6)).toThrow(
      /No economic indicator data/,
    );
  });

  it("throws when no indicators exist", () => {
    expect(() => resolveIndicatorForDate("2026-03-01", undefined, undefined)).toThrow(
      /No economic indicator data/,
    );
  });
});

describe("toUSDBlue", () => {
  it("divides by the USD Blue sell rate at the payment date", () => {
    expect(toUSDBlue(365_000, jan23)).toBeCloseTo(1000, 6);
  });

  it("returns 0 if the rate is missing", () => {
    expect(toUSDBlue(1000, { ...jan23, usdBlueSell: 0 })).toBe(0);
  });
});

describe("toRealARS", () => {
  it("inflates the original ARS by the IPC ratio", () => {
    const real = toRealARS(100_000, jan23, may26);
    expect(real).toBeCloseTo((100_000 * 12512) / 1430, 1);
  });

  it("is the identity when from == to", () => {
    expect(toRealARS(100_000, jan23, jan23)).toBeCloseTo(100_000, 6);
  });
});

describe("computeRealWage", () => {
  it("captures purchasing-power change in USD Blue terms", () => {
    const r = computeRealWage(365_000, "2023-01-01", jan23, may26);
    expect(r.usdValueAtPayment).toBeCloseTo(1000, 6);
    expect(r.usdBlueToday).toBe(may26.usdBlueSell);
    expect(r.usdValueToday).toBeCloseTo(365_000 / 1745, 6);
    expect(r.purchasingPowerChangePct).toBeLessThan(0); // peso lost USD value
  });

  it("computes real ARS today consistent with the IPC ratio", () => {
    const r = computeRealWage(100_000, "2023-01-01", jan23, may26);
    expect(r.realArsToday).toBeCloseTo((100_000 * 12512) / 1430, 1);
  });

  it("inflates when payment and today use different indicator months", () => {
    const aug25: IndicatorRow = {
      date: "2025-08-01",
      usdBlueBuy: 1335,
      usdBlueSell: 1355,
      ipcIndex: 10846,
    };
    const r = computeRealWage(3_500_000, "2025-08-01", aug25, may26);
    expect(r.realArsToday).toBeCloseTo((3_500_000 * 12512) / 10846, 0);
    expect(r.realArsToday).not.toBe(3_500_000);
  });
});
