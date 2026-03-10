"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { SentimentDist } from "@/lib/types";

const COLORS = {
  pro: "#00d4aa",
  contra: "#ff3d5a",
  neutral: "#6366f1",
  irrelevant: "#3a3a4a",
};

const LABELS = {
  pro: "Pro",
  contra: "Kontra",
  neutral: "Netral",
  irrelevant: "Irrelevan",
};

interface Props {
  distribution: SentimentDist;
  aiReviewedCount?: number;
  pendingAiCount?: number;
}

export function SentimentPieChart({ distribution, aiReviewedCount = 0, pendingAiCount = 0 }: Props) {
  const data = Object.entries(distribution)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: LABELS[key as keyof SentimentDist],
      value,
      color: COLORS[key as keyof SentimentDist],
    }));

  // Check if all comments are neutral (AI not yet reviewed)
  const isAllNeutral = distribution.neutral > 0 && 
    distribution.pro === 0 && 
    distribution.contra === 0 && 
    distribution.irrelevant === 0;

  if (data.length === 0) return null;

  return (
    <div className="bg-[#1a1a26] border border-[#2a2a3a] rounded-2xl p-6 animate-fadeUp">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm uppercase tracking-wider text-[#8888a0] font-semibold">
          Distribusi Sentimen
        </h3>
        {pendingAiCount > 0 && (
          <span className="text-[10px] font-mono text-[#8888a0] bg-[rgba(136,136,160,0.1)] px-2 py-0.5 rounded">
            ⏳ {pendingAiCount} menunggu AI
          </span>
        )}
        {aiReviewedCount > 0 && pendingAiCount === 0 && (
          <span className="text-[10px] font-mono text-[#00d4aa] bg-[rgba(0,212,170,0.1)] px-2 py-0.5 rounded">
            ✓ AI Reviewed
          </span>
        )}
      </div>

      {isAllNeutral && pendingAiCount > 0 ? (
        <div className="flex flex-col items-center justify-center h-[200px] text-center">
          <div className="w-16 h-16 rounded-full bg-[#6366f1]/10 flex items-center justify-center mb-3">
            <span className="text-2xl">⏳</span>
          </div>
          <p className="text-sm text-[#8888a0] mb-1">Sentimen belum ditentukan</p>
          <p className="text-[12px] text-[#55556a]">
            {pendingAiCount} komentar menunggu review AI untuk analisis sentimen akurat
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#12121a",
                border: "1px solid #2a2a3a",
                borderRadius: 8,
                fontSize: 12,
                color: "#eeeef0",
              }}
              formatter={(val, name) => [val, name]}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span style={{ color: "#8888a0", fontSize: 12 }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
