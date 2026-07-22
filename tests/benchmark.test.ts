import { describe, expect, it } from "vitest";
import {
  buildBenchmark,
  buildCompanyComparison,
  buildGaussianCurve,
  K_ANONYMITY_THRESHOLD,
  percentile,
  rankCompanyMedian,
  rankTopBenefits,
} from "../src/server/benchmark";
import type { IndicatorRow } from "../src/server/inflation";

const todayInd: IndicatorRow = {
  date: "2026-05-01",
  usdBlueBuy: 1725,
  usdBlueSell: 1745,
  ipcIndex: 12512,
};

const indByDate: Record<string, IndicatorRow> = {
  "2024-06-01": {
    date: "2024-06-01",
    usdBlueBuy: 1395,
    usdBlueSell: 1415,
    ipcIndex: 7522,
  },
  "2025-06-01": {
    date: "2025-06-01",
    usdBlueBuy: 1185,
    usdBlueSell: 1205,
    ipcIndex: 10488,
  },
  "2026-05-01": todayInd,
};

const indicatorFor = (m: string): IndicatorRow => {
  const r = indByDate[m];
  if (!r) throw new Error("unexpected month: " + m);
  return r;
};

const cohort = {
  role: "backend",
  seniority: "senior",
  companySizeBucket: "5000+",
};

describe("percentile", () => {
  it("returns the only element for single-item arrays", () => {
    expect(percentile([42], 0.5)).toBe(42);
  });

  it("interpolates linearly between values", () => {
    expect(percentile([0, 10, 20, 30, 40], 0.5)).toBe(20);
    expect(percentile([0, 10], 0.5)).toBe(5);
  });
});

describe("buildBenchmark", () => {
  it("returns insufficient_data when below threshold", () => {
    const res = buildBenchmark(
      cohort,
      [{ netArs: 1_000_000, paymentMonth: "2026-05-01" }],
      todayInd,
      indicatorFor,
    );
    expect(res.status).toBe("insufficient_data");
    expect(res.count).toBe(0);
    expect(res.threshold).toBe(K_ANONYMITY_THRESHOLD);
    expect(res.avg).toBeUndefined();
  });

  it("returns insufficient_data with 2 entries (just below threshold)", () => {
    const res = buildBenchmark(
      cohort,
      [
        { netArs: 1_000_000, paymentMonth: "2026-05-01" },
        { netArs: 1_500_000, paymentMonth: "2026-05-01" },
      ],
      todayInd,
      indicatorFor,
    );
    expect(res.status).toBe("insufficient_data");
    expect(res.count).toBe(0);
  });

  it("returns ok with 3 entries (at threshold)", () => {
    const res = buildBenchmark(
      cohort,
      [
        { netArs: 1_000_000, paymentMonth: "2026-05-01" },
        { netArs: 1_500_000, paymentMonth: "2026-05-01" },
        { netArs: 2_000_000, paymentMonth: "2026-05-01" },
      ],
      todayInd,
      indicatorFor,
    );
    expect(res.status).toBe("ok");
    expect(res.count).toBe(3);
    expect(res.avg).toBeCloseTo(1_500_000, 6);
    expect(res.p25).toBeCloseTo(1_250_000, 6);
    expect(res.p50).toBeCloseTo(1_500_000, 6);
    expect(res.p95).toBeCloseTo(1_950_000, 6);
  });

  it("inflates older entries to today's pesos using IPC ratio", () => {
    const res = buildBenchmark(
      cohort,
      [
        { netArs: 100_000, paymentMonth: "2024-06-01" },
        { netArs: 100_000, paymentMonth: "2024-06-01" },
        { netArs: 100_000, paymentMonth: "2024-06-01" },
      ],
      todayInd,
      indicatorFor,
    );
    expect(res.status).toBe("ok");
    const expected = (100_000 * 12512) / 7522;
    expect(res.avg).toBeCloseTo(expected, 1);
    expect(res.p50).toBeCloseTo(expected, 1);
  });
});

describe("company market comparison", () => {
  it("ranks higher medians better", () => {
    const { rank, total, percentile: pct } = rankCompanyMedian(
      [1_000_000, 2_000_000, 3_000_000],
      3_000_000,
    );
    expect(rank).toBe(1);
    expect(total).toBe(3);
    expect(pct).toBe(100);
  });

  it("builds a gaussian curve and marks the focus company", () => {
    const medians = new Map([
      ["a.com", 1_000_000],
      ["b.com", 2_000_000],
      ["c.com", 3_000_000],
    ]);
    const res = buildCompanyComparison(medians, "c.com", "Company C");
    expect(res.status).toBe("ok");
    expect(res.rank).toBe(1);
    expect(res.companyMedian).toBe(3_000_000);
    expect(res.curve?.length).toBeGreaterThan(10);
    expect(buildGaussianCurve([1, 2, 3]).length).toBe(48);
  });

  it("returns insufficient_data below company threshold", () => {
    const medians = new Map([
      ["a.com", 1_000_000],
      ["b.com", 2_000_000],
    ]);
    const res = buildCompanyComparison(medians, "a.com", "A");
    expect(res.status).toBe("insufficient_data");
  });
});

describe("rankTopBenefits", () => {
  it("returns the five most frequent tags", () => {
    const ranked = rankTopBenefits([
      ["Remoto", "Prepaga"],
      ["Remoto", "Híbrido"],
      ["remoto", "Sueldo en USD"],
      ["Prepaga", "Bono anual"],
      ["Híbrido"],
    ]);
    expect(ranked[0]?.label.toLowerCase()).toBe("remoto");
    expect(ranked[0]?.count).toBe(3);
    expect(ranked.length).toBeLessThanOrEqual(5);
  });
});
