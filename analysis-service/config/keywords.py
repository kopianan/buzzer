"""
keywords.py — Minimal generic word lists untuk Buzzer Detector.
Hanya untuk filtering kata fungsional, BUKAN untuk sentiment analysis.
"""

# ── Generic Word Filters ───────────────────────────────────────────────────────
# Kata-kata yang tidak pernah menjadi "brand/entitas" yang di-push.
# Ini adalah kata fungsional/sapaan/kata ganti yang sering muncul sebagai
# proper noun palsu dari regex kapitalisasi.

GENERIC_WORD_FILTERS = {
    # Sapaan
    "bang", "bung", "mas", "pak", "ibu", "kak", "bro", "sis",
    "abang", "kakak", "adik", "mbak", "om", "tante",
    # Kata ganti
    "saya", "kami", "kita", "anda", "kamu", "dia", "mereka",
    "beta", "gue", "gw", "lu", "lo", "elu", "ewe", 
    "aku", "kau", "engkau",
    # Kata fungsional Indonesia
    "yang", "dengan", "untuk", "dari", "atau", "pada", "sudah",
    "juga", "hanya", "oleh", "agar", "atas", "bisa", "akan",
    "ada", "ini", "itu", "tapi", "tetapi", "namun", "karena",
    "sebab", "jadi", "maka", "saat", "ketika", "setelah",
    "sebelum", "sedang", "masih", "belum", "tidak",
    "bukan", "tanpa", "hingga", "sampai", "sejak", "selama",
    "dalam", "pada", "ke", "di",
    # Kata umum Inggris
    "this", "that", "just", "with", "from", "have", "been",
    "will", "also", "more", "when", "then", "than", "only",
    "you", "your", "we", "our",
    # Kata sifat umum bukan nama
    "baru", "lama", "besar", "kecil", "baik", "buruk",
    "sama", "beda", "lain", "semua", "banyak", "sedikit",
    "tinggi", "pendek", "panjang",
    # Kata negara/wilayah umum
    "indonesia", "nasional", "regional", "lokal", "negara",
    "kota", "desa", "daerah",
    # Kata organisasi/generik yang sering jadi bagian dari topik
    # (bukan indikasi PR push jika disebut banyak orang)
    "foundation", "yayasan", "pt", "cv", "tbk", "palembang",
    "support", "dukungan", "sponsor", "sponsori", "disponsori",
    "bakti", "peduli", "masyarakat", "masyarakat", "sekolah",
}

# ── Entity Prefixes ────────────────────────────────────────────────────────────
# Prefix yang menandakan sebuah kata adalah nama organisasi/perusahaan.
# Digunakan untuk narrative push detection (generic, tanpa hardcode brand).

ENTITY_PREFIXES = [
    r"pt\s+\w+",           # PT Djarum, PT Semen Indonesia
    r"cv\s+\w+",           # CV Maju
    r"yayasan\s+\w+",      # Yayasan Bakti
    r"koperasi\s+\w+",     # Koperasi Sejahtera
    r"dinas\s+\w+",        # Dinas Pendidikan
    r"badan\s+\w+",        # Badan Nasional
    r"lembaga\s+\w+",      # Lembaga Xyz
    r"foundation\s+\w+",   # Foundation Xyz
    r"institusi\s+\w+",    # Institusi Xyz
]

# ── Promotional Context Words ─────────────────────────────────────────────────
# Kata yang MUNGKIN muncul dalam konteks promosi.
# Hanya digunakan sebagai weak signal, BUKAN untuk sentiment classification.
# Tidak spesifik ke topik apapun.

PROMOTIONAL_CONTEXT_WORDS = {
    # Kualitas (bisa positif atau negatif dalam konteks)
    "terjamin", "terbaik", "unggul", "berkualitas", "berstandar",
    "diakui", "kompeten", "prestasi", "juara", 
    # Skala
    "internasional", "global", "masif", "besar", "andil",
    "kontribusi", "peran", "dukungan",
    # Industri/pendidikan
    "fasilitas", "industri", "vokasi", "skill", "kurikulum",
    # Sponsor
    "disponsori", "didukung", "support", "disupport", "mendukung",
    "mensponsori", "membantu", "berkontribusi",
    # Organisasi
    "foundation", "bakti", "yayasan",
    # Perkembangan
    "maju", "berkembang", "tumbuh", "meningkat", "merata",
}

# ── Critical Context Phrases ──────────────────────────────────────────────────
# Frasa yang menandakan komentar bersifat kritik/questioning.
# Digunakan untuk menghindari false positive narrative push.

CRITICAL_CONTEXT_PHRASES = [
    "tidak disebut", "ga disebut", "gak disebut", "nggak disebut",
    "kenapa tidak", "kenapa ga", "kenapa gak", "kenapa nggak",
    "intervensi", "monopoli", "boikot", "nepotisme",
    "korupsi", "dimanipulasi", "dieksploitasi", "disalahgunakan",
    "bukti", "buktikan", "fakta", "faktanya", "data",
    "penjelasan", "jelaskan", "transparansi", "audit",
]
