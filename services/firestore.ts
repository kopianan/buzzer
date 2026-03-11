import { db } from "@/lib/firebase/config";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  Unsubscribe,
  DocumentData,
} from "firebase/firestore";
import { AnalysisJob, AnalysisStatus } from "@/lib/types/analysis-job";

const ANALYSES_COLLECTION = "analyses";

function docToAnalysisJob(id: string, data: DocumentData): AnalysisJob {
  return {
    id,
    userId: data.userId,
    postUrl: data.postUrl,
    platform: data.platform,
    status: data.status as AnalysisStatus,
    statusMessage: data.statusMessage,
    progress: data.progress,
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
    completedAt: data.completedAt?.toDate?.(),
    result: data.result,
    error: data.error,
    totalComments: data.totalComments,
    coordinationScore: data.coordinationScore,
    aiReviewed: data.aiReviewed,
    aiReviewedAt: data.aiReviewedAt?.toDate?.(),
  };
}

/**
 * Subscribe to a single analysis job for real-time updates.
 */
export function subscribeToAnalysis(
  analysisId: string,
  onUpdate: (job: AnalysisJob) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!db) {
    onError?.(new Error("Firestore not initialized"));
    return () => {};
  }

  const docRef = doc(db, ANALYSES_COLLECTION, analysisId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(docToAnalysisJob(snap.id, snap.data()));
      }
    },
    (err) => onError?.(err)
  );
}

/**
 * Subscribe to all analyses for a user (for dashboard).
 */
export function subscribeToUserAnalyses(
  userId: string,
  onUpdate: (jobs: AnalysisJob[]) => void,
  onError?: (error: Error) => void,
  limitCount: number = 20
): Unsubscribe {
  if (!db) {
    onError?.(new Error("Firestore not initialized"));
    return () => {};
  }

  const q = query(
    collection(db, ANALYSES_COLLECTION),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  return onSnapshot(
    q,
    (snap) => {
      const jobs = snap.docs.map((d) => docToAnalysisJob(d.id, d.data()));
      onUpdate(jobs);
    },
    (err) => onError?.(err)
  );
}
