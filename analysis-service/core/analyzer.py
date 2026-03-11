"""
Buzzer Detector - Pattern-Based Analysis Engine (Keyword-Agnostic)
Menggunakan TF-IDF + DBSCAN + Behavioral Pattern Detection
Tanpa keyword-based sentiment analysis.
"""

import re
import math
import numpy as np
from datetime import datetime, timezone
from collections import defaultdict
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import DBSCAN
from Sastrawi.StopWordRemover.StopWordRemoverFactory import StopWordRemoverFactory
from Sastrawi.Stemmer.StemmerFactory import StemmerFactory

from config.keywords import (
    PROMOTIONAL_CONTEXT_WORDS,
    GENERIC_WORD_FILTERS,
    ENTITY_PREFIXES,
    CRITICAL_CONTEXT_PHRASES,
)

# ── Setup Sastrawi ────────────────────────────────────────────────────────────

_stemmer = StemmerFactory().create_stemmer()
_stop_word_remover = StopWordRemoverFactory().create_stop_word_remover()

EMOJI_RE = re.compile(
    "[\U0001F300-\U0001F5FF"
    "\U0001F600-\U0001F64F"
    "\U0001F680-\U0001F6FF"
    "\U0001F700-\U0001F77F"
    "\U0001F780-\U0001F7FF"
    "\U0001F800-\U0001F8FF"
    "\U0001F900-\U0001F9FF"
    "\U0001FA00-\U0001FA6F"
    "\U0001FA70-\U0001FAFF"
    "\u2600-\u26FF\u2700-\u27BF]+",
    flags=re.UNICODE,
)

MENTION_RE = re.compile(r"@\w+")
HASHTAG_RE = re.compile(r"#\w+")
URL_RE = re.compile(r"https?://\S+")

# Username structural patterns untuk batch account detection
USERNAME_PATTERN_RE = re.compile(r"^([a-zA-Z]+)([_.]?)(\d{2,})$")
USERNAME_WORD_NUM_RE = re.compile(r"^([a-zA-Z]+(?:[_.][a-zA-Z]+)*)([_.]?)(\d{3,})$")

# Compiled regex untuk entity prefix detection (dari keywords.py)
_ENTITY_PREFIX_RE = re.compile(
    r"\b(" + "|".join(ENTITY_PREFIXES) + r")\b",
    re.IGNORECASE
)

# ── Preprocessing ─────────────────────────────────────────────────────────────

def preprocess(text: str) -> str:
    """Lowercase → hapus URL/emoji/mention/hashtag → stem → hapus stopword"""
    if not text:
        return ""
    text = text.lower()
    text = URL_RE.sub(" ", text)
    text = EMOJI_RE.sub(" ", text)
    text = MENTION_RE.sub(" ", text)
    text = HASHTAG_RE.sub(" ", text)
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return ""
    text = _stop_word_remover.remove(text)
    text = _stemmer.stem(text)
    return text


def count_emoji(text: str) -> int:
    return len(EMOJI_RE.findall(text))


def is_only_emoji(text: str) -> bool:
    stripped = EMOJI_RE.sub("", text).strip()
    return len(stripped) == 0 and len(text.strip()) > 0


def is_only_mention(text: str) -> bool:
    stripped = MENTION_RE.sub("", text).strip()
    stripped = re.sub(r"\s+", "", stripped)
    return len(stripped) == 0 and len(text.strip()) > 0


def text_without_noise(text: str) -> str:
    """Teks bersih tanpa emoji/mention/url/hashtag"""
    t = EMOJI_RE.sub("", text)
    t = MENTION_RE.sub("", t)
    t = HASHTAG_RE.sub("", t)
    t = URL_RE.sub("", t)
    return t.strip()


def char_trigrams(text: str) -> set:
    """Character-level trigrams untuk short text similarity"""
    text = text.lower().strip()
    if len(text) < 3:
        return {text} if text else set()
    return {text[i:i+3] for i in range(len(text) - 2)}


def jaccard_similarity(set_a: set, set_b: set) -> float:
    if not set_a and not set_b:
        return 0.0
    intersection = len(set_a & set_b)
    union = len(set_a | set_b)
    return intersection / union if union > 0 else 0.0


# ── Similarity Analysis ───────────────────────────────────────────────────────

def compute_similarity_matrix(texts: list[str]) -> np.ndarray:
    """
    TF-IDF cosine similarity + character trigram Jaccard untuk komentar pendek.
    Komentar kosong setelah preprocessing tidak dibandingkan satu sama lain.
    """
    processed = [preprocess(t) for t in texts]
    n = len(processed)
    sim_matrix = np.zeros((n, n))

    substantive_indices = [i for i, t in enumerate(processed) if t.strip()]

    if len(substantive_indices) < 2:
        return sim_matrix

    substantive_texts = [processed[i] for i in substantive_indices]
    original_texts = [texts[i] for i in substantive_indices]

    # TF-IDF cosine similarity
    try:
        vectorizer = TfidfVectorizer(
            min_df=1,
            max_df=0.95,
            ngram_range=(1, 2),
            sublinear_tf=True,
        )
        tfidf_matrix = vectorizer.fit_transform(substantive_texts)
        sub_sim = cosine_similarity(tfidf_matrix)
        np.fill_diagonal(sub_sim, 0)
    except Exception:
        sub_sim = np.zeros((len(substantive_indices), len(substantive_indices)))

    # Character trigram fallback untuk komentar pendek (< 30 chars)
    trigrams = [char_trigrams(text_without_noise(t)) for t in original_texts]
    for ii in range(len(substantive_indices)):
        for jj in range(len(substantive_indices)):
            if ii == jj:
                continue
            tfidf_score = sub_sim[ii][jj]
            # Jika teks pendek dan TF-IDF rendah, cek trigram
            if len(original_texts[ii]) < 40 and len(original_texts[jj]) < 40 and tfidf_score < 0.4:
                tg_score = jaccard_similarity(trigrams[ii], trigrams[jj])
                # Ambil max dari keduanya
                final_score = max(tfidf_score, tg_score * 0.8)
            else:
                final_score = tfidf_score
            i, j = substantive_indices[ii], substantive_indices[jj]
            sim_matrix[i][j] = final_score

    return sim_matrix


def cluster_similar_comments(sim_matrix: np.ndarray, threshold: float = 0.60) -> list[int]:
    """
    DBSCAN clustering berdasarkan similarity matrix.
    Lebih akurat dari greedy karena handle transitive similarity (A~B, B~C -> satu cluster).
    Returns cluster_id per komentar, -1 = tidak dalam cluster.
    """
    n = len(sim_matrix)
    if n == 0:
        return []

    # Convert similarity ke distance (DBSCAN butuh distance)
    distance_matrix = 1.0 - sim_matrix
    np.fill_diagonal(distance_matrix, 0.0)
    np.clip(distance_matrix, 0, 1, out=distance_matrix)

    # eps = 1 - threshold (jadi eps=0.4 berarti similarity >= 0.6)
    eps = 1.0 - threshold
    db = DBSCAN(eps=eps, min_samples=2, metric="precomputed")
    db.fit(distance_matrix)

    return db.labels_.tolist()  # -1 = noise (tidak di cluster)


# ── Username Pattern Detection ─────────────────────────────────────────────────

def detect_username_patterns(comments: list[dict]) -> set[int]:
    """
    Deteksi batch account: username dengan pola struktural yang sama dan banyak.
    Return set of comment indices yang terindikasi batch account.
    """
    pattern_groups: dict[str, list[int]] = defaultdict(list)

    for i, c in enumerate(comments):
        username = c.get("username", "") or ""
        if not username:
            continue

        # Pattern 1: word + digits (e.g. user123, kopianan456)
        if re.match(r"^[a-zA-Z]{3,}\d{3,}$", username):
            prefix = re.sub(r"\d+$", "", username)
            pattern_groups[f"word_num_{len(prefix)}"].append(i)
            continue

        # Pattern 2: word_word_digits (e.g. budi_santoso_123)
        if USERNAME_WORD_NUM_RE.match(username):
            parts = re.split(r"[_.]", username)
            pattern_key = f"compound_{len(parts)}_parts"
            pattern_groups[pattern_key].append(i)
            continue

        # Pattern 3: random chars + numbers (e.g. xRt49abc12)
        if re.match(r"^[a-zA-Z0-9]{8,}$", username):
            digit_ratio = sum(c.isdigit() for c in username) / len(username)
            if 0.3 <= digit_ratio <= 0.7:
                pattern_groups["mixed_alphanumeric"].append(i)

    batch_indices: set[int] = set()
    # Flag jika pola dipakai oleh >= 5 akun berbeda
    for pattern, indices in pattern_groups.items():
        if len(indices) >= 5:
            for idx in indices:
                batch_indices.add(idx)

    return batch_indices


# ── Topic Saturation Detection ────────────────────────────────────────────────

def detect_topic_saturation(comments: list[dict], threshold_pct: float = 0.15) -> set[str]:
    """
    Kata yang muncul di >threshold_pct komentar = topik post itu sendiri, bukan brand push.
    Menggantikan hardcoded COMMON_TOPIC_WORDS — bekerja untuk topik apapun.

    Contoh: post tentang "kudus" → "kudus" muncul di 60% komentar → topic-saturated.
    Post tentang "pilkada jakarta" → "jakarta", "pilkada" akan tersaturasi.
    """
    total = len(comments)
    if total == 0:
        return set()

    word_comment_count: dict[str, int] = defaultdict(int)
    for c in comments:
        text = (c.get("comment_text", "") or "").lower()
        # Count per-comment (bukan per-kemunculan) agar satu akun tidak inflate count
        words = set(re.findall(r"\b[a-zA-Z]{3,}\b", text))
        for word in words:
            word_comment_count[word] += 1

    saturation_threshold = total * threshold_pct
    return {w for w, cnt in word_comment_count.items() if cnt >= saturation_threshold}


# ── Narrative Push Detection ───────────────────────────────────────────────────

def detect_narrative_push(
    comments: list[dict],
    min_accounts: int = 5,  # Naik dari 3 untuk mengurangi false positive
    min_pct: float = 0.05,  # Naik dari 3% ke 5%
    topic_saturated: set[str] | None = None,
) -> dict:
    """
    Deteksi narrative coordination: banyak akun berbeda menyebut entitas/brand yang sama.
    Contoh: 10 akun berbeda semua mention "Djarum Foundation" positif = PR push.

    Returns:
        {
          "entity_map": {entity: [comment_indices]},    # entitas → komentar yg menyebut
          "push_indices": set[int],                     # index komentar yg kena flag
          "top_entities": [{"entity": str, "count": int}]
        }
    """
    total = len(comments)
    if total == 0:
        return {"entity_map": {}, "push_indices": set(), "top_entities": []}

    threshold_count = max(min_accounts, math.ceil(total * min_pct))

    # Regex untuk proper noun (kata berkapital) dan prefix organisasi
    BRAND_RE = re.compile(r"\b([A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,})*)\b")

    entity_accounts: dict[str, set[str]] = defaultdict(set)
    entity_indices: dict[str, list[int]] = defaultdict(list)

    for i, c in enumerate(comments):
        text = c.get("comment_text", "") or ""
        username = c.get("username", "") or f"_anon_{i}"
        if not text:
            continue

        found_entities: set[str] = set()

        # 1. Proper noun dari huruf kapital ("Djarum Foundation", "PGRI", dll)
        for match in BRAND_RE.finditer(text):
            entity = match.group(1).strip().lower()
            if len(entity) >= 4 and entity not in GENERIC_WORD_FILTERS:
                found_entities.add(entity)
            # NOTE: Tidak lagi split compound entity ke kata individual
            # Ini menyebabkan false positive dimana "Djarum Foundation" 
            # juga menghitung "djarum" sebagai entitas terpisah.
            # Sebagai gantinya, hanya deteksi compound entity lengkap.

        # 2. Entitas dengan prefix organisasi generik (PT, CV, Yayasan, dll)
        #    Ini menangkap brand apapun tanpa perlu hardcode nama brand
        for match in _ENTITY_PREFIX_RE.finditer(text):
            entity = match.group(0).strip().lower()
            found_entities.add(entity)

        for entity in found_entities:
            entity_accounts[entity].add(username)
            entity_indices[entity].append(i)

    push_indices: set[int] = set()
    top_entities: list[dict] = []
    entity_map: dict[str, list[int]] = {}

    # Filter 1: entitas topic-saturated (muncul di >30% komentar = topik post, bukan push)
    # Ini menggantikan COMMON_TOPIC_WORDS yang hardcoded
    saturated = topic_saturated or set()

    # Filter 2: entitas yang disebut hampir semua orang (>35%) = topik saturation fallback
    topic_threshold = total * 0.35

    for entity, accounts in entity_accounts.items():
        count = len(accounts)
        if entity in saturated or count > topic_threshold:
            continue
        if count >= threshold_count:
            indices = entity_indices[entity]
            entity_map[entity] = indices
            top_entities.append({"entity": entity, "count": count})
            for idx in indices:
                push_indices.add(idx)

    top_entities.sort(key=lambda x: x["count"], reverse=True)

    return {
        "entity_map": entity_map,
        "push_indices": push_indices,
        "top_entities": top_entities[:10],  # top 10
    }


# ── Timing Analysis ───────────────────────────────────────────────────────────

def analyze_timing(comments: list[dict], bucket_minutes: int = 10) -> dict:
    """
    Group komentar ke time buckets, deteksi spike.
    Spike = bucket dengan > 5% total komentar.
    """
    total = len(comments)
    buckets: dict[str, list[int]] = defaultdict(list)

    for i, c in enumerate(comments):
        ts_str = c.get("posted_at", "")
        if not ts_str:
            continue
        try:
            ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            minute_bucket = (ts.minute // bucket_minutes) * bucket_minutes
            bucket_key = ts.strftime(f"%Y-%m-%dT%H:") + f"{minute_bucket:02d}"
            buckets[bucket_key].append(i)
        except Exception:
            continue

    spike_threshold = max(3, total * 0.05)
    spikes = []
    comment_in_spike = set()

    for bucket_key, indices in sorted(buckets.items()):
        count = len(indices)
        pct = round(count / total * 100, 1) if total > 0 else 0
        if count >= spike_threshold:
            spikes.append({"window": bucket_key, "count": count, "pct": pct})
            for idx in indices:
                comment_in_spike.add(idx)

    return {
        "spikes": sorted(spikes, key=lambda x: x["count"], reverse=True),
        "comment_in_spike": comment_in_spike,
        "buckets": {k: len(v) for k, v in sorted(buckets.items())},
    }


# ── Per-comment Scoring ───────────────────────────────────────────────────────

def score_comment(
    idx: int,
    comment: dict,
    max_similarity: float,
    cluster_id: int,
    cluster_size: int,
    in_timing_spike: bool,
    in_batch_accounts: bool,
    cluster_lengths: list[int] | None = None,
    in_narrative_push: bool = False,
    likes_mean: float = 0.0,
) -> tuple[int, list[str]]:
    """
    Return (score, flags).
    Score 0-95, flags adalah list string.
    """
    score = 0
    flags = []
    text = comment.get("comment_text", "") or ""
    username = comment.get("username", "") or ""
    full_name = comment.get("full_name", "") or ""
    likes = comment.get("likes", 0) or 0
    is_in_cluster = cluster_id != -1

    # ── Signal 1: Text Similarity ─────────────────────────────
    if max_similarity >= 0.80:
        score += 35
        flags.append("clone")
    elif max_similarity >= 0.60:
        score += 20
        flags.append("copy-paste")

    # Bonus jika dalam cluster besar (≥5 akun)
    if is_in_cluster and cluster_size >= 5:
        score += 10
        flags.append("mass-coordination")

    # ── Signal 2: Timing ──────────────────────────────────────
    if in_timing_spike:
        # Lebih susah kalau juga ada cluster match
        if is_in_cluster:
            score += 20
        else:
            score += 10
        flags.append("timing-spike")

    # ── Signal 3: Account Pattern ─────────────────────────────
    # Verified account = bukan buzzer
    if comment.get("is_verified", False):
        score = max(0, score - 15)
    else:
        if comment.get("is_private", False):
            score += 8
            flags.append("private-account")

        if not full_name.strip():
            score += 5
            flags.append("no-display-name")

        # Username pattern: kata + 3+ digit di akhir
        if re.search(r"[a-zA-Z]{3,}\d{3,}$", username):
            score += 7
            flags.append("generic-username")

        # Batch account detection
        if in_batch_accounts:
            score += 8
            flags.append("batch-account")

    # ── Signal 4: Content Quality ─────────────────────────────
    emoji_count = count_emoji(text)
    clean_text = text_without_noise(text)

    if is_only_emoji(text):
        # Lebih ringan jika tidak di cluster
        score += 12 if not is_in_cluster else 18
        flags.append("emoji-only")
    elif is_only_mention(text):
        score += 15
        flags.append("mention-spam")
    elif len(clean_text) < 5 and len(text.strip()) > 0:
        score += 10
        flags.append("low-quality")

    if emoji_count > 3 and len(text) < 30:
        score += 5
        if "emoji-flood" not in flags:
            flags.append("emoji-flood")

    # ── Signal 5: Comment Length Anomaly ─────────────────────
    if is_in_cluster and cluster_lengths and len(cluster_lengths) >= 3:
        clean_len = len(clean_text)
        mean_len = sum(cluster_lengths) / len(cluster_lengths)
        if mean_len > 0:
            stddev = math.sqrt(sum((l - mean_len) ** 2 for l in cluster_lengths) / len(cluster_lengths))
            # Jika panjang komentar sangat seragam dalam cluster (stddev kecil)
            if stddev < 5 and clean_len > 3:
                score += 5
                flags.append("uniform-length")

    # ── Signal 6: Likes Tiering (smarter) ────────────────────
    # Hanya kurangi score untuk komentar substantif (panjang, genuine discussion)
    # Komentar promosi pendek dengan likes abnormal tinggi = red flag, bukan organic signal
    is_generic_short = len(clean_text) < 40  # komentar pendek/generic
    likes_is_anomaly = likes_mean > 0 and likes > max(80, likes_mean * 8)

    if likes_is_anomaly and is_generic_short:
        # Likes jauh di atas rata-rata tapi teks pendek = boost by buzzer network
        score += 10
        flags.append("likes-anomaly")
    elif not likes_is_anomaly:
        # Organic engagement signal - hanya berlaku untuk komentar non-anomaly
        if likes >= 100:
            score = max(0, score - 15)
        elif likes >= 50:
            score = max(0, score - 10)
        elif likes >= 20:
            score = max(0, score - 5)

    # ── Signal 7: Narrative Push (weak signal only) ──────────
    # Hanya tambah skor jika kombinasi dengan pola lain (bukan standalone)
    if in_narrative_push:
        lower_text = (comment.get("comment_text", "") or "").lower()
        
        # Cek apakah komentar bersifat KRITIK (untuk menghindari false positive)
        is_critical = any(phrase in lower_text for phrase in CRITICAL_CONTEXT_PHRASES)
        
        if not is_critical:
            # Weak signal: hanya tambah kecil jika sudah ada flags lain
            if len(flags) >= 2:
                promo_hits = sum(1 for w in PROMOTIONAL_CONTEXT_WORDS if w in lower_text)
                if promo_hits >= 2:
                    score += 8
                    flags.append("narrative-push")
                elif promo_hits == 1:
                    score += 4
                    flags.append("narrative-push")

    # ── Signal 8: Suspicious Profile Combo ───────────────────
    # no_full_name + private + narrative push = tripwire khusus
    is_anonymous = not full_name.strip()
    is_private = comment.get("is_private", False)
    if is_anonymous and is_private and "narrative-push" in flags:
        score += 8
        flags.append("suspicious-profile")

    # ── Compound Bonus ────────────────────────────────────────
    # Banyak sinyal lemah = lebih mencurigakan
    weak_signal_flags = {"private-account", "no-display-name", "generic-username",
                         "batch-account", "emoji-only", "low-quality", "emoji-flood",
                         "narrative-push"}
    weak_count = sum(1 for f in flags if f in weak_signal_flags)
    if weak_count >= 3:
        score += 5

    return min(score, 95), flags


# ── Build Full Response ───────────────────────────────────────────────────────

def build_full_response(scored_comments: list[dict], clusters: list[dict],
                        timing_spikes: list[dict], timing_buckets: dict,
                        post_url: str = "sample",
                        narrative_data: dict | None = None) -> dict:
    """
    Build response lengkap: coordination_score, direction, stats, dll.
    Logic ini dipindahkan dari route.ts ke sini agar Python jadi source of truth.
    """
    total = len(scored_comments)
    if total == 0:
        return {
            "post_url": post_url,
            "analyzed_at": datetime.now(timezone.utc).isoformat(),
            "coordination_score": 0,
            "is_coordinated": False,
            "direction": "mixed",
            "summary": None,
            "sentiment_distribution": {"pro": 0, "contra": 0, "neutral": 0, "irrelevant": 0},
            "clone_clusters": [],
            "timing_spikes": [],
            "timing_buckets": {},
            "narrative_push": [],
            "total": 0,
            "stats": {"buzzer": 0, "suspect": 0, "organic": 0, "needs_ai": 0},
            "comments": [],
        }

    amplifiers = [c for c in scored_comments if c["type"] == "amplifier"]
    suspects = [c for c in scored_comments if c["type"] == "suspect"]
    organics = [c for c in scored_comments if c["type"] == "organic"]
    needs_ai = [c for c in scored_comments if c.get("needs_ai", False)]

    # Sentiment distribution - default neutral (AI akan override)
    # Pattern-based tidak bisa tentukan sentiment akurat tanpa keyword
    sent_dist = {"pro": 0, "contra": 0, "neutral": total, "irrelevant": 0}

    # Coordination score
    amplifier_pct = round((len(amplifiers) / total) * 100) if total > 0 else 0
    clone_cluster_count = sum(1 for c in clusters if c.get("is_clone"))
    top_spike_count = timing_spikes[0]["count"] if timing_spikes else 0
    suspect_pct = round((len(suspects) / total) * 100) if total > 0 else 0

    # Narrative push contribution
    nd = narrative_data or {}
    narrative_entities = nd.get("top_entities", [])
    # Hitung berapa banyak akun unik yang terlibat dalam narrative push
    max_narrative_accounts = narrative_entities[0]["count"] if narrative_entities else 0
    narrative_pct = round((max_narrative_accounts / total) * 100) if total > 0 else 0

    coord_score = min(
        100,
        round(
            amplifier_pct * 0.6 +
            suspect_pct * 0.2 +
            clone_cluster_count * 2 +
            top_spike_count * 0.5 +
            narrative_pct * 0.4  # kontribusi dari narrative push
        )
    )

    return {
        "post_url": post_url,
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "coordination_score": coord_score,
        "is_coordinated": coord_score >= 35,
        "direction": "mixed",  # AI akan tentukan arah sebenarnya
        "summary": None,  # diisi AI nanti jika aktif
        "sentiment_distribution": sent_dist,
        "clone_clusters": clusters,
        "timing_spikes": timing_spikes,
        "timing_buckets": timing_buckets,
        "narrative_push": narrative_entities,
        "total": total,
        "stats": {
            "amplifier": len(amplifiers),
            "suspect": len(suspects),
            "organic": len(organics),
            "needs_ai": len(needs_ai),
            "clone_clusters": clone_cluster_count,
            "narrative_push_count": len(narrative_entities),
            "strong_suspect": sum(1 for c in scored_comments if c["pre_score"] >= 50),
            "weak_suspect": sum(1 for c in scored_comments if 20 <= c["pre_score"] < 50),
        },
        "comments": scored_comments,
    }


# ── Main Analyze Function ─────────────────────────────────────────────────────

def analyze(comments: list[dict], ai_threshold: int = 20, post_url: str = "sample") -> dict:
    """
    Analisis lengkap untuk array komentar.
    Pattern-based detection tanpa keyword sentiment.
    """
    if not comments:
        return build_full_response([], [], [], {}, post_url)

    n = len(comments)
    texts = [c.get("comment_text", "") or "" for c in comments]

    # 1. Similarity matrix
    sim_matrix = compute_similarity_matrix(texts)
    max_similarities = sim_matrix.max(axis=1).tolist()

    # Adaptive threshold berdasarkan panjang rata-rata komentar
    clean_texts = [text_without_noise(t) for t in texts]
    avg_len = sum(len(t) for t in clean_texts) / max(n, 1)
    sim_threshold = 0.55 if avg_len < 20 else 0.60

    cluster_ids = cluster_similar_comments(sim_matrix, threshold=sim_threshold)

    # Hitung ukuran cluster
    cluster_sizes: dict[int, int] = defaultdict(int)
    for cid in cluster_ids:
        if cid != -1:
            cluster_sizes[cid] += 1

    # Hitung panjang teks per cluster untuk uniform-length detection
    cluster_text_lengths: dict[int, list[int]] = defaultdict(list)
    for i, cid in enumerate(cluster_ids):
        if cid != -1:
            cluster_text_lengths[cid].append(len(text_without_noise(texts[i])))

    # 2. Timing analysis
    timing = analyze_timing(comments)
    comment_in_spike = timing["comment_in_spike"]

    # 3. Username batch detection
    batch_account_indices = detect_username_patterns(comments)

    # 4. Topic saturation + narrative push detection
    topic_saturated = detect_topic_saturation(comments)
    narrative = detect_narrative_push(comments, topic_saturated=topic_saturated)
    narrative_push_indices = narrative["push_indices"]

    # 5. Likes statistics untuk anomaly detection
    all_likes = [c.get("likes", 0) or 0 for c in comments]
    likes_mean = sum(all_likes) / max(len(all_likes), 1)

    # 6. Score per komentar
    scored_comments = []
    for i, comment in enumerate(comments):
        cid = cluster_ids[i]
        csize = cluster_sizes.get(cid, 0) if cid != -1 else 0
        clengths = cluster_text_lengths.get(cid) if cid != -1 else None

        score, flags = score_comment(
            i,
            comment,
            max_similarity=max_similarities[i],
            cluster_id=cid,
            cluster_size=csize,
            in_timing_spike=(i in comment_in_spike),
            in_batch_accounts=(i in batch_account_indices),
            cluster_lengths=clengths,
            in_narrative_push=(i in narrative_push_indices),
            likes_mean=likes_mean,
        )

        # Classification: amplifier >= 50, suspect 20-49, organic < 20
        if score >= 50:
            comment_type = "amplifier"
        elif score >= 20:
            comment_type = "suspect"
        else:
            comment_type = "organic"

        # AI review untuk ambiguous zone (threshold - 60)
        needs_ai = ai_threshold <= score < 60

        scored_comments.append({
            **comment,
            "pre_score": score,
            "pre_flags": flags,
            "needs_ai": needs_ai,
            "similarity_cluster_id": cid,
            "max_similarity": round(float(max_similarities[i]), 3),
            "in_timing_spike": i in comment_in_spike,
            # Sentiment akan ditentukan AI (default neutral)
            "type": comment_type,
            "sentiment": "neutral",  # AI akan override
            "confidence": round(score / 95, 2),
            "flags": flags,
            "reasoning": None,  # diisi AI jika aktif
        })

    # 5. Build cluster summaries
    cluster_map: dict[int, list[str]] = defaultdict(list)
    for i, cid in enumerate(cluster_ids):
        if cid != -1:
            cluster_map[cid].append(texts[i])

    clusters = []
    for cid, ctexts in cluster_map.items():
        size = len(ctexts)
        sample = min(ctexts, key=len)[:80]
        clusters.append({
            "id": cid,
            "size": size,
            "sample_text": sample,
            "is_clone": size >= 3,
        })
    clusters.sort(key=lambda x: x["size"], reverse=True)

    # 8. Build full response
    return build_full_response(
        scored_comments,
        clusters,
        timing["spikes"],
        timing["buckets"],
        post_url,
        narrative_data=narrative,
    )
