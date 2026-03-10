"use client";

import { useState, useCallback } from "react";
import { AnalysisResult, FilterType } from "@/lib/types";

const STEPS = [
  "Mengirim URL ke sistem analisis...",
  "Mengambil komentar dari platform...",
  "Menjalankan analisis teks & pola akun...",
  "Mendeteksi cluster & koordinasi...",
  "Menyelesaikan laporan...",
];

const AI_STEPS = [
  "Mempersiapkan komentar untuk AI review...",
  "Mengirim ke AI service...",
  "AI sedang menganalisis sentimen & validasi...",
  "Memproses hasil AI...",
  "Finalisasi analisis...",
];

export function useAnalysis() {
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAiReviewing, setIsAiReviewing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "comments">("overview");
  const [meterWidth, setMeterWidth] = useState(0);

  const startAnalysis = useCallback(async (uploadedComments?: unknown[]) => {
    setError(null);
    setIsAnalyzing(true);
    setCurrentStep(0);
    setShowResults(false);

    let step = 0;
    const stepInterval = setInterval(() => {
      if (step < STEPS.length - 1) {
        step++;
        setCurrentStep(step);
      }
    }, 1200);

    try {
      const body = uploadedComments
        ? { comments: uploadedComments }
        : { url: url.trim() };

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      clearInterval(stepInterval);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data: AnalysisResult = await res.json();
      setCurrentStep(STEPS.length - 1);

      setTimeout(() => {
        setResult(data);
        setIsAnalyzing(false);
        setShowResults(true);
        setActiveTab("overview");
        setTimeout(() => setMeterWidth(data.coordination_score), 200);
      }, 400);
    } catch (err) {
      clearInterval(stepInterval);
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.");
      setIsAnalyzing(false);
    }
  }, [url]);

  // Trigger AI Review - Manual
  const triggerAIReview = useCallback(async () => {
    if (!result) return;
    
    setError(null);
    setIsAiReviewing(true);
    setCurrentStep(0);

    let step = 0;
    const stepInterval = setInterval(() => {
      if (step < AI_STEPS.length - 1) {
        step++;
        setCurrentStep(step);
      }
    }, 2000);

    try {
      const res = await fetch("/api/analyze/ai-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comments: result.comments,
          post_url: result.post_url,
          total_comments: result.total,
          clone_clusters: result.stats.clone_clusters || 0,
          timing_spikes: result.timing_spikes.length,
        }),
      });

      clearInterval(stepInterval);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data: AnalysisResult = await res.json();
      
      // Merge AI results dengan result yang ada
      setResult(prev => prev ? { ...prev, ...data } : data);
      setIsAiReviewing(false);
    } catch (err) {
      clearInterval(stepInterval);
      setError(err instanceof Error ? err.message : "AI review gagal. Coba lagi.");
      setIsAiReviewing(false);
    }
  }, [result]);

  const resetAll = useCallback(() => {
    setShowResults(false);
    setResult(null);
    setUrl("");
    setMeterWidth(0);
    setError(null);
    setFilter("all");
    setActiveTab("overview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return {
    url, setUrl,
    isAnalyzing,
    isAiReviewing,
    currentStep,
    steps: STEPS,
    aiSteps: AI_STEPS,
    showResults,
    result,
    filter, setFilter,
    activeTab, setActiveTab,
    meterWidth,
    error,
    startAnalysis,
    triggerAIReview,
    resetAll,
  };
}
