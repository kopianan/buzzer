"use client";

import { useEffect, useState } from "react";
import { AnalysisJob, STATUS_LABELS, AnalysisStatus } from "@/lib/types/analysis-job";

interface Props {
  job: AnalysisJob | null;
  statusMessage: string;
  error?: string | null;
  onStartAnalysis?: () => void;
  isAnalyzing?: boolean;
}

const STATUS_ORDER: AnalysisStatus[] = ["pending", "scraping", "scraped", "analyzing", "completed"];

function getStepIndex(status: AnalysisStatus): number {
  const idx = STATUS_ORDER.indexOf(status);
  return idx >= 0 ? idx : 0;
}

export function JobProgress({ job, statusMessage, error, onStartAnalysis, isAnalyzing }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const activeStatuses: AnalysisStatus[] = ["pending", "scraping", "analyzing"];
    if (!job || !activeStatuses.includes(job.status)) return;

    const start = job.createdAt.getTime();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [job]);

  const currentIdx = job ? getStepIndex(job.status) : 0;

  const steps = [
    { label: STATUS_LABELS.pending, status: "pending" as AnalysisStatus },
    { label: STATUS_LABELS.scraping, status: "scraping" as AnalysisStatus },
    { label: STATUS_LABELS.scraped, status: "scraped" as AnalysisStatus },
    { label: STATUS_LABELS.analyzing, status: "analyzing" as AnalysisStatus },
    { label: STATUS_LABELS.completed, status: "completed" as AnalysisStatus },
  ];

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  if (error || job?.status === "failed") {
    return (
      <section className="text-center py-16">
        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-red-400 text-xl">!</span>
        </div>
        <p className="text-red-400 font-mono text-sm mb-2">Analisis gagal</p>
        <p className="text-[#888] font-mono text-xs max-w-md mx-auto">
          {error || job?.error || "Terjadi kesalahan"}
        </p>
      </section>
    );
  }

  // Scraped state — show success + "Mulai Analisis" button
  if (job?.status === "scraped") {
    return (
      <section className="text-center py-16">
        <div className="w-14 h-14 rounded-full bg-[#00d4aa]/20 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-[#00d4aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <p className="text-[#00d4aa] font-mono text-sm mb-1">Komentar berhasil diambil</p>
        <p className="text-[#8888a0] font-mono text-xs mb-6">
          {job.totalComments?.toLocaleString("id-ID") || 0} komentar siap dianalisis
        </p>

        <button
          onClick={onStartAnalysis}
          disabled={isAnalyzing}
          className="bg-[#ff3d5a] hover:bg-[#e0364f] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-xl transition-all duration-200 text-sm"
        >
          {isAnalyzing ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Memulai analisis...
            </span>
          ) : (
            "Mulai Analisis"
          )}
        </button>
      </section>
    );
  }

  return (
    <section className="text-center py-16">
      <div className="w-12 h-12 border-[3px] border-[#2a2a3a] border-t-[#ff3d5a] rounded-full animate-spin mx-auto mb-5" />

      <ul className="inline-flex flex-col gap-2 text-left mb-4">
        {steps.map((step, i) => (
          <li
            key={step.status}
            className={`font-mono text-[13px] flex items-center gap-2 transition-colors duration-300 ${
              i < currentIdx
                ? "text-[#00d4aa]"
                : i === currentIdx
                ? "text-[#eeeef0]"
                : "text-[#55556a]"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                i < currentIdx
                  ? "bg-[#00d4aa]"
                  : i === currentIdx
                  ? "bg-[#ff3d5a] animate-pulse"
                  : "bg-[#55556a]"
              }`}
            />
            {i === currentIdx && statusMessage ? statusMessage : step.label}
          </li>
        ))}
      </ul>

      {/* Extra info */}
      <div className="flex items-center justify-center gap-4 text-[#55556a] font-mono text-xs">
        {elapsed > 0 && <span>{formatTime(elapsed)}</span>}
        {job?.totalComments && job.totalComments > 0 && (
          <span>{job.totalComments.toLocaleString("id-ID")} komentar</span>
        )}
      </div>
    </section>
  );
}
