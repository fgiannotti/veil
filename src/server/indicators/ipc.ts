import seed from "./seed.json";

export interface IpcPoint {
  date: string; // YYYY-MM-01
  ipcIndex: number;
}

interface SeedRow {
  date: string;
  ipcIndex: number;
  usdBlueBuy: number;
  usdBlueSell: number;
}

interface Seed {
  notes: string;
  rows: SeedRow[];
}

const SEED = seed as Seed;

/**
 * Static IPC adapter, sourced from a curated INDEC snapshot in `seed.json`.
 * Replace with a live INDEC/aggregator call in a future iteration; this
 * interface (a function returning IpcPoint[]) is what the refresh job consumes.
 */
export async function fetchIpcSeries(): Promise<IpcPoint[]> {
  return SEED.rows.map((r) => ({ date: r.date, ipcIndex: r.ipcIndex }));
}

export function getSeed(): SeedRow[] {
  return SEED.rows;
}
