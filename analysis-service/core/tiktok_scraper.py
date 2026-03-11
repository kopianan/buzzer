"""
TikTok comment scraper — ported from n8n workflow.
Fetches comments from TikTok's internal API using session cookies.
Output format is standardized to match Instagram scraper (for analyzer.py).
"""

import asyncio
import logging
import re
from datetime import datetime, timezone

import httpx

from config.settings import config

logger = logging.getLogger(__name__)

# TikTok API constants
TT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)
MAX_PAGES = 50
PAGE_DELAY_SECONDS = 3
COMMENTS_PER_PAGE = 20


def extract_video_id(url: str) -> str:
    """Extract video ID from TikTok URL."""
    match = re.search(r"/video/(\d+)", url)
    if not match:
        raise ValueError(
            f"Invalid TikTok URL: {url}. "
            "Expected format: https://www.tiktok.com/@user/video/VIDEO_ID"
        )
    return match.group(1)


def _build_headers(post_url: str, csrf_token: str, cookie: str) -> dict:
    """Build request headers for TikTok API."""
    return {
        "User-Agent": TT_USER_AGENT,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": post_url,
        "Cookie": cookie,
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Dest": "empty",
        "Sec-Ch-Ua-Platform": '"Windows"',
    }


def _parse_comment(c: dict) -> dict:
    """Parse a comment from TikTok API response."""
    user = c.get("user") or {}
    created_at = c.get("create_time")

    return {
        "id": c.get("cid") or str(c.get("id", "")),
        "username": user.get("unique_id") or user.get("nickname") or "unknown",
        "nickname": user.get("nickname") or "",
        "text": c.get("text", ""),
        "created_at": created_at,
        "created_at_iso": (
            datetime.fromtimestamp(created_at, tz=timezone.utc).isoformat()
            if created_at
            else None
        ),
        "like_count": c.get("digg_count", 0),
        "reply_count": c.get("reply_comment_total", 0),
        "is_pinned": c.get("is_pinned", False),
    }


def _format_for_analyzer(comments: list[dict], post_url: str) -> list[dict]:
    """Format scraped comments into the schema expected by analyzer.py.
    Matches the same output format as Instagram scraper.
    """
    return [
        {
            "no": i + 1,
            "username": c["username"],
            "full_name": c["nickname"],
            "is_verified": False,  # TikTok API does not provide this
            "comment_text": c["text"],
            "likes": c["like_count"],
            "is_private": False,  # TikTok API does not provide this
            "replies": [],  # TikTok only gives reply count, not content
            "posted_at": c["created_at_iso"],
        }
        for i, c in enumerate(comments)
    ]


async def scrape_tiktok_comments(
    url: str,
    on_progress: callable = None,
) -> list[dict]:
    """
    Scrape all comments from a TikTok video.

    Args:
        url: TikTok video URL
        on_progress: Optional callback(page, total_so_far) for progress updates

    Returns:
        List of comment dicts formatted for analyzer.py
    """
    session_id = config.TT_SESSION_ID
    csrf_token = config.TT_CSRF_TOKEN
    ms_token = config.TT_MS_TOKEN

    if not session_id or not csrf_token or not ms_token:
        raise ValueError(
            "TikTok session credentials not configured. "
            "Set TT_SESSION_ID, TT_CSRF_TOKEN, TT_MS_TOKEN in .env"
        )

    video_id = extract_video_id(url)
    cookie = f"sessionid={session_id}; tt_csrf_token={csrf_token}; msToken={ms_token};"
    headers = _build_headers(url, csrf_token, cookie)

    logger.info(f"[TikTok Scraper] Starting: videoId={video_id}")

    all_comments: list[dict] = []
    cursor = 0
    page = 0

    async with httpx.AsyncClient(timeout=15.0) as client:
        while page < MAX_PAGES:
            page += 1

            api_url = (
                f"https://www.tiktok.com/api/comment/list/"
                f"?aid=1988&aweme_id={video_id}&count={COMMENTS_PER_PAGE}&cursor={cursor}"
            )

            try:
                resp = await client.get(api_url, headers=headers)
                data = resp.json()
            except Exception as e:
                logger.error(f"[TikTok Scraper] Page {page} fetch error: {e}")
                break

            # Error checks
            if isinstance(data, str) and "<!DOCTYPE" in data:
                raise ValueError("TikTok returned HTML — session expired")

            if isinstance(data, dict) and data.get("status_code") and data.get("status_code") != 0:
                raise ValueError(
                    "TikTok API error: " + str(data.get('status_msg') or f"status_code: {data.get('status_code')}")
                )

            # Debug logging
            if isinstance(data, dict):
                logger.info(
                    f"[TikTok Scraper] Response keys: {list(data.keys())}, "
                    f"status_code={data.get('status_code')}, "
                    f"comments_count={len(data.get('comments') or [])}"
                )
            else:
                logger.warning(f"[TikTok Scraper] Unexpected response type: {type(data)}")

            # Parse comments from this page
            page_comments = [_parse_comment(c) for c in (data.get("comments") or [])]
            all_comments.extend(page_comments)

            logger.info(
                f"[TikTok Scraper] Page {page}: +{len(page_comments)} comments "
                f"(total: {len(all_comments)})"
            )

            if on_progress:
                on_progress(page, len(all_comments))

            # Check for more pages
            has_more = data.get("has_more") in (1, True)
            cursor = data.get("cursor", 0)

            if not has_more or len(page_comments) == 0:
                break

            # Rate limit delay
            await asyncio.sleep(PAGE_DELAY_SECONDS)

    logger.info(f"[TikTok Scraper] Done: {len(all_comments)} comments from {page} pages")

    if not all_comments:
        raise ValueError("Tidak ada komentar yang berhasil di-scrape dari TikTok")

    return _format_for_analyzer(all_comments, url)
