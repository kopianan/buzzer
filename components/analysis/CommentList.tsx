import { Comment, CommentType, FilterType, AnalysisStats } from "@/lib/types";
import { CommentCard } from "./CommentCard";

interface Props {
  comments: Comment[];
  filter: FilterType;
  setFilter: (f: FilterType) => void;
  stats: AnalysisStats;
  total: number;
}

export function CommentList({ comments, filter, setFilter, stats, total }: Props) {
  const narrativePushCount = stats.narrative_push_count ?? 0;
  const amplifierCount = stats.amplifier ?? 0;

  const filtered = comments
    .filter((c) => {
      if (filter === "all") return true;
      if (filter === "narrative-push") return c.flags.includes("narrative-push");
      return c.type === filter;
    })
    .sort((a, b) => {
      const order: Record<CommentType, number> = { amplifier: 0, suspect: 1, organic: 2 };
      return order[a.type] - order[b.type];
    });

  const filterButtons = [
    { key: "all" as FilterType, label: `Semua (${total})` },
    { key: "amplifier" as FilterType, label: `🔴 Amplifier (${amplifierCount})` },
    { key: "suspect" as FilterType, label: `🟡 Mencurigakan (${stats.suspect})` },
    { key: "organic" as FilterType, label: `🟢 Organik (${stats.organic})` },
    ...(narrativePushCount > 0
      ? [{ key: "narrative-push" as FilterType, label: `🟣 Narrative Push (${narrativePushCount})` }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5 mb-3.5 flex-wrap">
        {filterButtons.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              filter === key
                ? "bg-[#1a1a26] text-[#eeeef0] shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                : "text-[#8888a0] hover:text-[#eeeef0]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.map((c, i) => (
        <CommentCard key={c.no ?? i} comment={c} index={i} />
      ))}
    </div>
  );
}
