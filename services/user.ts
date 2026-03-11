import { db } from "@/lib/firebase/config";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { UserCredits, AnalysisHistory, CreditTransaction } from "@/lib/types/user";

const USERS_COLLECTION = "users";
const HISTORY_COLLECTION = "analysis_history";
const TRANSACTIONS_COLLECTION = "credit_transactions";

// Get or create user credits
export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  if (!db) throw new Error("Firestore not initialized");

  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    return {
      userId: data.userId,
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL,
      credits: data.credits || 0,
      totalAnalyses: data.totalAnalyses || 0,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }

  return null;
}

// Initialize new user with default credits
export async function initializeUser(
  userId: string,
  email: string,
  displayName: string | null,
  photoURL: string | null
): Promise<UserCredits> {
  if (!db) throw new Error("Firestore not initialized");

  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return getUserCredits(userId) as Promise<UserCredits>;
  }

  const newUser: Omit<UserCredits, 'createdAt' | 'updatedAt'> & {
    createdAt: ReturnType<typeof serverTimestamp>;
    updatedAt: ReturnType<typeof serverTimestamp>;
  } = {
    userId,
    email,
    displayName,
    photoURL,
    credits: 5, // Default 5 free credits for new users
    totalAnalyses: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(userRef, newUser);

  return getUserCredits(userId) as Promise<UserCredits>;
}

// Deduct credits for AI analysis
export async function deductCreditsForAnalysis(
  userId: string,
  analysisData: {
    postUrl: string;
    platform: string;
    totalComments: number;
    coordinationScore: number;
  }
): Promise<{ success: boolean; remainingCredits: number; message?: string }> {
  if (!db) throw new Error("Firestore not initialized");

  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return { success: false, remainingCredits: 0, message: "User not found" };
  }

  const userData = userSnap.data();
  const currentCredits = userData.credits || 0;

  if (currentCredits < 1) {
    return { success: false, remainingCredits: 0, message: "Insufficient credits" };
  }

  // Deduct credit
  await updateDoc(userRef, {
    credits: increment(-1),
    totalAnalyses: increment(1),
    updatedAt: serverTimestamp(),
  });

  // Add to analysis history
  const historyRef = collection(db, HISTORY_COLLECTION);
  await addDoc(historyRef, {
    userId,
    postUrl: analysisData.postUrl,
    platform: analysisData.platform,
    totalComments: analysisData.totalComments,
    coordinationScore: analysisData.coordinationScore,
    usedAICredits: true,
    creditsUsed: 1,
    createdAt: serverTimestamp(),
  });

  // Add transaction record
  await addCreditTransaction(
    userId,
    'usage',
    -1,
    `AI Analysis: ${analysisData.postUrl}`,
    currentCredits - 1
  );

  return { success: true, remainingCredits: currentCredits - 1 };
}

// Add credit transaction
async function addCreditTransaction(
  userId: string,
  type: CreditTransaction['type'],
  amount: number,
  description: string,
  balanceAfter: number
): Promise<void> {
  if (!db) return;

  const transactionRef = collection(db, TRANSACTIONS_COLLECTION);
  await addDoc(transactionRef, {
    userId,
    type,
    amount,
    description,
    balanceAfter,
    createdAt: serverTimestamp(),
  });
}

// Get analysis history for user
export async function getUserAnalysisHistory(
  userId: string,
  limitCount: number = 10
): Promise<AnalysisHistory[]> {
  if (!db) throw new Error("Firestore not initialized");

  const historyRef = collection(db, HISTORY_COLLECTION);
  const q = query(
    historyRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      postUrl: data.postUrl,
      platform: data.platform,
      totalComments: data.totalComments,
      coordinationScore: data.coordinationScore,
      usedAICredits: data.usedAICredits,
      creditsUsed: data.creditsUsed,
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  });
}

// Get credit transactions for user
export async function getUserTransactions(
  userId: string,
  limitCount: number = 20
): Promise<CreditTransaction[]> {
  if (!db) throw new Error("Firestore not initialized");

  const transactionsRef = collection(db, TRANSACTIONS_COLLECTION);
  const q = query(
    transactionsRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      balanceAfter: data.balanceAfter,
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  });
}

// Add credits (for purchases or admin adds)
export async function addCredits(
  userId: string,
  amount: number,
  description: string
): Promise<{ success: boolean; newBalance: number }> {
  if (!db) throw new Error("Firestore not initialized");

  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("User not found");
  }

  const userData = userSnap.data();
  const currentCredits = userData.credits || 0;
  const newBalance = currentCredits + amount;

  await updateDoc(userRef, {
    credits: increment(amount),
    updatedAt: serverTimestamp(),
  });

  await addCreditTransaction(
    userId,
    'purchase',
    amount,
    description,
    newBalance
  );

  return { success: true, newBalance };
}
