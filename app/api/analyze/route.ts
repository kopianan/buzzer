import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const N8N_AI_WEBHOOK_URL = process.env.N8N_AI_WEBHOOK_URL;

export interface AIReviewRequest {
  comments: Array<{
    no: number;
    username: string;
    comment_text: string;
    pre_score: number;
    flags: string[];
    max_similarity?: number;
    in_timing_spike?: boolean;
    similarity_cluster_id?: number;
  }>;
  context: {
    post_url: string;
    total_comments: number;
    clone_clusters: number;
    timing_spikes: number;
  };
}

export interface AIReviewResponse {
  ai_results: Array<{
    no: number;
    type: "amplifier" | "suspect" | "organic";
    sentiment: "pro" | "contra" | "neutral" | "irrelevant";
    confidence: number;
    reasoning: string;
  }>;
  ai_model?: string;
  processed_at?: string;
}

async function callPythonService(comments: unknown[], postUrl: string) {
  let res: Response;
  try {
    res = await fetch(`${PYTHON_SERVICE_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comments, post_url: postUrl, ai_threshold: 20 }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new Error(
      `Python analysis service tidak dapat dihubungi di ${PYTHON_SERVICE_URL}. ` +
      `Pastikan service sudah jalan: cd analysis-service && uvicorn main:app --reload`
    );
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Python service error ${res.status}: ${text}`);
  }

  return res.json();
}

// AI Review function - now exported for reuse
export async function callN8nAIReview(request: AIReviewRequest): Promise<AIReviewResponse | null> {
  if (!N8N_AI_WEBHOOK_URL) {
    console.log("[AI] N8N_AI_WEBHOOK_URL not set, skipping AI review");
    return null;
  }

  try {
    console.log(`[AI] Sending ${request.comments.length} comments to n8n for review...`);
    
    const res = await fetch(N8N_AI_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[AI] n8n error: ${res.status}`, errText);
      return null;
    }

    const data = await res.json();
    console.log(`[AI] Received ${data.ai_results?.length || 0} AI-reviewed comments`);
    
    return data;
  } catch (err) {
    console.error("[AI] Error calling n8n:", err);
    return null;
  }
}

// Merge AI results with Python results - exported for reuse
export function mergeAIResults(
  pythonResult: Record<string, unknown>,
  aiResponse: AIReviewResponse | null
): Record<string, unknown> {
  if (!aiResponse || !aiResponse.ai_results || aiResponse.ai_results.length === 0) {
    return pythonResult;
  }

  const comments = pythonResult.comments as Array<Record<string, unknown>>;
  const aiResultsMap = new Map(aiResponse.ai_results.map(r => [r.no, r]));

  const mergedComments = comments.map(c => {
    const aiResult = aiResultsMap.get(c.no as number);
    if (aiResult) {
      return {
        ...c,
        type: aiResult.type,
        sentiment: aiResult.sentiment,
        confidence: aiResult.confidence,
        reasoning: aiResult.reasoning,
        needs_ai: false,
        ai_reviewed: true,
        ai_model: aiResponse.ai_model,
      };
    }
    return c;
  });

  const stats = {
    amplifier: mergedComments.filter((c: Record<string, unknown>) => c.type === "amplifier").length,
    suspect: mergedComments.filter((c: Record<string, unknown>) => c.type === "suspect").length,
    organic: mergedComments.filter((c: Record<string, unknown>) => c.type === "organic").length,
    needs_ai: mergedComments.filter((c: Record<string, unknown>) => c.needs_ai === true).length,
    clone_clusters: (pythonResult.stats as Record<string, number>)?.clone_clusters || 0,
    narrative_push_count: (pythonResult.stats as Record<string, number>)?.narrative_push_count || 0,
  };

  return {
    ...pythonResult,
    comments: mergedComments,
    stats,
    ai_reviewed_at: aiResponse.processed_at,
    ai_model: aiResponse.ai_model,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, comments: uploadedComments } = body as {
      url?: string;
      comments?: unknown[];
    };

    // ── Mode 1: Direct JSON upload ─────────────────────────────────────
    if (uploadedComments && Array.isArray(uploadedComments) && uploadedComments.length > 0) {
      const result = await callPythonService(uploadedComments, "uploaded") as Record<string, unknown>;
      
      // AI Review sekarang manual - tidak otomatis
      // Flag needs_ai_review untuk UI tahu ada komentar yang perlu AI review
      const needsAiCount = (result.comments as Array<Record<string, unknown>>)
        ?.filter(c => c.needs_ai === true).length || 0;
      
      return NextResponse.json({ 
        ...result, 
        mode: "upload",
        needs_ai_review: needsAiCount > 0,
        needs_ai_count: needsAiCount,
      });
    }

    // ── Mode 2: Demo (URL kosong, tidak ada n8n) ───────────────────────
    if (!N8N_WEBHOOK_URL || !url || url.trim() === "") {
      const samplePath = path.join(process.cwd(), "file (1).json");
      const raw = JSON.parse(readFileSync(samplePath, "utf-8"));
      const comments = raw[0].comments;
      
      const result = await callPythonService(comments, "sample") as Record<string, unknown>;
      
      // AI Review sekarang manual - tidak otomatis
      const needsAiCount = (result.comments as Array<Record<string, unknown>>)
        ?.filter(c => c.needs_ai === true).length || 0;
      
      return NextResponse.json({ 
        ...result, 
        mode: "demo",
        needs_ai_review: needsAiCount > 0,
        needs_ai_count: needsAiCount,
      });
    }

    // ── Mode 3: Production via n8n ─────────────────────────────────────
    const n8nRes = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!n8nRes.ok) {
      const errText = await n8nRes.text();
      return NextResponse.json(
        { error: `n8n error: ${n8nRes.status}`, detail: errText },
        { status: 502 }
      );
    }

    const n8nData = await n8nRes.json();
    const rawComments = n8nData.raw_comments || (
      !n8nData.coordination_score ? n8nData.comments : null
    );

    if (rawComments && Array.isArray(rawComments)) {
      const result = await callPythonService(rawComments, url) as Record<string, unknown>;
      
      // AI Review sekarang manual - tidak otomatis
      const needsAiCount = (result.comments as Array<Record<string, unknown>>)
        ?.filter(c => c.needs_ai === true).length || 0;
      
      return NextResponse.json({ 
        ...result, 
        mode: "production",
        needs_ai_review: needsAiCount > 0,
        needs_ai_count: needsAiCount,
      });
    }

    return NextResponse.json({ ...n8nData, mode: "production" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/analyze]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
