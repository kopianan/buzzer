/**
 * POST /api/analyze/run
 * On-demand analysis trigger: loads scraped JSON from Firebase Storage,
 * sends to Python analyzer, saves result to Firestore.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

async function verifyToken(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) throw new Error("Unauthorized: missing token");
  const decoded = await getAdminAuth().verifyIdToken(token);
  return decoded.uid;
}

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyToken(req);
    const body = await req.json();
    const { analysisId } = body as { analysisId: string };

    if (!analysisId) {
      return NextResponse.json({ error: "analysisId is required" }, { status: 400 });
    }

    const db = getAdminDb();
    const docRef = db.collection("analyses").doc(analysisId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    const data = doc.data()!;

    // Verify ownership
    if (data.userId !== uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow running analysis when status is "scraped"
    if (data.status !== "scraped") {
      return NextResponse.json(
        { error: `Cannot run analysis: current status is '${data.status}'` },
        { status: 409 }
      );
    }

    const scrapeId: string | undefined = data.scrapeId;
    if (!scrapeId) {
      return NextResponse.json({ error: "No scraped data found for this analysis" }, { status: 400 });
    }

    // Mark as analyzing
    await docRef.update({
      status: "analyzing",
      statusMessage: "Menjalankan analisis teks & pola akun...",
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Load comments from Firestore scrapes collection
    const scrapeDoc = await db.collection("scrapes").doc(scrapeId).get();
    if (!scrapeDoc.exists) {
      await docRef.update({ status: "failed", error: "Data scraping tidak ditemukan", updatedAt: FieldValue.serverTimestamp() });
      return NextResponse.json({ error: "Scrape data not found" }, { status: 404 });
    }
    const comments = scrapeDoc.data()!.comments as unknown[];

    if (!Array.isArray(comments) || comments.length === 0) {
      await docRef.update({
        status: "failed",
        error: "Data komentar kosong atau tidak valid",
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ error: "Empty comments data" }, { status: 422 });
    }

    // Call Python analyzer
    let result: Record<string, unknown>;
    try {
      const res = await fetch(`${PYTHON_SERVICE_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments, post_url: data.postUrl || "scraped", ai_threshold: 20 }),
        signal: AbortSignal.timeout(120_000),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Python service error ${res.status}: ${text}`);
      }

      result = await res.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Python service error";
      await docRef.update({
        status: "failed",
        error: message,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ error: message }, { status: 502 });
    }

    // Save result to Firestore
    await docRef.update({
      status: "completed",
      result,
      coordinationScore: (result.coordination_score as number) || 0,
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      statusMessage: "Analisis selesai!",
    });

    const needsAiCount = (result.comments as Array<Record<string, unknown>>)
      ?.filter(c => c.needs_ai === true).length || 0;

    return NextResponse.json({
      ...result,
      analysisId,
      needs_ai_review: needsAiCount > 0,
      needs_ai_count: needsAiCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/analyze/run]", message);

    if (message.includes("Unauthorized") || message.includes("token")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
