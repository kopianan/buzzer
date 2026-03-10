"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { Comment } from "@/lib/types";

const FLAG_LABELS: Record<string, string> = {
  "clone": "Clone",
  "copy-paste": "Copy-paste",
  "mass-coordination": "Mass coord.",
  "timing-spike": "Timing spike",
  "private-account": "Private akun",
  "no-display-name": "Tanpa nama",
  "generic-username": "Username generik",
  "batch-account": "Batch akun",
  "emoji-only": "Emoji only",
  "mention-spam": "Mention spam",
  "low-quality": "Low quality",
  "emoji-flood": "Emoji flood",
  "uniform-length": "Panjang seragam",
  "no-interaction": "No interaksi",
};

const FLAG_COLORS: Record<string, string> = {
  "clone": "#ff3d5a",
  "copy-paste": "#ff6b35",
  "mass-coordination": "#ff3d5a",
  "timing-spike": "#6366f1",
  "batch-account": "#ffb800",
  "private-account": "#8888a0",
  "generic-username": "#ffb800",
  "no-display-name": "#8888a0",
  "emoji-only": "#ff6b35",
  "mention-spam": "#ff6b35",
  "low-quality": "#55556a",
  "emoji-flood": "#ff6b35",
  "uniform-length": "#ffb800",
  "no-interaction": "#8888a0",
};

interface Props {
  comments: Comment[];
}

export function FlagBreakdown({ comments }: Props) {
  const counts: Record<string, number> = {};
  for (const c of comments) {
    for (const f of c.flags || []) {
      counts[f] = (counts[f] || 0) + 1;
    }
  }

  const data = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([flag, count]) => ({
      flag: FLAG_LABELS[flag] || flag,
      rawFlag: flag,
      count,
    }));

  if (data.length === 0) return null;

  return (
    <div className="bg-[#1a1a26] border border-[#2a2a3a] rounded-2xl p-6 animate-fadeUp">
      <h3 className="text-sm uppercase tracking-wider text-[#8888a0] mb-4 font-semibold">
        Frekuensi Flag Deteksi
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 20, left: 80, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "#55556a", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#2a2a3a" }}
          />
          <YAxis
            type="category"
            dataKey="flag"
            tick={{ fill: "#8888a0", fontSize: 11, fontFamily: "monospace" }}
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#12121a",
              border: "1px solid #2a2a3a",
              borderRadius: 8,
              fontSize: 12,
              color: "#eeeef0",
            }}
            formatter={(val) => [val, "komentar"]}
          />
          <Bar dataKey="count" radius={[0, 3, 3, 0]}>
            {data.map((d, idx) => (
              <Cell key={idx} fill={FLAG_COLORS[d.rawFlag] || "#6366f1"} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
