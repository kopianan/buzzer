import { ThreatConfig } from "@/lib/types";

interface Props {
  score: number;
  meterWidth: number;
  threatConfig: ThreatConfig;
}

export function CoordinationMeter({ score, meterWidth, threatConfig }: Props) {
  return (
    <div
      className="bg-[#1a1a26] border border-[#2a2a3a] rounded-2xl p-7 mb-5 animate-fadeUp"
      style={{ animationDelay: "0.5s" }}
    >
      <h3 className="text-sm uppercase tracking-wider text-[#8888a0] mb-5 font-semibold">
        Coordination Score: {score}/100 — {threatConfig.label}
      </h3>
      <div className="relative h-3 bg-[#12121a] rounded-md overflow-hidden mb-3">
        <div
          className={`h-full rounded-md bg-gradient-to-r ${threatConfig.color} transition-all duration-[1500ms] ease-[cubic-bezier(0.22,1,0.36,1)]`}
          style={{ width: `${meterWidth}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-[#55556a] font-mono">
        <span>Aman</span>
        <span>Rendah</span>
        <span>Sedang</span>
        <span>Tinggi</span>
        <span>Kritis</span>
      </div>
      <div
        className={`mt-4 p-4 rounded-xl text-sm leading-relaxed ${threatConfig.bg}`}
        dangerouslySetInnerHTML={{ __html: threatConfig.desc }}
      />
    </div>
  );
}
