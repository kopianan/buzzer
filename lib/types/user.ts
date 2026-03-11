export interface UserCredits {
  userId: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  credits: number;
  totalAnalyses: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalysisHistory {
  id: string;
  userId: string;
  postUrl: string;
  platform: 'instagram' | 'twitter' | 'tiktok' | 'unknown';
  totalComments: number;
  coordinationScore: number;
  usedAICredits: boolean;
  creditsUsed: number;
  createdAt: Date;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  type: 'purchase' | 'usage' | 'bonus' | 'refund';
  amount: number;
  description: string;
  balanceAfter: number;
  createdAt: Date;
}
