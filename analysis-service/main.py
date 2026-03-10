"""
Buzzer Detector - Analysis Service
FastAPI app yang menerima komentar dan return analisis lengkap.
"""

import json
import logging
import os
import time
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from analyzer import analyze
from ai_reviewer import review_ambiguous_comments
from config import config

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="Buzzer Detector Analysis Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    elapsed = round((time.time() - start) * 1000)
    logger.info(f"{request.method} {request.url.path} -> {response.status_code} ({elapsed}ms)")
    return response


# ── Request / Response Models ──────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    comments: list[dict[str, Any]]
    ai_threshold: int = 20
    post_url: str = "sample"


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "buzzer-detector-analysis",
        "version": "2.0.0",
        "ai": config.status(),
    }


@app.post("/analyze")
def analyze_comments(req: AnalyzeRequest):
    if not req.comments:
        raise HTTPException(status_code=400, detail="comments array tidak boleh kosong")

    if len(req.comments) > 5000:
        raise HTTPException(status_code=400, detail="Maksimal 5000 komentar per request")

    logger.info(f"Analyzing {len(req.comments)} comments for: {req.post_url}")
    start = time.time()

    result = analyze(req.comments, ai_threshold=req.ai_threshold, post_url=req.post_url)

    # Hybrid AI: review komentar ambiguous jika AI aktif
    if config.ai_enabled() and result.get("stats", {}).get("needs_ai", 0) > 0:
        result["comments"] = review_ambiguous_comments(result["comments"])

    elapsed = round((time.time() - start) * 1000)
    logger.info(
        f"Done in {elapsed}ms — "
        f"amplifier={result['stats']['amplifier']}, "
        f"suspect={result['stats']['suspect']}, "
        f"organic={result['stats']['organic']}, "
        f"needs_ai={result['stats']['needs_ai']}, "
        f"ai_active={config.ai_enabled()}"
    )

    return result


@app.post("/analyze/sample")
def analyze_sample():
    """Test endpoint: load dari file (1).json di root project"""
    sample_path = os.path.join(os.path.dirname(__file__), "..", "file (1).json")
    try:
        with open(sample_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        comments = data[0]["comments"]
        logger.info(f"Analyzing sample file: {len(comments)} comments")
        result = analyze(comments, ai_threshold=20, post_url="sample")
        return result
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Sample file tidak ditemukan")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
