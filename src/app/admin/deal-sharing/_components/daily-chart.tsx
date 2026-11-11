"use client";

import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Deals shared per day. Clicking a day's bar opens that day's list. */
export function DailyChart({ data }: { data: { day: string; label: string; shares: number }[] }) {
  const router = useRouter();
  return (
    <div data-daily-chart>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="#eef0f5" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8292ab" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8292ab" }} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(10,106,176,0.06)" }}
            contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 12px 32px -8px rgba(16,24,40,0.25)", fontSize: 12 }}
            formatter={(v: number) => [`${v} deal${v === 1 ? "" : "s"} shared`, ""]}
          />
          <Bar
            dataKey="shares"
            fill="#0a6ab0"
            radius={[6, 6, 0, 0]}
            cursor="pointer"
            onClick={(d: { payload?: { day?: string } }) => {
              if (d?.payload?.day) router.push(`/admin/deal-sharing?period=day&date=${d.payload.day}`);
            }}
          />
        </BarChart>
      </ResponsiveContainer>
      <ul className="sr-only">
        {data.map((d) => (
          <li key={d.day}>
            <a href={`/admin/deal-sharing?period=day&date=${d.day}`}>
              {d.label}: {d.shares}
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-center text-[11px] text-navy-400">Click a day to see its deals</p>
    </div>
  );
}
