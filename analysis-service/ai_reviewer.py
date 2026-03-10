"""
Buzzer Detector - Hybrid AI Reviewer (Pattern-Based)
Review komentar suspicious dengan AI, fokus ke deteksi pola perilaku.
Tanpa keyword-based sentiment — AI tentukan sentiment dari konteks natural.
"""

import json
import logging
from typing import Any

from config import config

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Kamu adalah analis media sosial Indonesia yang ahli mendeteksi pola engagement terkoordinasi (amplifier/astroturfing).

## TUGAS UTAMA
Tentukan apakah komentar merupakan:
1. **AMPLIFIER** — Akun terkoordinasi yang memperkuat narasi (juga dikenal sebagai buzzer)
2. **SUSPECT** — Mencurigakan tapi mungkin genuine
3. **ORGANIC** — Engagement genuine dari pengguna real

## CIRI AMPLIFIER (Pola Perilaku)
- **Copy-paste**: Komentar identik atau sangat mirip dengan akun lain
- **Timing coordination**: Muncul bersamaan dalam waktu singkat (terlihat dari flag)
- **Akun terstruktur**: Username generic (user123, nama_456), private, tanpa display name
- **Low quality**: Hanya emoji, mention, atau teks sangat pendek tanpa substansi
- **Mass coordination**: Banyak akun serupa komentar dalam cluster
- **Narrative push**: Menyebut brand/entitas yang sama dengan banyak akun

Note: "Amplifier" adalah istilah netral untuk akun yang memperkuat narasi (buzzer), bisa pro maupun kontra.

## CIRI ORGANIC (Pola Natural)
- Komentar personal dan relevan dengan konteks postingan
- Variasi bahasa natural, tidak template
- Akun aktif dengan profil lengkap dan history
- Interaksi genuine (replies, varied expression)
- Engagement likes yang masuk akal untuk kontennya

## SENTIMENT ANALYSIS
Tentukan sentiment berdasarkan konteks NATURAL komentar:
- **pro** — Mendukung, setuju, positif terhadap subjek postingan
- **contra** — Menolak, kritik, negatif terhadap subjek postingan
- **neutral** — Netral, tanya-tanya, atau tidak clear posisi
- **irrelevant** — Tidak nyambung dengan topik, spam, promo

JANGAN pakai keyword matching untuk sentiment. Baca dan pahami konteks komentar.

## OUTPUT FORMAT
Respons dalam JSON array valid saja:
[{"no": 1, "type": "buzzer|suspect|organic", "sentiment": "pro|contra|neutral|irrelevant", "confidence": 0.0-1.0, "reasoning": "satu kalimat penjelasan"}]"""


def _build_user_prompt(batch: list[dict]) -> str:
    items = []
    for c in batch:
        items.append({
            "no": c.get("no"),
            "username": c.get("username"),
            "comment": c.get("comment_text", ""),
            "likes": c.get("likes", 0),
            "is_private": c.get("is_private", False),
            "is_verified": c.get("is_verified", False),
            "pre_score": c.get("pre_score", 0),
            "flags": c.get("flags", []),
            "max_similarity": c.get("max_similarity", 0),
            "in_timing_spike": c.get("in_timing_spike", False),
            "similarity_cluster_id": c.get("similarity_cluster_id", -1),
        })

    prompt = f"""Analisis {len(items)} komentar berikut yang sudah terdeteksi mencurigakan oleh sistem pattern-based.

**KONTEN KOMENTAR:**
{json.dumps(items, ensure_ascii=False, indent=2)}

**PETUNJUK ANALISIS:**

1. **Perhatikan FLAGS** — Ini adalah pola yang terdeteksi sistem:
   - "clone" / "copy-paste" = Komentar mirip dengan akun lain (sinyal kuat buzzer)
   - "timing-spike" = Muncul bersamaan dengan banyak akun
   - "generic-username" / "batch-account" = Username terstruktur (user123)
   - "emoji-only" / "low-quality" = Konten tanpa nilai
   - "mass-coordination" = Bagian dari cluster besar
   - "narrative-push" = Menyebut entitas yang sama dengan banyak akun

2. **Evaluasi Konteks** — Baca komentar dan tentukan:
   - Apakah ini opini genuine atau template/copy?
   - Apakah akun ini terlihat real atau fake?
   - Sentiment apa yang terkandung dalam komentar?

3. **Classification Rules**:
   - `type: "amplifier"` → Jika ada multiple strong flags (clone + timing + generic username)
   - `type: "suspect"` → Jika ada beberapa flags tapi mungkin genuine
   - `type: "organic"` → Jika flags lemah dan komentar terlihat real

4. **Sentiment Natural** — Jangan tebak dari keyword. Baca dan pahami:
   - Komentar "keren banget" + emoji → pro
   - Komentar "biasa aja sih" → neutral/contra (tergantung konteks)
   - Komentar "kenapa ga disebut X?" → contra/kritik

**OUTPUT (JSON array saja):**
[
  {{"no": 1, "type": "buzzer", "sentiment": "pro", "confidence": 0.85, "reasoning": "Komentar identik dengan 4 akun lain dalam timing spike, username generic"}},
  {{"no": 2, "type": "organic", "sentiment": "neutral", "confidence": 0.75, "reasoning": "Komentar personal dengan variasi bahasa natural"}}
]"""

    return prompt


def _call_claude(batch: list[dict]) -> list[dict] | None:
    """Call Claude API untuk review batch komentar."""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=config.AI_API_KEY)

        response = client.messages.create(
            model=config.AI_MODEL,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": _build_user_prompt(batch)}],
        )

        text = response.content[0].text.strip()
        # Parse JSON dari response
        if text.startswith("["):
            return json.loads(text)
        # Coba extract JSON dari dalam text
        start = text.find("[")
        end = text.rfind("]") + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])
        return None
    except Exception as e:
        logger.warning(f"Claude API error: {e}")
        return None


def _call_openai(batch: list[dict]) -> list[dict] | None:
    """Call OpenAI API untuk review batch komentar."""
    try:
        import httpx
        headers = {
            "Authorization": f"Bearer {config.AI_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": config.AI_MODEL or "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": _build_user_prompt(batch)},
            ],
            "response_format": {"type": "json_object"},
            "max_tokens": 2048,
        }
        with httpx.Client(timeout=30) as client:
            res = client.post("https://api.openai.com/v1/chat/completions",
                              headers=headers, json=payload)
            res.raise_for_status()
            data = res.json()
            text = data["choices"][0]["message"]["content"]
            parsed = json.loads(text)
            # OpenAI dengan response_format json_object mungkin wrap dalam key
            if isinstance(parsed, list):
                return parsed
            for v in parsed.values():
                if isinstance(v, list):
                    return v
            return None
    except Exception as e:
        logger.warning(f"OpenAI API error: {e}")
        return None


def review_ambiguous_comments(scored_comments: list[dict]) -> list[dict]:
    """
    Review komentar suspicious dengan AI.
    Hanya komentar dengan needs_ai=True yang dikirim ke AI.
    Returns updated scored_comments list dengan sentiment dan type dari AI.
    """
    if not config.ai_enabled():
        return scored_comments

    # Filter komentar yang perlu AI review
    ambiguous = [
        (i, c) for i, c in enumerate(scored_comments)
        if c.get("needs_ai", False)
    ]

    if not ambiguous:
        logger.info("No ambiguous comments to review with AI")
        return scored_comments

    # Batasi total komentar yang dikirim ke AI
    ambiguous = ambiguous[:config.AI_MAX_COMMENTS]
    logger.info(f"Sending {len(ambiguous)} ambiguous comments to {config.AI_PROVIDER} AI")

    # Bagi ke batches
    batch_size = config.AI_BATCH_SIZE
    batches = [ambiguous[i:i+batch_size] for i in range(0, len(ambiguous), batch_size)]

    ai_results: dict[int, dict] = {}

    for batch_num, batch in enumerate(batches):
        indices = [item[0] for item in batch]
        comments = [item[1] for item in batch]

        if config.AI_PROVIDER == "claude":
            results = _call_claude(comments)
        elif config.AI_PROVIDER == "openai":
            results = _call_openai(comments)
        else:
            results = None

        if results is None:
            logger.warning(f"Batch {batch_num+1}: AI call failed, keeping rule-based")
            continue

        logger.info(f"Batch {batch_num+1}/{len(batches)}: AI reviewed {len(results)} comments")

        # Map results ke indices asli (match by position, karena no bisa tidak berurutan)
        for pos, ai_result in enumerate(results):
            if pos < len(indices):
                ai_results[indices[pos]] = ai_result

    # Apply AI results ke scored_comments
    updated = list(scored_comments)
    for idx, ai in ai_results.items():
        c = dict(updated[idx])
        ai_type = ai.get("type")
        ai_sentiment = ai.get("sentiment")
        ai_confidence = ai.get("confidence")
        ai_reasoning = ai.get("reasoning")

        # Override type jika AI beda pendapat
        if ai_type in ("amplifier", "suspect", "organic"):
            c["type"] = ai_type
        
        # Override sentiment (AI lebih akurat untuk konteks)
        if ai_sentiment in ("pro", "contra", "neutral", "irrelevant"):
            c["sentiment"] = ai_sentiment
        
        # Update confidence dan reasoning dari AI
        if isinstance(ai_confidence, (int, float)):
            c["confidence"] = round(float(ai_confidence), 2)
        if ai_reasoning:
            c["reasoning"] = ai_reasoning

        updated[idx] = c

    return updated
