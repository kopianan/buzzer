import { Comment, CloneCluster } from "@/lib/types";

interface Props {
  comments: Comment[];
  cloneClusters: CloneCluster[];
  total: number;
}

export function PatternCards({ comments, cloneClusters, total }: Props) {
  const clusterCommentCount = cloneClusters
    .filter((c) => c.is_clone)
    .reduce((s, c) => s + c.size, 0);

  const patterns = [
    {
      icon: "📋",
      title: "Komentar Clone/Copy-Paste",
      desc: "Komentar dengan kemiripan teks ≥60% antar akun, dideteksi menggunakan TF-IDF + DBSCAN clustering + Indonesian stemming.",
      val: Math.round((clusterCommentCount / Math.max(total, 1)) * 100),
      color: "#ff3d5a",
      suffix: "% komentar dalam clone cluster",
    },
    {
      icon: "👶",
      title: "Akun Pattern Mencurigakan",
      desc: "Akun private, tanpa nama lengkap, username generik, atau batch account (pola username serupa pada banyak akun).",
      val: Math.round(
        (comments.filter((c) =>
          c.pre_flags?.some((f) =>
            ["private-account", "no-display-name", "generic-username", "batch-account"].includes(f)
          )
        ).length /
          Math.max(total, 1)) *
          100
      ),
      color: "#ffb800",
      suffix: "% akun dengan pola mencurigakan",
    },
    {
      icon: "😀",
      title: "Komentar Rendah Kualitas",
      desc: "Komentar yang hanya berisi emoji, hanya @mention, atau kurang dari 5 karakter teks.",
      val: Math.round(
        (comments.filter((c) =>
          c.flags?.some((f) =>
            ["emoji-only", "mention-spam", "low-quality", "emoji-flood"].includes(f)
          )
        ).length /
          Math.max(total, 1)) *
          100
      ),
      color: "#ff6b35",
      suffix: "% komentar low-quality",
    },
    {
      icon: "⏱️",
      title: "Timing Burst",
      desc: "Komentar yang diposting dalam window 10 menit yang sama — indikasi aktivitas terkoordinasi.",
      val: Math.round(
        (comments.filter((c) => c.in_timing_spike).length / Math.max(total, 1)) * 100
      ),
      color: "#6366f1",
      suffix: "% komentar dalam timing spike",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      {patterns.map((item, idx) => (
        <div
          key={idx}
          className="bg-[#1a1a26] border border-[#2a2a3a] rounded-xl p-5 animate-fadeUp"
          style={{ animationDelay: `${(idx + 1) * 0.1}s` }}
        >
          <h4 className="text-sm mb-1.5 flex items-center gap-2 font-semibold">
            {item.icon} {item.title}
          </h4>
          <p className="text-[13px] text-[#8888a0] leading-relaxed mb-3">{item.desc}</p>
          <div className="h-1.5 bg-[#12121a] rounded-md overflow-hidden">
            <div
              className="h-full rounded-md transition-all duration-1000"
              style={{ width: `${item.val}%`, backgroundColor: item.color }}
            />
          </div>
          <div className="font-mono text-xs text-[#55556a] mt-1.5">
            {item.val}% {item.suffix}
          </div>
        </div>
      ))}
    </div>
  );
}
