import { Comment, CommentType } from "@/lib/types";

const TYPE_CONFIG: Record<CommentType, {
  badge: string;
  badgeText: string;
  badgeDesc: string;
  confColor: string;
  avatarGradient: string;
  borderLeft: string;
}> = {
  organic: {
    badge: "bg-[rgba(0,212,170,0.2)] text-[#00d4aa]",
    badgeText: "ORGANIK",
    badgeDesc: "Akun dengan engagement genuine",
    confColor: "#00d4aa",
    avatarGradient: "from-[#00d4aa] to-[#00b4d8]",
    borderLeft: "border-l-[3px] border-l-[#00d4aa]",
  },
  suspect: {
    badge: "bg-[rgba(255,184,0,0.2)] text-[#ffb800]",
    badgeText: "MENCURIGAKAN",
    badgeDesc: "Akun dengan pola perlu validasi",
    confColor: "#ffb800",
    avatarGradient: "from-[#ffb800] to-[#ff8c00]",
    borderLeft: "border-l-[3px] border-l-[#ffb800]",
  },
  amplifier: {
    badge: "bg-[rgba(255,61,90,0.2)] text-[#ff3d5a]",
    badgeText: "AMPLIFIER",
    badgeDesc: "Akun yang memperkuat narasi (buzzer)",
    confColor: "#ff3d5a",
    avatarGradient: "from-[#ff3d5a] to-[#ff6b35]",
    borderLeft: "border-l-[3px] border-l-[#ff3d5a]",
  },
};

const SENTIMENT_COLOR: Record<string, string> = {
  pro: "text-[#00d4aa]",
  contra: "text-[#ff3d5a]",
  neutral: "text-[#6366f1]",
  irrelevant: "text-[#55556a]",
};

const SENTIMENT_LABEL: Record<string, string> = {
  pro: "PRO",
  contra: "KONTRA",
  neutral: "NETRAL",
  irrelevant: "IRRELEVAN",
};

interface Props {
  comment: Comment;
  index: number;
}

export function CommentCard({ comment: c, index: i }: Props) {
  const cfg = TYPE_CONFIG[c.type];
  const confPercent = Math.round(c.confidence * 100);
  const initial = c.username.charAt(0).toUpperCase();
  const flagBorderClass =
    c.type === "organic"
      ? "text-[#00d4aa] border-[rgba(0,212,170,0.2)] bg-[rgba(0,212,170,0.05)]"
      : c.type === "suspect"
      ? "text-[#ffb800] border-[rgba(255,184,0,0.2)] bg-[rgba(255,184,0,0.05)]"
      : "text-[#ff3d5a] border-[rgba(255,61,90,0.2)] bg-[rgba(255,61,90,0.05)]";

  // AI reviewed if has reasoning (from AI) or needs_ai is false with explicit sentiment
  const isAiReviewed = c.reasoning !== undefined && c.reasoning !== null;
  const isPendingAi = c.needs_ai === true && !isAiReviewed;

  return (
    <div
      className={`bg-[#1a1a26] border border-[#2a2a3a] rounded-xl p-5 flex items-start gap-3.5 transition-all duration-300 hover:border-[#333348] hover:bg-[#222233] animate-fadeUp ${cfg.borderLeft}`}
      style={{ animationDelay: `${Math.min(i * 0.03, 0.8)}s` }}
      title={cfg.badgeDesc}
    >
      <div
        className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-white text-[15px] bg-gradient-to-br ${cfg.avatarGradient}`}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="font-semibold text-sm">@{c.username}</span>
          {c.is_verified && (
            <span className="text-[10px] font-mono text-[#6366f1]">✓ verified</span>
          )}
          <span 
            className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md ${cfg.badge}`}
            title={cfg.badgeDesc}
          >
            {cfg.badgeText}
          </span>
          
          {/* Sentiment Badge */}
          <span 
            className={`text-[10px] font-mono ${SENTIMENT_COLOR[c.sentiment] || "text-[#55556a]"} ${
              isPendingAi ? "opacity-50" : ""
            }`}
            title={isPendingAi ? "Sentimen sementara (menunggu AI review)" : isAiReviewed ? "Sentimen ditentukan AI" : "Sentimen default"}
          >
            {SENTIMENT_LABEL[c.sentiment] || c.sentiment}
            {isAiReviewed && " ✓"}
            {isPendingAi && " ⏳"}
          </span>
          
          <span className="text-[11px] text-[#55556a] font-mono flex items-center gap-1.5">
            {confPercent}%
            <span className="w-[60px] h-1 bg-[#12121a] rounded-sm inline-block overflow-hidden">
              <span
                className="h-full rounded-sm block"
                style={{ width: `${confPercent}%`, backgroundColor: cfg.confColor }}
              />
            </span>
          </span>
          {c.in_timing_spike && (
            <span className="text-[10px] font-mono text-[#ffb800] bg-[rgba(255,184,0,0.1)] px-2 py-0.5 rounded-md">
              ⏱ SPIKE
            </span>
          )}
        </div>

        {c.comment_text ? (
          <div className="text-sm text-[#8888a0] leading-relaxed mb-2.5">
            {c.comment_text.length > 200
              ? c.comment_text.slice(0, 200) + "..."
              : c.comment_text}
          </div>
        ) : (
          <div className="text-sm text-[#55556a] italic mb-2.5">(komentar kosong)</div>
        )}

        {/* AI Reasoning */}
        {c.reasoning && (
          <div className="text-[12px] text-[#6366f1] bg-[rgba(99,102,241,0.06)] border border-[rgba(99,102,241,0.15)] rounded-lg px-3 py-1.5 mb-2.5 flex items-start gap-2">
            <span className="shrink-0">🤖</span>
            <span>{c.reasoning}</span>
          </div>
        )}
        
        {/* Pending AI Review Notice */}
        {isPendingAi && (
          <div className="text-[12px] text-[#8888a0] bg-[rgba(136,136,160,0.06)] border border-[rgba(136,136,160,0.15)] rounded-lg px-3 py-1.5 mb-2.5">
            ⏳ Menunggu review AI untuk validasi akhir
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {c.flags.map((f, fi) => (
            <span
              key={fi}
              className={`text-[11px] font-mono px-2 py-0.5 rounded-md border ${flagBorderClass}`}
            >
              {f}
            </span>
          ))}
          {c.likes > 0 && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md border border-[#2a2a3a] text-[#55556a] bg-[rgba(255,255,255,0.04)]">
              ❤️ {c.likes}
            </span>
          )}
          {c.is_private && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md border border-[#2a2a3a] text-[#55556a] bg-[rgba(255,255,255,0.04)]">
              🔒 private
            </span>
          )}
          {c.similarity_cluster_id !== undefined && c.similarity_cluster_id >= 0 && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md border border-[#2a2a3a] text-[#6366f1] bg-[rgba(99,102,241,0.08)]">
              cluster #{c.similarity_cluster_id}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
