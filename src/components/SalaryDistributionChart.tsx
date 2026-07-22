"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatArs } from "@/lib/currency";

interface Point {
  salary: number;
  density: number;
}

export function SalaryDistributionChart({
  curve,
  companyMedian,
  companyLabel = "Esta empresa",
}: {
  curve: Point[];
  companyMedian?: number;
  companyLabel?: string;
}) {
  if (!curve.length) return null;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={curve} margin={{ top: 12, right: 12, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
          <XAxis
            dataKey="salary"
            type="number"
            domain={["dataMin", "dataMax"]}
            tick={{ fontSize: 10 }}
            tickFormatter={(v: number) =>
              v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1000)}k`
            }
          />
          <YAxis hide />
          <Tooltip
            formatter={() => ["densidad relativa", "Mercado"]}
            labelFormatter={(v: number) => formatArs(v)}
          />
          <Area
            type="monotone"
            dataKey="density"
            stroke="#0b0b0f"
            fill="#0b0b0f"
            fillOpacity={0.12}
            strokeWidth={2}
            isAnimationActive={false}
          />
          {companyMedian != null ? (
            <ReferenceLine
              x={companyMedian}
              stroke="#059669"
              strokeWidth={2}
              strokeDasharray="4 3"
              label={{
                value: companyLabel,
                position: "insideTopRight",
                fill: "#059669",
                fontSize: 11,
              }}
            />
          ) : null}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
