"""
Background job router — handles async scraping jobs.
Called by Next.js API (fire-and-forget), scrapes comments in background,
saves JSON to Firestore scrapes collection, then updates Firestore status to "scraped".
Analysis is triggered on-demand by the user (not auto-run here).
"""

import logging

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException

from config.settings import config
from core.scraper import scrape_instagram_comments
from core.tiktok_scraper import scrape_tiktok_comments
# X.com sementara dinonaktifkan
# from core.twitter_scraper import scrape_twitter_replies
from models.schemas import JobRequest
from utils.firebase import update_job_status, fail_job, save_comments_to_firestore, complete_scrape

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/job", tags=["job"])


def _verify_internal_key(x_internal_key: str = Header(None)):
    """Verify shared secret from Next.js API."""
    if not config.INTERNAL_API_KEY:
        return  # No key configured — skip validation (dev mode)
    if x_internal_key != config.INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid internal key")


@router.post("/run")
async def run_job(
    req: JobRequest,
    background_tasks: BackgroundTasks,
    x_internal_key: str = Header(None),
):
    """
    Accept a scraping job and process it in the background.
    Returns immediately with 202 Accepted.
    After scraping, result is uploaded to Firebase Storage and status set to "scraped".
    """
    _verify_internal_key(x_internal_key)

    logger.info(f"[Job] Accepted: {req.analysis_id} — {req.post_url} ({req.platform})")

    background_tasks.add_task(
        _scrape_job,
        req.analysis_id,
        req.user_id,
        req.post_url,
        req.platform,
    )

    return {"status": "accepted", "analysis_id": req.analysis_id}


async def _scrape_job(analysis_id: str, user_id: str, post_url: str, platform: str):
    """Background task: scrape comments → upload to Storage → mark as scraped."""
    try:
        # Step 1: Start scraping
        update_job_status(analysis_id, "scraping", {
            "statusMessage": "Mengambil komentar dari platform...",
        })

        if platform == "instagram":
            def on_progress(page: int, total: int):
                update_job_status(analysis_id, "scraping", {
                    "statusMessage": f"Mengambil komentar... (halaman {page}, {total} komentar)",
                    "totalComments": total,
                })

            comments = await scrape_instagram_comments(post_url, on_progress=on_progress)
        elif platform == "tiktok":
            def on_progress(page: int, total: int):
                update_job_status(analysis_id, "scraping", {
                    "statusMessage": f"Mengambil komentar TikTok... (halaman {page}, {total} komentar)",
                    "totalComments": total,
                })

            comments = await scrape_tiktok_comments(post_url, on_progress=on_progress)
        # X.com sementara dinonaktifkan
        # elif platform == "twitter":
        #     def on_progress(page: int, total: int):
        #         update_job_status(analysis_id, "scraping", {
        #             "statusMessage": f"Mengambil reply X.com... ({total} reply)",
        #             "totalComments": total,
        #         })
        #     comments = await scrape_twitter_replies(post_url, on_progress=on_progress)
        else:
            fail_job(analysis_id, f"Platform '{platform}' belum didukung")
            return

        if not comments:
            fail_job(analysis_id, "Tidak ada komentar ditemukan di post ini")
            return

        # Step 2: Save to Firestore scrapes collection
        scrape_id = save_comments_to_firestore(analysis_id, user_id, comments)

        # Step 3: Mark as scraped (ready for analysis)
        complete_scrape(analysis_id, scrape_id, len(comments))

    except ValueError as e:
        logger.error(f"[Job] {analysis_id} ValueError: {e}")
        fail_job(analysis_id, str(e))
    except Exception as e:
        logger.error(f"[Job] {analysis_id} unexpected error: {e}", exc_info=True)
        fail_job(analysis_id, f"Terjadi kesalahan: {str(e)}")
