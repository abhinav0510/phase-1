"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function SimpleBarChart({
  data,
  xKey,
  yKey,
  color = "#365385",
  height = 240,
}: {
  data: Record<string, any>[];
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
}) {
  if (!data.length) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-navy-400">
        No data for this period.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
        <CartesianGrid strokeDasharray="4 6" stroke="#eef2f7" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: "#8292ab" }}
          tickLine={false}
          axisLine={false}
          dy={6}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#8292ab" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "#f1f4f9", radius: 8 }}
          contentStyle={{
            borderRadius: 12,
            border: "none",
            boxShadow: "0 10px 30px -10px rgb(16 24 40 / 0.25)",
            fontSize: 12,
          }}
        />
        <Bar dataKey={yKey} fill={color} radius={[8, 8, 8, 8]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
