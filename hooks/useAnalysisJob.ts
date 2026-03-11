"use client";

import { useState, useEffect, useCallback } from "react";
import { AnalysisJob } from "@/lib/types/analysis-job";
import { subscribeToAnalysis } from "@/services/firestore";

interface UseAnalysisJobReturn {
  job: AnalysisJob | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Subscribe to a single analysis job via Firestore onSnapshot.
 * Returns real-time status updates as the job progresses.
 */
export function useAnalysisJob(analysisId: string | null): UseAnalysisJobReturn {
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!analysisId) {
      setJob(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsub = subscribeToAnalysis(
      analysisId,
      (updatedJob) => {
        setJob(updatedJob);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [analysisId]);

  return { job, isLoading, error };
}
