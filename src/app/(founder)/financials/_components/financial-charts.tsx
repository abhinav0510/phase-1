"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatLakh } from "@/shared/lib/utils";
import { INK, SERIES } from "../../dashboard/_components/palette";
import type { MonthPoint, YearPoint } from "./model";

const tooltipStyle = {
  borderRadius: 12,
  border: "none",
  boxShadow: "0 12px 32px -8px rgba(16,24,40,0.25)",
  fontSize: 12,
  padding: "8px 12px",
};
const axisTick = { fontSize: 11, fill: INK.muted };
const money = (v: unknown) => (typeof v === "number" ? formatLakh(v) : "—");
const axisMoney = (v: number) => (v >= 100 ? `₹${Math.round(v / 10) / 10} Cr` : `₹${v} L`);

/** Monthly revenue against expenses, in ₹ lakh. */
export function RevenueExpensesChart({ data }: { data: MonthPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid stroke={INK.grid} vertical={false} />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={axisMoney} width={64} />
        <Tooltip contentStyle={tooltipStyle} formatter={money} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: INK.muted, paddingTop: 8 }} />
        <Line type="monotone" dataKey="revenue" name="Revenue" stroke={SERIES.leaf} strokeWidth={2.5} dot={{ r: 3 }} connectNulls animationDuration={900} />
        <Line type="monotone" dataKey="expenses" name="Expenses" stroke={SERIES.gold} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} connectNulls animationDuration={900} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Revenue by financial year: actual years solid, projected years dashed. */
export function YearlyRevenueChart({ data }: { data: YearPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid stroke={INK.grid} vertical={false} />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={axisMoney} width={64} />
        <Tooltip contentStyle={tooltipStyle} formatter={money} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: INK.muted, paddingTop: 8 }} />
        <Line type="monotone" dataKey="actual" name="Actual" stroke={SERIES.navy} strokeWidth={2.5} dot={{ r: 4 }} connectNulls={false} animationDuration={900} />
        <Line type="monotone" dataKey="projected" name="Projected" stroke={SERIES.navy} strokeWidth={2} strokeDasharray="6 5" dot={{ r: 4, fill: "#fff" }} connectNulls={false} animationDuration={900} />
      </LineChart>
    </ResponsiveContainer>
  );
}
