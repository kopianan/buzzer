"""
Detail view: semua komentar yang butuh AI review (score >= 30)
"""

import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from analyzer import analyze

sample_path = os.path.join(os.path.dirname(__file__), "..", "file (1).json")
with open(sample_path, "r", encoding="utf-8") as f:
    raw = json.load(f)

comments = raw[0]["comments"]
result = analyze(comments, ai_threshold=20)

needs_ai = sorted(
    [c for c in result["comments"] if c["needs_ai"]],
    key=lambda x: x["pre_score"],
    reverse=True,
)

print(f"\n{'='*70}")
print(f"  KOMENTAR BUTUH AI REVIEW — {len(needs_ai)} dari {len(comments)} total")
print(f"{'='*70}")

for i, c in enumerate(needs_ai, 1):
    text = c.get("comment_text") or "(kosong)"
    text_preview = text[:80] + ("..." if len(text) > 80 else "")
    flags_str = ", ".join(c["pre_flags"]) if c["pre_flags"] else "—"
    label = "🔴 STRONG" if c["pre_score"] >= 50 else "🟡 WEAK"

    print(f"\n{i:2d}. {label} [{c['pre_score']:3d}] @{c['username']}")
    print(f"    Teks   : {text_preview}")
    print(f"    Flags  : {flags_str}")
    print(f"    Sim    : {c['max_similarity']:.2f}  |  Cluster: {c['similarity_cluster_id']}  |  Spike: {c['in_timing_spike']}")
    print(f"    Likes  : {c.get('likes', 0)}  |  Private: {c.get('is_private', False)}  |  Sentiment: {c['keyword_sentiment']}")

print(f"\n{'='*70}")
print(f"  SEMUA KOMENTAR ORGANIK (score < 30) — {result['stats']['organic']} komentar")
print(f"{'='*70}")
organics = sorted(
    [c for c in result["comments"] if not c["needs_ai"]],
    key=lambda x: x["pre_score"],
    reverse=True,
)
for i, c in enumerate(organics[:15], 1):
    text = (c.get("comment_text") or "(kosong)")[:70]
    print(f"\n{i:2d}. [score {c['pre_score']:2d}] @{c['username']}")
    print(f"    \"{text}\"")
    print(f"    likes: {c.get('likes', 0)}  |  sent: {c['keyword_sentiment']}")

if len(organics) > 15:
    print(f"\n  ... dan {len(organics) - 15} komentar organik lainnya")
