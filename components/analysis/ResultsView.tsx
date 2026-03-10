"use client";

import { AnalysisResult, FilterType, ThreatConfig } from "@/lib/types";
import { SummaryGrid } from "./SummaryGrid";
import { CoordinationMeter } from "./CoordinationMeter";
import { CommentList } from "./CommentList";
import { PatternCards } from "./PatternCards";
import { SentimentPieChart } from "@/components/charts/SentimentPieChart";
import { ScoreDistribution } from "@/components/charts/ScoreDistribution";
import { TimelineChart } from "@/components/charts/TimelineChart";
import { FlagBreakdown } from "@/components/charts/FlagBreakdown";

function getThreatConfig(score: number, result: AnalysisResult): ThreatConfig {
  const suspects = result.comments.filter((c) => c.type === "amplifier" || c.type === "suspect");
  const narrativeEntities = result.narrative_push ?? [];
  const entityNote =
    narrativeEntities.length > 0
      ? ` Terdeteksi <strong>${narrativeEntities.length} entitas</strong> yang dipromosikan secara terkoordinasi.`
      : "";

  if (score >= 50) {
    return {
      color: "from-[#ff3d5a] to-[#ff6b35]",
      bg: "bg-red-500/10",
      label: "⚠️ TINGGI",
      desc: result.summary
        ? result.summary
        : `Post ini menunjukkan indikasi kuat <strong>koordinasi amplifier</strong> (buzzer). <strong>${suspects.length} dari ${result.total}</strong> akun memperkuat narasi secara terkoordinasi.${entityNote}`,
    };
  } else if (score >= 25) {
    return {
      color: "from-[#ffb800] to-[#ff8c00]",
      bg: "bg-yellow-500/10",
      label: "⚡ SEDANG",
      desc: result.summary
        ? result.summary
        : `Post ini menunjukkan beberapa indikasi <strong>koordinasi amplifier</strong>. <strong>${suspects.length} akun</strong> terdeteksi mencurigakan.${entityNote}`,
    };
  } else {
    return {
      color: "from-[#00d4aa] to-[#00b4d8]",
      bg: "bg-emerald-500/10",
      label: "✓ RENDAH",
      desc: result.summary
        ? result.summary
        : `Post ini memiliki engagement yang mayoritas organik. Hanya <strong>${suspects.length} akun</strong> yang menunjukkan pola amplifier.${entityNote}`,
    };
  }
}

interface Props {
  result: AnalysisResult;
  meterWidth: number;
  filter: FilterType;
  setFilter: (f: FilterType) => void;
  activeTab: "overview" | "timeline" | "comments";
  setActiveTab: (t: "overview" | "timeline" | "comments") => void;
  onReset: () => void;
  onTriggerAIReview: () => void;
  isAiReviewing: boolean;
}

const TABS = [
  { key: "overview" as const, label: "Overview" },
  { key: "timeline" as const, label: "Timeline & Cluster" },
  { key: "comments" as const, label: "Komentar" },
];

export function ResultsView({
  result, meterWidth, filter, setFilter, activeTab, setActiveTab, onReset,
  onTriggerAIReview, isAiReviewing,
}: Props) {
  const threatConfig = getThreatConfig(result.coordination_score, result);
  
  // Calculate AI review status
  const aiReviewedCount = result.comments.filter(c => c.reasoning).length;
  const pendingAiCount = result.comments.filter(c => c.needs_ai && !c.reasoning).length;
  const hasAiReview = aiReviewedCount > 0;

  return (
    <section className="pb-16">
      {result.mode === "demo" && (
        <div className="mb-5 px-4 py-2.5 bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.2)] rounded-xl text-[12px] text-[#6366f1] font-mono flex items-center gap-2">
          <span>●</span> MODE DEMO — Menggunakan data sampel komentar nyata dari Instagram
        </div>
      )}

      {/* AI Status Banner */}
      {pendingAiCount > 0 && !result.ai_reviewed && (
        <div className="mb-5 px-4 py-3 bg-[rgba(255,184,0,0.08)] border border-[rgba(255,184,0,0.2)] rounded-xl">
          <div className="flex items-center gap-2 text-[12px] text-[#ffb800] font-mono mb-2">
            <span>🤖</span> 
            {pendingAiCount} komentar memerlukan review AI untuk validasi akhir dan penentuan sentimen
          </div>
          <button
            onClick={onTriggerAIReview}
            disabled={isAiReviewing}
            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] hover:from-[#5558e0] hover:to-[#7c4fe8] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-[13px] font-medium text-white transition-all flex items-center justify-center gap-2"
          >
            {isAiReviewing ? (
              <>
                <span className="animate-spin">⏳</span>
                Menganalisis dengan AI...
              </>
            ) : (
              <>
                <span>✨</span>
                Analyze with AI
              </>
            )}
          </button>
        </div>
      )}
      {result.ai_reviewed && (
        <div className="mb-5 px-4 py-2.5 bg-[rgba(0,212,170,0.08)] border border-[rgba(0,212,170,0.2)] rounded-xl text-[12px] text-[#00d4aa] font-mono flex items-center gap-2">
          <span>✓</span> 
          AI Review selesai — {aiReviewedCount} komentar telah dianalisis untuk validasi dan sentimen
          {result.processing_time_ms && (
            <span className="text-[#55556a] ml-auto">({Math.round(result.processing_time_ms / 1000)}s)</span>
          )}
        </div>
      )}

      <SummaryGrid
        total={result.total}
        stats={result.stats}
        onNarrativePushClick={() => { setFilter("narrative-push"); setActiveTab("comments"); }}
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#12121a] rounded-xl p-1 w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === key
                ? "bg-[#1a1a26] text-[#eeeef0] shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                : "text-[#8888a0] hover:text-[#eeeef0]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-5">
          <CoordinationMeter
            score={result.coordination_score}
            meterWidth={meterWidth}
            threatConfig={threatConfig}
          />
          
          {/* Pattern Detection Info */}
          <div className="bg-[#1a1a26] border border-[#2a2a3a] rounded-xl p-4 animate-fadeUp">
            <p className="text-[12px] text-[#8888a0] leading-relaxed mb-2">
              <span className="text-[#6366f1] font-semibold">🛡️ Amplifier Detection:</span> Analisis ini mendeteksi <strong>amplifier</strong> — akun yang memperkuat narasi secara terkoordinasi (juga dikenal sebagai &ldquo;buzzer&rdquo;). 
            </p>
            <p className="text-[11px] text-[#55556a] leading-relaxed">
              <strong>Amplifier</strong> adalah akun yang berperan memperbesar reach suatu narasi, bisa pro maupun kontra. Deteksi berdasarkan pola perilaku (copy-paste, timing coordination, username pattern) tanpa keyword tertentu.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SentimentPieChart 
              distribution={result.sentiment_distribution} 
              aiReviewedCount={aiReviewedCount}
              pendingAiCount={pendingAiCount}
            />
            <ScoreDistribution comments={result.comments} />
          </div>
          <FlagBreakdown comments={result.comments} />

          {/* Narrative Push Entities */}
          {result.narrative_push && result.narrative_push.length > 0 && (
            <div className="bg-[#1a1a26] border border-[#2a2a3a] rounded-xl p-5 animate-fadeUp">
              <h4 className="text-sm font-semibold mb-1 flex items-center gap-2">
                🔁 Narrative Push Terdeteksi
              </h4>
              <p className="text-[12px] text-[#8888a0] mb-3">
                Entitas berikut disebutkan oleh banyak akun berbeda — indikasi kampanye PR/promosi terkoordinasi.
                <button
                  onClick={() => { setFilter("narrative-push"); setActiveTab("comments"); }}
                  className="ml-2 text-[#a78bfa] underline underline-offset-2 hover:text-[#c4b5fd] transition-colors"
                >
                  Lihat akun →
                </button>
              </p>
              <div className="flex flex-col gap-2">
                {result.narrative_push.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => { setFilter("narrative-push"); setActiveTab("comments"); }}
                    className="flex items-center justify-between text-[13px] bg-[rgba(167,139,250,0.06)] border border-[rgba(167,139,250,0.15)] rounded-lg px-3 py-2 hover:bg-[rgba(167,139,250,0.12)] hover:border-[rgba(167,139,250,0.3)] transition-all text-left w-full"
                  >
                    <span className="font-mono font-semibold text-[#a78bfa]">
                      {item.entity}
                    </span>
                    <span className="text-[#8888a0]">
                      {item.count} akun menyebut ›
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <PatternCards
            comments={result.comments}
            cloneClusters={result.clone_clusters}
            total={result.total}
          />
        </div>
      )}

      {/* Timeline & Cluster Tab */}
      {activeTab === "timeline" && (
        <div className="flex flex-col gap-5">
          {result.timing_buckets && Object.keys(result.timing_buckets).length > 0 && (
            <TimelineChart
              timingBuckets={result.timing_buckets}
              timingSpikes={result.timing_spikes}
            />
          )}

          {/* Clone Clusters */}
          {result.clone_clusters.filter((c) => c.is_clone).length > 0 && (
            <div className="bg-[#1a1a26] border border-[#2a2a3a] rounded-xl p-5 animate-fadeUp">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                📋 Clone Clusters Terdeteksi
              </h4>
              <div className="flex flex-col gap-2">
                {result.clone_clusters
                  .filter((c) => c.is_clone)
                  .slice(0, 5)
                  .map((cluster) => (
                    <div
                      key={cluster.id}
                      className="flex items-start gap-2 text-[13px] bg-[rgba(255,61,90,0.05)] border border-[rgba(255,61,90,0.1)] rounded-lg px-3 py-2"
                    >
                      <span className="text-[#ff3d5a] font-mono font-bold shrink-0">
                        ×{cluster.size}
                      </span>
                      <span className="text-[#8888a0] truncate">
                        &ldquo;{cluster.sample_text || "(komentar kosong/emoji)"}&rdquo;
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Timing Spikes */}
          {result.timing_spikes.length > 0 && (
            <div className="bg-[#1a1a26] border border-[#2a2a3a] rounded-xl p-5 animate-fadeUp">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                ⏱️ Timing Spikes
              </h4>
              <div className="flex flex-col gap-2">
                {result.timing_spikes.slice(0, 5).map((spike, i) => (
                  <div key={i} className="flex items-center gap-3 text-[13px] font-mono">
                    <span className="text-[#ff3d5a] font-bold w-16 shrink-0">{spike.count}x</span>
                    <span className="text-[#6366f1]">{spike.window}</span>
                    <span className="text-[#55556a]">({spike.pct}% dari total)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comments Tab */}
      {activeTab === "comments" && (
        <CommentList
          comments={result.comments}
          filter={filter}
          setFilter={setFilter}
          stats={result.stats}
          total={result.total}
        />
      )}

      <div className="text-center mt-6">
        <button
          onClick={onReset}
          className="bg-[#1a1a26] border border-[#2a2a3a] text-[#8888a0] px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 hover:bg-[#222233] hover:text-[#eeeef0]"
        >
          ← Analisis Post Lain
        </button>
      </div>
    </section>
  );
}
