/**
 * AI Review Endpoint - Manual trigger dengan autentikasi & credit deduction server-side
 *
 * Flow:
 * 1. Verifikasi Firebase ID token dari header Authorization
 * 2. Cek & kurangi kredit user (via Admin SDK, bypass Firestore rules)
 * 3. Kirim komentar ke n8n AI webhook
 * 4. Merge hasil AI dengan hasil Python
 * 5. Return hasil lengkap + sisa kredit
 */

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin";
import { AIReviewRequest, callN8nAIReview, mergeAIResults } from "../../analyze/route";

const USERS_COLLECTION = "users";
const HISTORY_COLLECTION = "analysis_history";
const TRANSACTIONS_COLLECTION = "credit_transactions";

async function verifyToken(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) throw new Error("Unauthorized: missing token");
  const decoded = await getAdminAuth().verifyIdToken(token);
  return decoded.uid;
}

function detectPlatform(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("instagram.com")) return "instagram";
  // X.com sementara dinonaktifkan
  // if (u.includes("twitter.com") || u.includes("x.com")) return "twitter";
  if (u.includes("tiktok.com")) return "tiktok";
  return "unknown";
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verifikasi token
    const uid = await verifyToken(req);
    const db = getAdminDb();

    // 2. Cek kredit user
    const userRef = db.collection(USERS_COLLECTION).doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentCredits: number = userSnap.data()!.credits || 0;
    if (currentCredits < 1) {
      return NextResponse.json(
        { error: "Kredit tidak cukup", remainingCredits: 0 },
        { status: 402 }
      );
    }

    // 3. Parse body
    const body = await req.json();
    const {
      comments,
      post_url = "unknown",
      total_comments,
      clone_clusters = 0,
      timing_spikes = 0,
      analysisId,
    } = body as {
      comments: Array<Record<string, unknown>>;
      post_url?: string;
      total_comments?: number;
      clone_clusters?: number;
      timing_spikes?: number;
      analysisId?: string;
    };

    if (!comments || !Array.isArray(comments) || comments.length === 0) {
      return NextResponse.json({ error: "comments array tidak boleh kosong" }, { status: 400 });
    }

    if (!process.env.N8N_AI_WEBHOOK_URL) {
      return NextResponse.json({ error: "N8N_AI_WEBHOOK_URL tidak dikonfigurasi" }, { status: 500 });
    }

    // 4. Deduct kredit + catat history & transaksi (server-side, bypass rules)
    const batch = db.batch();

    batch.update(userRef, {
      credits: FieldValue.increment(-1),
      totalAnalyses: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const historyRef = db.collection(HISTORY_COLLECTION).doc();
    batch.set(historyRef, {
      userId: uid,
      postUrl: post_url,
      platform: detectPlatform(post_url),
      totalComments: total_comments || comments.length,
      coordinationScore: 0,
      usedAICredits: true,
      creditsUsed: 1,
      createdAt: FieldValue.serverTimestamp(),
    });

    const txRef = db.collection(TRANSACTIONS_COLLECTION).doc();
    batch.set(txRef, {
      userId: uid,
      type: "usage",
      amount: -1,
      description: `AI Analysis: ${post_url}`,
      balanceAfter: currentCredits - 1,
      createdAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    // 5. Filter komentar yang perlu AI review
    const needsAiComments = comments.filter(c => c.needs_ai === true);
    if (needsAiComments.length === 0) {
      // Kredit sudah dipotong, tapi tidak ada komentar untuk di-review - tetap return sukses
      return NextResponse.json({
        comments,
        ai_reviewed: true,
        remainingCredits: currentCredits - 1,
        message: "Tidak ada komentar yang perlu AI review",
      });
    }

    // 6. Kirim ke AI service
    const aiRequest: AIReviewRequest = {
      comments: needsAiComments.map(c => ({
        no: c.no as number,
        username: c.username as string,
        comment_text: c.comment_text as string,
        pre_score: c.pre_score as number,
        flags: c.flags as string[],
        max_similarity: c.max_similarity as number,
        in_timing_spike: c.in_timing_spike as boolean,
        similarity_cluster_id: c.similarity_cluster_id as number,
      })),
      context: {
        post_url,
        total_comments: total_comments || comments.length,
        clone_clusters,
        timing_spikes,
      },
    };

    const startTime = Date.now();
    const aiResponse = await callN8nAIReview(aiRequest);
    const elapsed = Date.now() - startTime;

    if (!aiResponse) {
      return NextResponse.json({ error: "Gagal mendapatkan response dari AI service" }, { status: 502 });
    }

    // 7. Merge AI results
    // Build base result — use full Firestore result if available to preserve all original fields
    let baseResult: Record<string, unknown> = {
      comments,
      stats: {
        amplifier: comments.filter(c => c.type === "amplifier").length,
        suspect: comments.filter(c => c.type === "suspect").length,
        organic: comments.filter(c => c.type === "organic").length,
        needs_ai: needsAiComments.length,
        clone_clusters,
      },
    };

    if (analysisId) {
      try {
        const existingDoc = await db.collection("analyses").doc(analysisId).get();
        if (existingDoc.exists && existingDoc.data()?.result) {
          // Use full original result as base (preserves total, post_url, coordination_score, timing_spikes, etc.)
          // Replace comments with client-sent version (which may have been updated client-side)
          baseResult = { ...(existingDoc.data()!.result as Record<string, unknown>), comments };
        }
      } catch (e) {
        console.warn("[AI Review] Could not read existing result from Firestore, using partial base:", e);
      }
    }

    const mergedResult = mergeAIResults(baseResult, aiResponse);

    console.log(`[AI Review] uid=${uid} — ${aiResponse.ai_results?.length || 0} comments in ${elapsed}ms`);

    const responseData = {
      ...mergedResult,
      ai_reviewed: true,
      ai_reviewed_at: aiResponse.processed_at || new Date().toISOString(),
      ai_model: aiResponse.ai_model,
      remainingCredits: currentCredits - 1,
      processing_time_ms: elapsed,
    };

    // Update the analyses doc if analysisId is provided
    if (analysisId) {
      try {
        const analysisRef = db.collection("analyses").doc(analysisId);
        await analysisRef.update({
          aiReviewed: true,
          aiReviewedAt: FieldValue.serverTimestamp(),
          result: mergedResult,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (e) {
        console.error("[AI Review] Failed to update analyses doc:", e);
      }
    }

    return NextResponse.json(responseData);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/analyze/ai-review]", message);

    if (message.includes("Unauthorized") || message.includes("token")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
