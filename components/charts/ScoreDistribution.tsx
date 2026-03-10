"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Comment } from "@/lib/types";

interface Props {
  comments: Comment[];
}

export function ScoreDistribution({ comments }: Props) {
  // Bucket skor ke 10-point intervals
  const buckets: Record<string, number> = {};
  for (let i = 0; i <= 90; i += 10) {
    buckets[`${i}-${i + 9}`] = 0;
  }

  for (const c of comments) {
    const score = c.pre_score ?? 0;
    const bucketIdx = Math.min(Math.floor(score / 10) * 10, 90);
    const key = `${bucketIdx}-${bucketIdx + 9}`;
    if (key in buckets) buckets[key]++;
  }

  const data = Object.entries(buckets).map(([range, count]) => {
    const start = parseInt(range.split("-")[0]);
    const isAmbiguous = start >= 20 && start < 60;
    const isBuzzer = start >= 50;
    return { range, count, isAmbiguous, isBuzzer };
  });

  const getColor = (d: (typeof data)[0]) => {
    if (d.isBuzzer) return "#ff3d5a";
    if (d.isAmbiguous) return "#ffb800";
    return "#00d4aa";
  };

  return (
    <div className="bg-[#1a1a26] border border-[#2a2a3a] rounded-2xl p-6 animate-fadeUp">
      <h3 className="text-sm uppercase tracking-wider text-[#8888a0] mb-4 font-semibold">
        Distribusi Skor Komentar
      </h3>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" vertical={false} />
          <XAxis
            dataKey="range"
            tick={{ fill: "#55556a", fontSize: 10, fontFamily: "monospace" }}
            tickLine={false}
            axisLine={{ stroke: "#2a2a3a" }}
          />
          <YAxis
            tick={{ fill: "#55556a", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#12121a",
              border: "1px solid #2a2a3a",
              borderRadius: 8,
              fontSize: 12,
              color: "#eeeef0",
            }}
            formatter={(val, _, item) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const p = (item as any)?.payload;
              return [val, p?.isBuzzer ? "Buzzer" : p?.isAmbiguous ? "Suspect" : "Organik"];
            }}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {data.map((d, idx) => (
              <Cell key={idx} fill={getColor(d)} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 text-[11px] font-mono text-[#55556a]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#00d4aa] inline-block" /> Organik (0-19)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#ffb800] inline-block" /> Suspect (20-49)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#ff3d5a] inline-block" /> Buzzer (50+)</span>
      </div>
    </div>
  );
}
