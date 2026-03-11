"use client";

import { useState, useCallback, useEffect } from "react";
import { User } from "firebase/auth";
import { AnalysisResult, FilterType } from "@/lib/types";
import { AnalysisJob, STATUS_LABELS } from "@/lib/types/analysis-job";
import {
  analyzeComments,
  createAnalysisJob,
  triggerAIReview as triggerAIReviewAPI,
} from "@/services/analysis";
import { getUserCredits } from "@/services/user";
import { useAnalysisJob } from "./useAnalysisJob";

const AI_STEPS = [
  "Mempersiapkan komentar untuk AI review...",
  "Mengirim ke AI service...",
  "AI sedang menganalisis sentimen & validasi...",
  "Memproses hasil AI...",
  "Finalisasi analisis...",
];

interface UseAnalysisOptions {
  onRequireAuth?: () => void;
  onRequireCredit?: () => void;
  isAuthenticated?: boolean;
  user?: User | null;
}

export function useAnalysis(options: UseAnalysisOptions = {}) {
  const { onRequireAuth, onRequireCredit, isAuthenticated = false, user } = options;

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
  const [credits, setCredits] = useState<number | null>(null);

  // Async job tracking
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const { job } = useAnalysisJob(analysisId);
  const [statusMessage, setStatusMessage] = useState<string>("");

  // Load user credits when user changes
  useEffect(() => {
    if (user) {
      loadUserCredits();
    } else {
      setCredits(null);
    }
  }, [user]);

  const loadUserCredits = async () => {
    if (!user) return;
    try {
      const userData = await getUserCredits(user.uid);
      if (userData) {
        setCredits(userData.credits);
      }
    } catch (err) {
      console.error("Error loading credits:", err);
    }
  };

  // React to job status changes from Firestore
  useEffect(() => {
    if (!job) return;

    setStatusMessage(job.statusMessage || STATUS_LABELS[job.status] || "");

    if (job.status === "scraped") {
      // Scraping done — stop spinner, wait for user to trigger analysis
      setIsAnalyzing(false);
    }

    if (job.status === "analyzing") {
      setIsAnalyzing(true);
    }

    if (job.status === "completed" && job.result) {
      setResult(job.result);
      setIsAnalyzing(false);
      setShowResults(true);
      setActiveTab("overview");
      setTimeout(() => setMeterWidth(job.result!.coordination_score), 200);
    }

    if (job.status === "failed") {
      setError(job.error || "Analisis gagal");
      setIsAnalyzing(false);
    }
  }, [job]);

  const startAnalysis = useCallback(async (uploadedComments?: unknown[]) => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setCurrentStep(0);
    setShowResults(false);
    setAnalysisId(null);
    setStatusMessage("Mengirim ke sistem analisis...");

    // ── Upload mode: synchronous (no scraping) ──
    if (uploadedComments && uploadedComments.length > 0) {
      try {
        const data = await analyzeComments({ comments: uploadedComments });
        setResult(data);
        setIsAnalyzing(false);
        setShowResults(true);
        setActiveTab("overview");
        setTimeout(() => setMeterWidth(data.coordination_score), 200);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.");
        setIsAnalyzing(false);
      }
      return;
    }

    // ── URL mode: async (scraping in background) ──
    if (!user) {
      onRequireAuth?.();
      setIsAnalyzing(false);
      return;
    }

    try {
      const idToken = await user.getIdToken();
      const { analysisId: newId } = await createAnalysisJob(url.trim(), idToken);

      // Set analysisId — this triggers useAnalysisJob subscription
      setAnalysisId(newId);
      setStatusMessage("Mengirim ke sistem analisis...");

      // The rest is handled by the useEffect watching `job` changes
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.");
      setIsAnalyzing(false);
    }
  }, [url, isAuthenticated, onRequireAuth, user]);

  // Trigger on-demand analysis for a "scraped" job
  const startAnalysisFromScraped = useCallback(async (targetAnalysisId?: string) => {
    const id = targetAnalysisId || analysisId;
    if (!id || !user) return;

    setError(null);
    setIsAnalyzing(true);
    setStatusMessage("Menjalankan analisis teks & pola akun...");

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/analyze/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ analysisId: id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Analisis gagal (${res.status})`);
      }

      const data = await res.json();
      setResult(data);
      setIsAnalyzing(false);
      setShowResults(true);
      setActiveTab("overview");
      setTimeout(() => setMeterWidth(data.coordination_score), 200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analisis gagal. Coba lagi.");
      setIsAnalyzing(false);
    }
  }, [analysisId, user]);

  // Load a completed analysis from dashboard, or subscribe to an in-progress job
  const loadAnalysis = useCallback((loadedResult: AnalysisResult | null, loadedAnalysisId?: string) => {
    if (loadedAnalysisId) {
      setAnalysisId(loadedAnalysisId);
    }
    if (loadedResult && loadedResult.coordination_score !== undefined) {
      setResult(loadedResult);
      setShowResults(true);
      setIsAnalyzing(false);
      setActiveTab("overview");
      setTimeout(() => setMeterWidth(loadedResult.coordination_score), 200);
    }
    // If no result, job is in-progress — useAnalysisJob subscription handles updates
  }, []);

  // Trigger AI Review - Manual
  const triggerAIReview = useCallback(async () => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }

    if (!user) {
      onRequireAuth?.();
      return;
    }

    if (!result) return;

    if (credits !== null && credits < 1) {
      onRequireCredit?.();
      return;
    }

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
      const idToken = await user.getIdToken();

      const data = await triggerAIReviewAPI(
        {
          comments: result.comments,
          post_url: result.post_url,
          total_comments: result.total,
          clone_clusters: result.stats.clone_clusters || 0,
          timing_spikes: result.timing_spikes.length,
          analysisId: analysisId || undefined,
        },
        idToken
      );

      if (typeof (data as unknown as Record<string, unknown>).remainingCredits === "number") {
        setCredits((data as unknown as Record<string, unknown>).remainingCredits as number);
      }

      setResult(prev => prev ? { ...prev, ...data } : data);
      setIsAiReviewing(false);
    } catch (err) {
      clearInterval(stepInterval);
      const message = err instanceof Error ? err.message : "AI review gagal. Coba lagi.";
      setError(message);
      setIsAiReviewing(false);
      if (message.toLowerCase().includes("kredit") || message.toLowerCase().includes("credit")) {
        onRequireCredit?.();
      }
    }
  }, [result, isAuthenticated, user, credits, analysisId, onRequireAuth, onRequireCredit]);

  const resetAll = useCallback(() => {
    setShowResults(false);
    setResult(null);
    setUrl("");
    setMeterWidth(0);
    setError(null);
    setFilter("all");
    setActiveTab("overview");
    setAnalysisId(null);
    setStatusMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const refreshCredits = useCallback(() => {
    loadUserCredits();
  }, [user]);

  return {
    url, setUrl,
    isAnalyzing,
    isAiReviewing,
    currentStep,
    aiSteps: AI_STEPS,
    showResults,
    result,
    filter, setFilter,
    activeTab, setActiveTab,
    meterWidth,
    error,
    credits,
    // Async job info
    analysisId,
    job,
    statusMessage,
    // Actions
    startAnalysis,
    startAnalysisFromScraped,
    triggerAIReview,
    loadAnalysis,
    resetAll,
    refreshCredits,
  };
}
