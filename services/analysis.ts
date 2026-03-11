/**
 * Analysis API Service
 * Handles all API calls related to comment analysis
 */

import { apiFetch, apiFetchWithTimeout } from "./api";
import { AnalysisResult, Comment } from "@/lib/types";

export interface AnalyzeRequest {
  url?: string;
  comments?: unknown[];
}

export interface AIReviewRequest {
  comments: Comment[];
  post_url: string;
  total_comments: number;
  clone_clusters: number;
  timing_spikes: number;
  analysisId?: string;
}

/**
 * Analyze comments (Python rule-based analysis) — synchronous (upload/demo mode)
 */
export async function analyzeComments(
  request: AnalyzeRequest
): Promise<AnalysisResult> {
  const { data, error } = await apiFetchWithTimeout<AnalysisResult>(
    "/api/analyze",
    {
      method: "POST",
      body: JSON.stringify(request),
    },
    120000 // 2 minutes timeout
  );

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("No data returned from analysis");
  }

  return data;
}

/**
 * Create an async analysis job — returns analysisId immediately.
 * The actual scraping + analysis runs in the background on Python service.
 */
export async function createAnalysisJob(
  url: string,
  idToken: string
): Promise<{ analysisId: string }> {
  const { data, error } = await apiFetch<{ analysisId: string }>(
    "/api/analyze",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify({ url }),
    }
  );

  if (error) {
    throw new Error(error);
  }

  if (!data?.analysisId) {
    throw new Error("No analysisId returned");
  }

  return data;
}

/**
 * Trigger AI review for ambiguous comments
 * idToken: Firebase ID token untuk autentikasi server-side & deduct kredit
 */
export async function triggerAIReview(
  request: AIReviewRequest,
  idToken: string
): Promise<AnalysisResult> {
  const { data, error } = await apiFetchWithTimeout<AnalysisResult>(
    "/api/analyze/ai-review",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify(request),
    },
    180000 // 3 minutes timeout for AI
  );

  if (error) {
    throw new Error(error);
  }

  if (!data) {
    throw new Error("No data returned from AI review");
  }

  return data;
}

/**
 * Health check for Python service
 */
export async function checkPythonHealth(): Promise<{
  status: string;
  ai_enabled: boolean;
} | null> {
  const { data, error } = await apiFetch<{
    status: string;
    ai: { ai_enabled: boolean };
  }>("http://localhost:8000/health");

  if (error || !data) {
    return null;
  }

  return {
    status: data.status,
    ai_enabled: data.ai?.ai_enabled || false,
  };
}
