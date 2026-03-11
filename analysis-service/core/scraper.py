"""
Instagram comment scraper — ported from N8N workflow.
Fetches comments from Instagram's internal API using session cookies.
"""

import asyncio
import logging
import re
from datetime import datetime, timezone

import httpx

from config.settings import config

logger = logging.getLogger(__name__)

# Instagram internal API constants
IG_APP_ID = "936619743392459"
IG_USER_AGENT = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) "
    "Version/16.6 Mobile/15E148 Safari/604.1"
)
MAX_PAGES = 50
PAGE_DELAY_SECONDS = 3


def shortcode_to_media_id(shortcode: str) -> str:
    """Convert Instagram shortcode to numeric media ID (base64-like)."""
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
    media_id = 0
    for char in shortcode:
        media_id = media_id * 64 + alphabet.index(char)
    return str(media_id)


def extract_shortcode(url: str) -> str:
    """Extract shortcode from Instagram post/reel/tv URL."""
    match = re.search(r"/(?:p|reel|tv)/([A-Za-z0-9_-]+)", url)
    if not match:
        raise ValueError(f"Invalid Instagram URL: {url}")
    return match.group(1)


def _build_headers(shortcode: str, csrftoken: str, cookie: str) -> dict:
    """Build request headers for Instagram API."""
    return {
        "User-Agent": IG_USER_AGENT,
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "X-IG-App-ID": IG_APP_ID,
        "X-IG-WWW-Claim": "0",
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRFToken": csrftoken,
        "Cookie": cookie,
        "Referer": f"https://www.instagram.com/p/{shortcode}/",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Dest": "empty",
    }


def _parse_reply(r: dict) -> dict:
    """Parse a reply/child comment."""
    created_at = r.get("created_at")
    return {
        "id": str(r.get("pk") or r.get("id", "")),
        "username": (r.get("user") or {}).get("username", "unknown"),
        "full_name": (r.get("user") or {}).get("full_name", ""),
        "is_verified": (r.get("user") or {}).get("is_verified", False),
        "is_author": r.get("is_created_by_media_owner", False),
        "text": r.get("text", ""),
        "created_at": created_at,
        "created_at_iso": (
            datetime.fromtimestamp(created_at, tz=timezone.utc).isoformat()
            if created_at
            else None
        ),
        "like_count": r.get("comment_like_count", 0),
    }


def _parse_comment(c: dict) -> dict:
    """Parse a top-level comment from Instagram API response."""
    created_at = c.get("created_at")
    replies = [_parse_reply(r) for r in (c.get("preview_child_comments") or [])]

    return {
        "id": str(c.get("pk") or c.get("id", "")),
        "username": (c.get("user") or {}).get("username", "unknown"),
        "full_name": (c.get("user") or {}).get("full_name", ""),
        "is_verified": (c.get("user") or {}).get("is_verified", False),
        "is_private": (c.get("user") or {}).get("is_private", False),
        "text": c.get("text", ""),
        "created_at": created_at,
        "created_at_iso": (
            datetime.fromtimestamp(created_at, tz=timezone.utc).isoformat()
            if created_at
            else None
        ),
        "like_count": c.get("comment_like_count", 0),
        "child_comment_count": c.get("child_comment_count", 0),
        "preview_child_comments": replies,
    }


def _format_for_analyzer(comments: list[dict], post_url: str) -> list[dict]:
    """Format scraped comments into the schema expected by analyzer.py."""
    return [
        {
            "no": i + 1,
            "username": c["username"],
            "full_name": c["full_name"],
            "is_verified": c["is_verified"],
            "comment_text": c["text"],
            "likes": c["like_count"],
            "is_private": c["is_private"],
            "replies": c["preview_child_comments"],
            "posted_at": c["created_at_iso"],
        }
        for i, c in enumerate(comments)
    ]


async def scrape_instagram_comments(
    url: str,
    on_progress: callable = None,
) -> list[dict]:
    """
    Scrape all comments from an Instagram post.

    Args:
        url: Instagram post URL
        on_progress: Optional callback(page, total_so_far) for progress updates

    Returns:
        List of comment dicts formatted for analyzer.py
    """
    session_id = config.IG_SESSION_ID
    csrf_token = config.IG_CSRF_TOKEN
    ds_user_id = config.IG_DS_USER_ID

    if not session_id or not csrf_token or not ds_user_id:
        raise ValueError(
            "Instagram session credentials not configured. "
            "Set IG_SESSION_ID, IG_CSRF_TOKEN, IG_DS_USER_ID in .env"
        )

    shortcode = extract_shortcode(url)
    media_id = shortcode_to_media_id(shortcode)
    cookie = f"sessionid={session_id}; csrftoken={csrf_token}; ds_user_id={ds_user_id}; ig_nrcb=1;"
    headers = _build_headers(shortcode, csrf_token, cookie)

    logger.info(f"[Scraper] Starting: shortcode={shortcode}, mediaId={media_id}")

    all_comments: list[dict] = []
    next_min_id: str = ""
    page = 0

    async with httpx.AsyncClient(timeout=15.0) as client:
        while page < MAX_PAGES:
            page += 1

            # Build URL with pagination
            api_url = (
                f"https://www.instagram.com/api/v1/media/{media_id}/comments/"
                f"?can_support_threading=true&permalink_enabled=false"
            )
            if next_min_id:
                api_url += f"&min_id={next_min_id}"

            try:
                resp = await client.get(api_url, headers=headers)
                data = resp.json()
            except Exception as e:
                logger.error(f"[Scraper] Page {page} fetch error: {e}")
                break

            # Error checks (from N8N workflow)
            if isinstance(data, str) and "<!DOCTYPE" in data:
                raise ValueError("Instagram returned HTML — session expired")

            if data.get("message") and data.get("status") == "fail":
                raise ValueError(f"Instagram API error: {data['message']}")

            # Debug: log response keys to diagnose empty results
            if isinstance(data, dict):
                logger.info(f"[Scraper] Response keys: {list(data.keys())}, status={data.get('status')}, comments_count={len(data.get('comments') or [])}")
            else:
                logger.warning(f"[Scraper] Unexpected response type: {type(data)}")

            # Parse comments from this page
            page_comments = [_parse_comment(c) for c in (data.get("comments") or [])]
            all_comments.extend(page_comments)

            logger.info(
                f"[Scraper] Page {page}: +{len(page_comments)} comments "
                f"(total: {len(all_comments)})"
            )

            if on_progress:
                on_progress(page, len(all_comments))

            # Check for more pages
            has_more = data.get("has_more_comments") or data.get("has_more_headload_comments", False)
            next_min_id = data.get("next_min_id", "")

            if not has_more or not next_min_id or len(page_comments) == 0:
                break

            # Rate limit delay
            await asyncio.sleep(PAGE_DELAY_SECONDS)

    logger.info(f"[Scraper] Done: {len(all_comments)} comments from {page} pages")

    if not all_comments:
        raise ValueError("Tidak ada komentar yang berhasil di-scrape")

    return _format_for_analyzer(all_comments, url)
