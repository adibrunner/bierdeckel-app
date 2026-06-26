"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface DataPoint {
  label: string;
  elo: number;
}

interface Props {
  data: DataPoint[];
}

export function EloChart({ data }: Props) {
  const startElo = data[0]?.elo ?? 1000;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          domain={["auto", "auto"]}
        />
        <Tooltip
          formatter={(value) => [value, "ELO"]}
          contentStyle={{ fontSize: 12, borderRadius: 6 }}
        />
        <ReferenceLine y={startElo} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
        <Line
          type="monotone"
          dataKey="elo"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 3, fill: "hsl(var(--primary))" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
