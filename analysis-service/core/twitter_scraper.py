"""
X.com (Twitter) reply scraper — same approach as Instagram/TikTok scrapers.
Fetches replies from X.com's internal GraphQL API using session cookies.
Output format is standardized to match Instagram scraper (for analyzer.py).

QueryId may change when X.com updates their frontend. If broken:
  1. Open x.com, view a tweet with replies
  2. DevTools → Network → filter "TweetDetail"
  3. Copy the queryId from the URL path
  4. Set X_QUERY_ID=<new_id> in .env
"""

import asyncio
import json
import logging
import re
from datetime import datetime, timezone
from urllib.parse import quote

import httpx

from config.settings import config

logger = logging.getLogger(__name__)

# X.com web app public bearer token (hardcoded in their JS bundle, same for all users)
X_BEARER_TOKEN = (
    "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs"
    "%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
)
X_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)
MAX_PAGES = 50
PAGE_DELAY_SECONDS = 2
REPLIES_PER_PAGE = 20

# GraphQL features flags — copied from browser DevTools (Network → TweetDetail → features param)
_FEATURES = {
    "rweb_video_screen_enabled": False,
    "profile_label_improvements_pcf_label_in_post_enabled": True,
    "responsive_web_profile_redirect_enabled": False,
    "rweb_tipjar_consumption_enabled": False,
    "verified_phone_label_enabled": False,
    "creator_subscriptions_tweet_preview_api_enabled": True,
    "responsive_web_graphql_timeline_navigation_enabled": True,
    "responsive_web_graphql_skip_user_profile_image_extensions_enabled": False,
    "premium_content_api_read_enabled": False,
    "communities_web_enable_tweet_community_results_fetch": True,
    "c9s_tweet_anatomy_moderator_badge_enabled": True,
    "responsive_web_grok_analyze_button_fetch_trends_enabled": False,
    "responsive_web_grok_analyze_post_followups_enabled": True,
    "responsive_web_jetfuel_frame": True,
    "responsive_web_grok_share_attachment_enabled": True,
    "responsive_web_grok_annotations_enabled": True,
    "articles_preview_enabled": True,
    "responsive_web_edit_tweet_api_enabled": True,
    "graphql_is_translatable_rweb_tweet_is_translatable_enabled": True,
    "view_counts_everywhere_api_enabled": True,
    "longform_notetweets_consumption_enabled": True,
    "responsive_web_twitter_article_tweet_consumption_enabled": True,
    "tweet_awards_web_tipping_enabled": False,
    "content_disclosure_indicator_enabled": True,
    "content_disclosure_ai_generated_indicator_enabled": True,
    "responsive_web_grok_show_grok_translated_post": False,
    "responsive_web_grok_analysis_button_from_backend": True,
    "post_ctas_fetch_enabled": False,
    "freedom_of_speech_not_reach_fetch_enabled": True,
    "standardized_nudges_misinfo": True,
    "tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled": True,
    "longform_notetweets_rich_text_read_enabled": True,
    "longform_notetweets_inline_media_enabled": False,
    "responsive_web_grok_image_annotation_enabled": True,
    "responsive_web_grok_imagine_annotation_enabled": True,
    "responsive_web_grok_community_note_auto_translation_is_enabled": False,
    "responsive_web_enhance_cards_enabled": False,
}

# fieldToggles — also from browser DevTools
_FIELD_TOGGLES = {
    "withArticleRichContentState": True,
    "withArticlePlainText": False,
    "withArticleSummaryText": False,
    "withArticleVoiceOver": False,
    "withGrokAnalyze": False,
    "withDisallowedReplyControls": False,
}


def extract_tweet_id(url: str) -> str:
    """Extract tweet ID from X.com/Twitter URL."""
    match = re.search(r"/status/(\d+)", url)
    if not match:
        raise ValueError(
            f"Invalid X.com URL: {url}. "
            "Expected format: https://x.com/@user/status/TWEET_ID"
        )
    return match.group(1)


def _build_headers(auth_token: str, csrf_token: str, referer: str) -> dict:
    """Build request headers for X.com GraphQL API."""
    return {
        "User-Agent": X_USER_AGENT,
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Authorization": f"Bearer {X_BEARER_TOKEN}",
        "x-csrf-token": csrf_token,
        "x-twitter-active-user": "yes",
        "x-twitter-auth-type": "OAuth2Session",
        "x-twitter-client-language": "en",
        "Cookie": f"auth_token={auth_token}; ct0={csrf_token};",
        "Referer": referer,
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Dest": "empty",
    }


def _parse_tweet_entry(entry: dict, focal_tweet_id: str) -> dict | None:
    """Extract reply data from a GraphQL timeline entry. Returns None if not a valid reply."""
    content = entry.get("content", {})

    # Skip cursor entries
    if content.get("entryType") == "TimelineCursor":
        return None

    item_content = content.get("itemContent", {})
    if item_content.get("itemType") != "TimelineTweet":
        return None

    tweet_result = item_content.get("tweet_results", {}).get("result", {})

    # Handle tombstone (deleted/unavailable tweets)
    if tweet_result.get("__typename") == "TweetTombstone":
        return None

    rest_id = tweet_result.get("rest_id", "")

    # Skip the focal tweet itself
    if rest_id == focal_tweet_id:
        return None

    legacy = tweet_result.get("legacy", {})
    user_legacy = (
        tweet_result.get("core", {})
        .get("user_results", {})
        .get("result", {})
        .get("legacy", {})
    )

    text = legacy.get("full_text", "")
    if not text:
        return None

    created_at = legacy.get("created_at")
    posted_at = None
    if created_at:
        try:
            posted_at = datetime.strptime(
                created_at, "%a %b %d %H:%M:%S +0000 %Y"
            ).replace(tzinfo=timezone.utc).isoformat()
        except ValueError:
            posted_at = created_at

    return {
        "username": user_legacy.get("screen_name", "unknown"),
        "full_name": user_legacy.get("name", ""),
        "is_verified": (
            user_legacy.get("verified", False)
            or tweet_result.get("is_blue_verified", False)
        ),
        "text": text,
        "likes": legacy.get("favorite_count", 0),
        "posted_at": posted_at,
    }


def _format_for_analyzer(tweets: list[dict], post_url: str) -> list[dict]:
    """Format scraped replies into the schema expected by analyzer.py.
    Matches the same output format as Instagram/TikTok scrapers.
    """
    return [
        {
            "no": i + 1,
            "username": t["username"],
            "full_name": t["full_name"],
            "is_verified": t["is_verified"],
            "comment_text": t["text"],
            "likes": t["likes"],
            "is_private": False,  # X.com replies are public
            "replies": [],        # Skip nested replies
            "posted_at": t["posted_at"],
        }
        for i, t in enumerate(tweets)
    ]


async def scrape_twitter_replies(
    url: str,
    on_progress: callable = None,
) -> list[dict]:
    """
    Scrape all replies from an X.com (Twitter) post.

    Args:
        url: X.com tweet URL (e.g. https://x.com/@user/status/123...)
        on_progress: Optional callback(page, total_so_far) for progress updates

    Returns:
        List of reply dicts formatted for analyzer.py
    """
    auth_token = config.X_AUTH_TOKEN
    csrf_token = config.X_CSRF_TOKEN
    query_id = config.X_QUERY_ID

    if not auth_token or not csrf_token:
        raise ValueError(
            "X.com credentials not configured. "
            "Set X_AUTH_TOKEN, X_CSRF_TOKEN in .env"
        )

    tweet_id = extract_tweet_id(url)
    headers = _build_headers(auth_token, csrf_token, url)
    features_str = quote(json.dumps(_FEATURES, separators=(",", ":")))
    field_toggles_str = quote(json.dumps(_FIELD_TOGGLES, separators=(",", ":")))

    logger.info(f"[Twitter Scraper] Starting: tweetId={tweet_id}, queryId={query_id}")

    all_replies: list[dict] = []
    cursor: str | None = None
    page = 0

    async with httpx.AsyncClient(timeout=15.0) as client:
        while page < MAX_PAGES:
            page += 1

            variables = {
                "focalTweetId": tweet_id,
                "referrer": "home",
                "count": REPLIES_PER_PAGE,
                "with_rux_injections": False,
                "rankingMode": "Relevance",
                "includePromotedContent": True,
                "withCommunity": True,
                "withQuickPromoteEligibilityTweetFields": True,
                "withBirdwatchNotes": True,
                "withVoice": True,
            }
            if cursor:
                variables["cursor"] = cursor

            variables_str = quote(json.dumps(variables, separators=(",", ":")))
            api_url = (
                f"https://x.com/i/api/graphql/{query_id}/TweetDetail"
                f"?variables={variables_str}&features={features_str}"
                f"&fieldToggles={field_toggles_str}"
            )

            try:
                resp = await client.get(api_url, headers=headers)
                data = resp.json()
            except Exception as e:
                logger.error(f"[Twitter Scraper] Page {page} fetch error: {e}")
                break

            # Error checks
            if isinstance(data, str) and "<!DOCTYPE" in data:
                raise ValueError("X.com returned HTML — session expired or queryId invalid")

            if "errors" in data:
                err = data["errors"][0].get("message", "Unknown error")
                raise ValueError(f"X.com GraphQL error: {err}")

            # Extract entries from response
            instructions = (
                data.get("data", {})
                .get("threaded_conversation_with_injections_v2", {})
                .get("instructions", [])
            )

            if not instructions:
                logger.warning(f"[Twitter Scraper] No instructions in response — queryId mungkin expired")
                break

            entries = []
            next_cursor = None

            for instruction in instructions:
                if instruction.get("type") == "TimelineAddEntries":
                    entries = instruction.get("entries", [])
                    break

            # Debug logging
            logger.info(
                f"[Twitter Scraper] Page {page}: {len(entries)} entries"
            )

            page_count = 0
            for entry in entries:
                entry_id = entry.get("entryId", "")

                # Extract bottom cursor for next page
                if "cursor-bottom" in entry_id:
                    content = entry.get("content", {})
                    next_cursor = content.get("value")
                    continue

                reply = _parse_tweet_entry(entry, tweet_id)
                if reply:
                    all_replies.append(reply)
                    page_count += 1

            logger.info(
                f"[Twitter Scraper] Page {page}: +{page_count} replies "
                f"(total: {len(all_replies)})"
            )

            if on_progress:
                on_progress(page, len(all_replies))

            if not next_cursor or page_count == 0:
                break

            cursor = next_cursor
            await asyncio.sleep(PAGE_DELAY_SECONDS)

    logger.info(f"[Twitter Scraper] Done: {len(all_replies)} replies from {page} pages")

    if not all_replies:
        raise ValueError(
            "Tidak ada reply yang berhasil di-scrape dari X.com. "
            "Pastikan sesi valid dan post memiliki reply."
        )

    return _format_for_analyzer(all_replies, url)
