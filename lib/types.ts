// ============================================
// TYPES - Buzzer Detector
// ============================================

export type CommentType = "amplifier" | "suspect" | "organic";
export type FilterType = "all" | CommentType | "narrative-push";
export type Sentiment = "pro" | "contra" | "neutral" | "irrelevant";

export interface Comment {
  no: number;
  username: string;
  full_name: string;
  comment_text: string;
  likes: number;
  is_private: boolean;
  is_verified?: boolean;
  posted_at: string;
  replies?: unknown[];
  // Analysis results
  type: CommentType;
  sentiment: Sentiment;
  confidence: number;
  flags: string[];
  pre_flags?: string[];
  reasoning: string | null;
  pre_score: number;
  in_timing_spike: boolean;
  needs_ai?: boolean;
  similarity_cluster_id?: number;
  max_similarity?: number;
}

export interface SentimentDist {
  pro: number;
  contra: number;
  neutral: number;
  irrelevant: number;
}

export interface TimingSpike {
  window: string;
  count: number;
  pct: number;
}

export interface CloneCluster {
  id: number;
  size: number;
  sample_text: string;
  is_clone: boolean;
}

export interface NarrativePushEntity {
  entity: string;
  count: number;
}

export interface AnalysisStats {
  amplifier: number;
  suspect: number;
  organic: number;
  needs_ai: number;
  clone_clusters?: number;
  strong_suspect?: number;
  weak_suspect?: number;
  narrative_push_count?: number;
}

export interface AnalysisResult {
  post_url: string;
  analyzed_at: string;
  coordination_score: number;
  is_coordinated: boolean;
  direction: string;
  summary: string | null;
  sentiment_distribution: SentimentDist;
  clone_clusters: CloneCluster[];
  timing_spikes: TimingSpike[];
  timing_buckets?: Record<string, number>;
  total: number;
  stats: AnalysisStats;
  comments: Comment[];
  narrative_push?: NarrativePushEntity[];
  mode?: string;
  // AI Review status (manual trigger)
  needs_ai_review?: boolean;
  needs_ai_count?: number;
  ai_reviewed?: boolean;
  ai_reviewed_at?: string;
  ai_model?: string;
  processing_time_ms?: number;
}

export interface ThreatConfig {
  color: string;
  bg: string;
  label: string;
  desc: string;
}
