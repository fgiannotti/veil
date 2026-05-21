"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Point {
  month: string;
  usdValue: number;
}

export function RealWageChart({ data }: { data: Point[] }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10 }}
            tickFormatter={(s: string) => s.slice(0, 7)}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickFormatter={(v: number) => `$${Math.round(v)}`}
            width={48}
          />
          <Tooltip
            formatter={(v: number) => [`$${Math.round(v).toLocaleString("en-US")}`, "USD"]}
            labelFormatter={(s: string) => s.slice(0, 7)}
          />
          <Line
            type="monotone"
            dataKey="usdValue"
            stroke="#5b5bd6"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
