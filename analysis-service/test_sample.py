"""
Quick simulation test menggunakan file (1).json
Run: python3 test_sample.py
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from analyzer import analyze

# Load sample data
sample_path = os.path.join(os.path.dirname(__file__), "..", "file (1).json")
with open(sample_path, "r", encoding="utf-8") as f:
    raw = json.load(f)

comments = raw[0]["comments"]
print(f"Loaded {len(comments)} komentar\n")

# Run analysis
result = analyze(comments, ai_threshold=20)

# ── Print Summary ──────────────────────────────────────────────────────
stats = result["stats"]
print("=" * 60)
print("HASIL ANALISIS BUZZER DETECTOR")
print("=" * 60)
print(f"Total komentar    : {stats['total']}")
print(f"Butuh AI review   : {stats['needs_ai']} ({round(stats['needs_ai']/stats['total']*100)}%)")
print(f"Strong suspect    : {stats['strong_suspect']} (score ≥ 50)")
print(f"Weak suspect      : {stats['weak_suspect']} (score 30-49)")
print(f"Organic           : {stats['organic']} (score < 30)")
print(f"Clone clusters    : {stats['clone_clusters']}")

# ── Timing Spikes ──────────────────────────────────────────────────────
print("\n── Timing Spikes ──────────────────────────────────────────")
if result["timing_spikes"]:
    for spike in result["timing_spikes"][:5]:
        print(f"  {spike['window']} → {spike['count']} komentar ({spike['pct']}%)")
else:
    print("  Tidak ada spike signifikan")

# ── Clone Clusters ─────────────────────────────────────────────────────
print("\n── Clone Clusters ─────────────────────────────────────────")
clone_clusters = [c for c in result["clusters"] if c["is_clone"]]
if clone_clusters:
    for c in clone_clusters[:5]:
        sample = c["sample_text"][:50] if c["sample_text"] else "(kosong/emoji)"
        print(f"  [{c['size']} akun] \"{sample}\"")
else:
    print("  Tidak ada clone cluster signifikan")

# ── Top 10 Komentar Paling Mencurigakan ───────────────────────────────
print("\n── Top 10 Komentar Paling Mencurigakan ────────────────────")
sorted_comments = sorted(result["comments"], key=lambda x: x["pre_score"], reverse=True)
for c in sorted_comments[:10]:
    text_preview = (c.get("comment_text") or "(kosong)")[:60]
    flags_str = ", ".join(c["pre_flags"]) if c["pre_flags"] else "-"
    print(f"\n  Score {c['pre_score']:3d} | @{c['username']}")
    print(f"  Text : {text_preview}")
    print(f"  Flags: {flags_str}")
    print(f"  Sim  : {c['max_similarity']:.2f} | Spike: {c['in_timing_spike']} | Sent: {c['keyword_sentiment']}")

# ── Sentiment Distribution ─────────────────────────────────────────────
print("\n── Keyword Sentiment Distribution ─────────────────────────")
sent_counts = {"pro": 0, "contra": 0, "neutral": 0, "irrelevant": 0}
for c in result["comments"]:
    s = c["keyword_sentiment"]
    if s in sent_counts:
        sent_counts[s] += 1
total = len(result["comments"])
for sent, count in sent_counts.items():
    pct = round(count / total * 100)
    bar = "█" * (pct // 3)
    print(f"  {sent:12s}: {count:3d} ({pct:3d}%) {bar}")

# ── Komentar yang perlu AI ─────────────────────────────────────────────
print(f"\n── Komentar yang akan dikirim ke AI (score ≥ 30) ─────────")
needs_ai = [c for c in result["comments"] if c["needs_ai"]]
print(f"  Total: {len(needs_ai)} komentar")
print(f"  Estimasi: {len(needs_ai)//15 + 1} API calls (batch 15)")
print(f"  Estimasi cost (GPT-4o-mini): ~${len(needs_ai) * 0.00003:.4f} ({len(needs_ai)//15+1} API calls)")
print(f"  Estimasi cost (Gemini Flash): ~${len(needs_ai) * 0.00001:.4f}")

print("\n" + "=" * 60)
print("Test selesai!")
