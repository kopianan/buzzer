import { AnalysisResult } from "../types";

export type AnalysisStatus =
  | "pending"
  | "scraping"
  | "scraped"
  | "analyzing"
  | "completed"
  | "failed";

export interface AnalysisJob {
  id: string;
  userId: string;
  postUrl: string;
  platform: "instagram" | "twitter" | "tiktok" | "unknown";
  status: AnalysisStatus;
  statusMessage?: string;
  progress?: number; // 0-100
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  // Results (populated when status = completed)
  result?: AnalysisResult;
  // Error info (populated when status = failed)
  error?: string;
  // Metadata
  totalComments?: number;
  coordinationScore?: number;
  scrapeId?: string; // Firestore scrapes/{scrapeId} doc ID
  scrapedAt?: Date;
  // AI review
  aiReviewed?: boolean;
  aiReviewedAt?: Date;
}

// Status label mapping for UI
export const STATUS_LABELS: Record<AnalysisStatus, string> = {
  pending: "Mengirim ke sistem analisis...",
  scraping: "Mengambil komentar dari platform...",
  scraped: "Komentar berhasil diambil!",
  analyzing: "Menjalankan analisis teks & pola akun...",
  completed: "Analisis selesai!",
  failed: "Analisis gagal",
};
