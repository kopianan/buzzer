"""
Firebase Admin SDK utilities for Python analysis service.
Provides Firestore helpers to update analysis job status and store scraped comments.
"""

import logging
import os

import firebase_admin
from firebase_admin import credentials, firestore

logger = logging.getLogger(__name__)

_db = None

ANALYSES_COLLECTION = "analyses"
SCRAPES_COLLECTION = "scrapes"


def init_firebase():
    """Initialize Firebase Admin SDK. Call once at app startup."""
    global _db

    if _db is not None:
        return

    project_id = os.getenv("FIREBASE_PROJECT_ID")
    client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
    private_key = os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n")

    if client_email and private_key and project_id:
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": project_id,
            "client_email": client_email,
            "private_key": private_key,
            "token_uri": "https://oauth2.googleapis.com/token",
        })
        firebase_admin.initialize_app(cred)
        logger.info("[Firebase] Initialized with service account credentials")
    elif project_id:
        firebase_admin.initialize_app(options={"projectId": project_id})
        logger.info("[Firebase] Initialized with ADC")
    else:
        logger.warning("[Firebase] No credentials found — Firestore updates disabled")
        return

    _db = firestore.client()


def get_db():
    """Get Firestore client. Returns None if not initialized."""
    return _db


def save_comments_to_firestore(analysis_id: str, user_id: str, comments: list) -> str:
    """Save scraped comments to Firestore scrapes collection.
    Uses analysis_id as document ID. Returns the scrape_id (same as analysis_id).
    """
    db = get_db()
    if db is None:
        logger.warning(f"[Firebase] Skipping save_comments (no db): {analysis_id}")
        return analysis_id

    db.collection(SCRAPES_COLLECTION).document(analysis_id).set({
        "comments": comments,
        "userId": user_id,
        "totalComments": len(comments),
        "createdAt": firestore.SERVER_TIMESTAMP,
    })
    logger.info(f"[Firebase] Saved {len(comments)} comments to scrapes/{analysis_id}")
    return analysis_id


def complete_scrape(analysis_id: str, scrape_id: str, total_comments: int):
    """Mark scraping as complete. Stores scrape_id reference in Firestore."""
    db = get_db()
    if db is None:
        logger.warning(f"[Firebase] Skipping complete_scrape (no db): {analysis_id}")
        return

    db.collection(ANALYSES_COLLECTION).document(analysis_id).update({
        "status": "scraped",
        "scrapeId": scrape_id,
        "totalComments": total_comments,
        "scrapedAt": firestore.SERVER_TIMESTAMP,
        "updatedAt": firestore.SERVER_TIMESTAMP,
        "statusMessage": f"Berhasil mengambil {total_comments} komentar",
    })
    logger.info(f"[Firebase] Job {analysis_id}: scraped ({total_comments} comments)")


def update_job_status(
    analysis_id: str,
    status: str,
    extra_fields: dict | None = None,
):
    """Update analysis job status in Firestore."""
    db = get_db()
    if db is None:
        logger.warning(f"[Firebase] Skipping update (no db): {analysis_id} -> {status}")
        return

    doc_ref = db.collection(ANALYSES_COLLECTION).document(analysis_id)
    data = {
        "status": status,
        "updatedAt": firestore.SERVER_TIMESTAMP,
    }
    if extra_fields:
        data.update(extra_fields)

    doc_ref.update(data)
    logger.info(f"[Firebase] Job {analysis_id}: status={status}")


def complete_job(analysis_id: str, result: dict):
    """Mark analysis job as completed and store the result."""
    db = get_db()
    if db is None:
        logger.warning(f"[Firebase] Skipping complete (no db): {analysis_id}")
        return

    doc_ref = db.collection(ANALYSES_COLLECTION).document(analysis_id)
    doc_ref.update({
        "status": "completed",
        "result": result,
        "totalComments": result.get("total", 0),
        "coordinationScore": result.get("coordination_score", 0),
        "completedAt": firestore.SERVER_TIMESTAMP,
        "updatedAt": firestore.SERVER_TIMESTAMP,
    })
    logger.info(f"[Firebase] Job {analysis_id}: completed ({result.get('total', 0)} comments)")


def fail_job(analysis_id: str, error_message: str):
    """Mark analysis job as failed."""
    db = get_db()
    if db is None:
        logger.warning(f"[Firebase] Skipping fail (no db): {analysis_id}")
        return

    doc_ref = db.collection(ANALYSES_COLLECTION).document(analysis_id)
    doc_ref.update({
        "status": "failed",
        "error": error_message,
        "updatedAt": firestore.SERVER_TIMESTAMP,
    })
    logger.info(f"[Firebase] Job {analysis_id}: failed — {error_message}")
