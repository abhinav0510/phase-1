"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { INK, SERIES } from "./palette";

const tooltipStyle = {
  borderRadius: 12,
  border: "none",
  boxShadow: "0 12px 32px -8px rgba(16,24,40,0.25)",
  fontSize: 12,
  padding: "8px 12px",
};

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

/** Part-to-whole donut with the total in the hole; the legend lives beside it. */
export function Donut({
  slices,
  total,
  centerLabel,
}: {
  slices: DonutSlice[];
  total: number;
  centerLabel: string;
}) {
  const data = slices.filter((s) => s.value > 0);
  return (
    <div className="relative h-40 w-40 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={52}
            outerRadius={74}
            startAngle={90}
            endAngle={-270}
            stroke="#ffffff"
            strokeWidth={3}
            cornerRadius={4}
            paddingAngle={2}
            animationDuration={900}
            animationEasing="ease-out"
          >
            {data.map((s) => (
              <Cell key={s.key} fill={s.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v: number, name: string) => [`${v}`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-navy-900">{total}</span>
        <span className="text-[11px] text-navy-400">{centerLabel}</span>
      </div>
    </div>
  );
}

export interface WeekPoint {
  week: string;
  reached: number;
  followups: number;
  meetings: number;
}

/** Grouped columns: one group per weekly report, three series, shared axis. */
export function ActivityBars({ data }: { data: WeekPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -24 }} barGap={2}>
        <CartesianGrid stroke={INK.grid} vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: INK.muted }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: INK.muted }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip cursor={{ fill: "#f1f4f9" }} contentStyle={tooltipStyle} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: INK.muted, paddingTop: 8 }}
        />
        <Bar dataKey="reached" name="Reached" fill={SERIES.navy} radius={[6, 6, 6, 6]} maxBarSize={14} animationDuration={900} />
        <Bar dataKey="followups" name="Follow-ups" fill={SERIES.gold} radius={[6, 6, 6, 6]} maxBarSize={14} animationDuration={900} />
        <Bar dataKey="meetings" name="Meetings" fill={SERIES.teal} radius={[6, 6, 6, 6]} maxBarSize={14} animationDuration={900} />
      </BarChart>
    </ResponsiveContainer>
  );
}
