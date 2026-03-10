/**
 * AI Review Endpoint - Manual trigger untuk AI analysis
 * 
 * Flow:
 * 1. Frontend kirim hasil Python analysis (dengan comments yang needs_ai)
 * 2. Endpoint filter komentar yang perlu AI review
 * 3. Kirim ke n8n AI webhook
 * 4. Merge hasil AI dengan hasil Python
 * 5. Return hasil lengkap
 */

import { NextRequest, NextResponse } from "next/server";
import { AIReviewRequest, AIReviewResponse, callN8nAIReview, mergeAIResults } from "../../analyze/route";

const N8N_AI_WEBHOOK_URL = process.env.N8N_AI_WEBHOOK_URL;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      comments, 
      post_url = "unknown", 
      total_comments,
      clone_clusters = 0,
      timing_spikes = 0,
    } = body as {
      comments: Array<Record<string, unknown>>;
      post_url?: string;
      total_comments?: number;
      clone_clusters?: number;
      timing_spikes?: number;
    };

    if (!comments || !Array.isArray(comments) || comments.length === 0) {
      return NextResponse.json(
        { error: "comments array tidak boleh kosong" },
        { status: 400 }
      );
    }

    // Filter hanya komentar yang perlu AI review
    const needsAiComments = comments.filter(c => c.needs_ai === true);
    
    if (needsAiComments.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada komentar yang perlu AI review" },
        { status: 400 }
      );
    }

    if (!N8N_AI_WEBHOOK_URL) {
      return NextResponse.json(
        { error: "N8N_AI_WEBHOOK_URL tidak dikonfigurasi" },
        { status: 500 }
      );
    }

    console.log(`[AI Review] Processing ${needsAiComments.length} comments...`);

    // Build AI review request
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

    // Call n8n AI webhook
    const startTime = Date.now();
    const aiResponse = await callN8nAIReview(aiRequest);
    const elapsed = Date.now() - startTime;

    if (!aiResponse) {
      return NextResponse.json(
        { error: "Gagal mendapatkan response dari AI service" },
        { status: 502 }
      );
    }

    // Build result object untuk merge
    const pythonResult: Record<string, unknown> = {
      comments,
      stats: {
        amplifier: comments.filter(c => c.type === "amplifier").length,
        suspect: comments.filter(c => c.type === "suspect").length,
        organic: comments.filter(c => c.type === "organic").length,
        needs_ai: needsAiComments.length,
        clone_clusters,
      },
    };

    // Merge AI results
    const mergedResult = mergeAIResults(pythonResult, aiResponse);

    console.log(`[AI Review] Completed in ${elapsed}ms — ${aiResponse.ai_results?.length || 0} comments processed`);

    return NextResponse.json({
      ...mergedResult,
      ai_reviewed: true,
      ai_reviewed_at: aiResponse.processed_at || new Date().toISOString(),
      ai_model: aiResponse.ai_model,
      processing_time_ms: elapsed,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/analyze/ai-review]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
