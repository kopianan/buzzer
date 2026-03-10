"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from "recharts";
import { TimingSpike } from "@/lib/types";

interface Props {
  timingBuckets: Record<string, number>;
  timingSpikes: TimingSpike[];
}

export function TimelineChart({ timingBuckets, timingSpikes }: Props) {
  const spikeWindows = new Set(timingSpikes.map((s) => s.window));

  const data = Object.entries(timingBuckets).map(([window, count]) => ({
    time: window.slice(11, 16), // HH:MM
    fullTime: window,
    count,
    isSpike: spikeWindows.has(window),
  }));

  if (data.length === 0) return null;

  return (
    <div className="bg-[#1a1a26] border border-[#2a2a3a] rounded-2xl p-6 animate-fadeUp">
      <h3 className="text-sm uppercase tracking-wider text-[#8888a0] mb-5 font-semibold">
        Timeline Aktivitas Komentar
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
          <XAxis
            dataKey="time"
            tick={{ fill: "#55556a", fontSize: 11, fontFamily: "monospace" }}
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
            formatter={(val) => [val, "Komentar"]}
            labelFormatter={(label, payload) => {
              const item = payload?.[0]?.payload;
              return item?.fullTime || label;
            }}
          />
          {timingSpikes.map((spike) => (
            <ReferenceLine
              key={spike.window}
              x={spike.window.slice(11, 16)}
              stroke="#ff3d5a"
              strokeDasharray="3 3"
              strokeOpacity={0.6}
            />
          ))}
          <Area
            type="monotone"
            dataKey="count"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#colorCount)"
            dot={(props) => {
              const { cx, cy, payload } = props;
              if (payload.isSpike) {
                return <circle key={payload.fullTime} cx={cx} cy={cy} r={4} fill="#ff3d5a" stroke="#ff3d5a" />;
              }
              return <></>;
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
      {timingSpikes.length > 0 && (
        <div className="mt-2 text-[11px] text-[#55556a] font-mono flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#ff3d5a] inline-block" style={{ borderTop: "1px dashed #ff3d5a" }} />
          Garis merah = timing spike ({timingSpikes.length} window)
        </div>
      )}
    </div>
  );
}
