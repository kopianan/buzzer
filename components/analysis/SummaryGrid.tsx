import { AnalysisStats } from "@/lib/types";

interface Props {
  total: number;
  stats: AnalysisStats;
  onNarrativePushClick?: () => void;
}

export function SummaryGrid({ total, stats, onNarrativePushClick }: Props) {
  const narrativePushCount = stats.narrative_push_count ?? 0;
  const amplifierCount = stats.amplifier ?? 0;
  const suspectCount = stats.suspect ?? 0;
  const organicCount = stats.organic ?? 0;

  const staticItems = [
    { val: total, label: "Total Komentar", color: "", desc: "Semua komentar yang dianalisis" },
    { val: amplifierCount, label: "Amplifier", color: "text-[#ff3d5a]", desc: "Akun terkoordinasi yang memperkuat narasi (buzzer)" },
    { val: suspectCount, label: "Mencurigakan", color: "text-[#ffb800]", desc: "Akun dengan pola anomali perlu validasi" },
    { val: organicCount, label: "Organik", color: "text-[#00d4aa]", desc: "Akun dengan engagement genuine" },
  ];

  const colClass =
    narrativePushCount > 0
      ? "grid grid-cols-2 md:grid-cols-5 gap-3 mb-8"
      : "grid grid-cols-2 md:grid-cols-4 gap-3 mb-8";

  return (
    <div className={colClass}>
      {staticItems.map((item, idx) => (
        <div
          key={idx}
          className="bg-[#1a1a26] border border-[#2a2a3a] rounded-xl p-5 text-center transition-all duration-300 hover:border-[#333348] hover:-translate-y-0.5 animate-fadeUp"
          style={{ animationDelay: `${(idx + 1) * 0.1}s` }}
          title={item.desc}
        >
          <div className={`text-[32px] font-bold tracking-tight mb-1 ${item.color}`}>
            {item.val}
          </div>
          <div className="text-xs text-[#8888a0] uppercase tracking-wider font-medium">
            {item.label}
          </div>
        </div>
      ))}
      {narrativePushCount > 0 && (
        <button
          onClick={onNarrativePushClick}
          className="bg-[#1a1a26] border border-[rgba(167,139,250,0.25)] rounded-xl p-5 text-center transition-all duration-300 hover:border-[rgba(167,139,250,0.5)] hover:-translate-y-0.5 hover:bg-[rgba(167,139,250,0.05)] animate-fadeUp cursor-pointer"
          style={{ animationDelay: "0.5s" }}
          title="Entitas yang disebutkan oleh banyak akun berbeda"
        >
          <div className="text-[32px] font-bold tracking-tight mb-1 text-[#a78bfa]">
            {narrativePushCount}
          </div>
          <div className="text-xs text-[#8888a0] uppercase tracking-wider font-medium">
            Entitas Dipush ›
          </div>
        </button>
      )}
    </div>
  );
}
