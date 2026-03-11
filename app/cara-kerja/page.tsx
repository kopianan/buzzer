"use client";

import { useRouter } from "next/navigation";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-[#eeeef0] mb-4 flex items-center gap-2">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div
      className="bg-[#1a1a26] border border-[#2a2a3a] rounded-xl p-5"
      style={accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : {}}
    >
      {children}
    </div>
  );
}

function Signal({
  icon,
  label,
  score,
  description,
}: {
  icon: string;
  label: string;
  score: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 py-4 border-b border-[#2a2a3a] last:border-0">
      <div className="text-2xl flex-shrink-0 w-8 text-center">{icon}</div>
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <span className="font-semibold text-[#eeeef0] text-sm">{label}</span>
          <span className="text-xs text-[#ff3d5a] font-mono bg-[rgba(255,61,90,0.1)] px-2 py-0.5 rounded">
            {score}
          </span>
        </div>
        <p className="text-[13px] text-[#8888a0] leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function Step({
  num,
  title,
  description,
  tech,
}: {
  num: number;
  title: string;
  description: string;
  tech?: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff3d5a] to-[#ff6b35] flex items-center justify-center text-white font-bold text-sm">
          {num}
        </div>
        {num < 4 && <div className="w-px flex-1 bg-[#2a2a3a] mt-2" />}
      </div>
      <div className="pb-8">
        <p className="font-semibold text-[#eeeef0] text-sm mb-1">{title}</p>
        <p className="text-[13px] text-[#8888a0] leading-relaxed">{description}</p>
        {tech && (
          <code className="mt-2 inline-block text-[11px] text-[#6366f1] bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.2)] px-2 py-1 rounded font-mono">
            {tech}
          </code>
        )}
      </div>
    </div>
  );
}

export default function CaraKerja() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#eeeef0] font-sans">
      {/* Background blur effects */}
      <div className="fixed w-[600px] h-[600px] rounded-full blur-[150px] opacity-[0.06] pointer-events-none z-0 -top-[200px] -left-[100px] bg-[#ff3d5a]" />
      <div className="fixed w-[600px] h-[600px] rounded-full blur-[150px] opacity-[0.06] pointer-events-none z-0 -bottom-[200px] -right-[100px] bg-[#6366f1]" />

      <div className="max-w-[780px] mx-auto px-6 py-10 relative z-10">
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-[#8888a0] hover:text-[#eeeef0] transition-colors text-sm mb-6"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Kembali ke Beranda
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#ff3d5a] to-[#ff6b35] rounded-xl flex items-center justify-center text-lg shadow-lg shadow-[rgba(255,61,90,0.3)]">
              📡
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Cara Kerja <span className="text-[#ff3d5a]">AmplifierScope</span>
            </h1>
          </div>
          <p className="text-[#8888a0] text-[15px] leading-relaxed max-w-[600px]">
            Penjelasan teknis (high-level) tentang bagaimana sistem ini mendeteksi pola koordinasi
            di kolom komentar media sosial.
          </p>
        </div>

        {/* Disclaimer Banner */}
        <div className="mb-10 p-5 bg-[rgba(255,200,0,0.05)] border border-[rgba(255,200,0,0.2)] rounded-xl flex gap-3">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div>
            <p className="font-semibold text-[#ffcc00] text-sm mb-1">Disclaimer Penting</p>
            <p className="text-[13px] text-[#8888a0] leading-relaxed">
              AmplifierScope adalah alat analisis berbasis <strong className="text-[#eeeef0]">pola statistik</strong>, bukan penghakiman.
              Hasil deteksi bisa mengandung <strong className="text-[#eeeef0]">false positive</strong> — akun organik yang kebetulan
              berkomentar bersamaan bisa terdeteksi sebagai koordinasi. Gunakan hasil ini sebagai
              referensi awal, bukan kesimpulan final. Kami tidak mengklaim akurasi 100%.
            </p>
          </div>
        </div>

        {/* Section 1: Flow */}
        <Section title="① Alur Sistem">
          <div className="bg-[#1a1a26] border border-[#2a2a3a] rounded-xl p-6">
            <Step
              num={1}
              title="User paste URL post Instagram atau TikTok"
              description="Sistem mendeteksi platform dari URL, lalu membuat analysis job di database (Firestore). User bisa pantau progres secara real-time."
            />
            <Step
              num={2}
              title="Scraper mengambil komentar"
              description="Scraper Python menggunakan cookie sesi (auth_token) untuk memanggil API internal Instagram/TikTok — cara yang sama dengan yang dilakukan browser kamu. Komentar dikumpulkan dengan pagination hingga selesai."
              tech="httpx · cookie-based auth · pagination cursor"
            />
            <Step
              num={3}
              title="Analysis Engine menganalisis pola"
              description="Setiap komentar dianalisis secara independen dan dibandingkan satu sama lain menggunakan 8 sinyal. Hasilnya adalah skor 0–95 per komentar beserta label (Amplifier / Suspect / Organik)."
              tech="TF-IDF · DBSCAN · scikit-learn · Sastrawi"
            />
            <Step
              num={4}
              title="(Opsional) AI Review untuk grey zone"
              description="Komentar yang skornya ambigu (zona abu-abu) dikirim ke AI untuk validasi lebih dalam. AI menentukan sentimen (pro/kontra/netral) dan memberikan reasoning berbahasa Indonesia."
              tech="Claude AI · sentiment analysis · reasoning"
            />
          </div>
        </Section>

        {/* Section 2: 8 Signals */}
        <Section title="② Sinyal Deteksi (8 Sinyal)">
          <p className="text-[13px] text-[#8888a0] mb-4 leading-relaxed">
            Setiap komentar diberi skor berdasarkan kombinasi sinyal di bawah ini. Satu sinyal saja
            tidak cukup untuk diklasifikasi sebagai amplifier — sistem mencari <strong className="text-[#eeeef0]">kombinasi pola</strong>.
          </p>
          <Card>
            <Signal
              icon="📋"
              label="Kemiripan Teks (Text Similarity)"
              score="+20 s/d +35 poin"
              description="Komentar dibandingkan satu sama lain menggunakan TF-IDF cosine similarity dan character trigram. Komentar yang mirip ≥80% satu sama lain dianggap 'clone' (copy-paste). Komentar yang mirip dikumpulkan ke dalam cluster menggunakan DBSCAN — sehingga jika A mirip B dan B mirip C, ketiganya masuk cluster yang sama."
            />
            <Signal
              icon="⏰"
              label="Timing Spike"
              score="+10 s/d +20 poin"
              description="Komentar dikelompokkan per window 10 menit. Jika suatu window mengandung >5% dari total komentar, itu dianggap spike. Komentar yang muncul bersamaan dalam spike, terutama jika juga masuk cluster kemiripan, mendapat skor lebih tinggi."
            />
            <Signal
              icon="👤"
              label="Pola Username"
              score="+7 s/d +8 poin"
              description="Username dengan format struktural seperti 'nama123', 'user_456', atau campuran huruf-angka acak yang banyak sekaligus (≥5 akun pola sama) dianggap batch account. Ini sinyal bahwa akun dibuat secara massal."
            />
            <Signal
              icon="📝"
              label="Kualitas Konten"
              score="+10 s/d +18 poin"
              description="Komentar yang hanya emoji, hanya mention (@user @user @user), atau terlalu pendek (<5 karakter setelah dibersihkan) mendapat skor lebih tinggi. Komentar berkualitas rendah yang juga berada dalam cluster kemiripan dianggap lebih mencurigakan."
            />
            <Signal
              icon="📢"
              label="Narrative Push"
              score="+4 s/d +8 poin (lemah)"
              description="Ketika banyak akun berbeda (≥5 akun, ≥5% total) menyebut entitas atau brand yang sama secara positif, ini bisa mengindikasikan kampanye PR terkoordinasi. Namun sinyal ini hanya aktif jika dikombinasikan dengan sinyal lain — standalone tidak cukup untuk flag."
            />
            <Signal
              icon="🔒"
              label="Profil Akun"
              score="+5 s/d +8 poin"
              description="Akun privat tanpa display name mendapat skor tambahan kecil. Sebaliknya, akun terverifikasi (centang biru) mendapat pengurangan -15 poin karena lebih sulit untuk akun palsu mendapatkan verifikasi."
            />
            <Signal
              icon="❤️"
              label="Likes Anomaly"
              score="+10 poin (atau -5 s/d -15 pengurang)"
              description="Likes banyak pada komentar panjang dan substantif adalah sinyal organik (pengurangan skor). Tapi likes sangat tinggi pada komentar pendek/generic (>8x rata-rata) justru mencurigakan — bisa jadi di-boost oleh jaringan yang sama."
            />
            <Signal
              icon="🔗"
              label="Compound Bonus"
              score="+5 poin"
              description="Jika sebuah komentar memiliki ≥3 sinyal lemah secara bersamaan (privat + no display name + username generic + dll), ada bonus tambahan kecil. Filosofinya: banyak tanda-tanda kecil yang muncul bersamaan lebih mencurigakan dari satu tanda besar."
            />
          </Card>
        </Section>

        {/* Section 3: Classification */}
        <Section title="③ Klasifikasi Komentar">
          <div className="grid gap-3">
            <div className="flex gap-4 items-start bg-[#1a1a26] border border-[rgba(255,61,90,0.3)] rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg bg-[rgba(255,61,90,0.15)] flex items-center justify-center text-sm font-bold text-[#ff3d5a] flex-shrink-0">
                A
              </div>
              <div>
                <p className="font-semibold text-[#ff3d5a] text-sm mb-1">Amplifier — Skor ≥ 50</p>
                <p className="text-[13px] text-[#8888a0] leading-relaxed">
                  Pola koordinasi kuat. Banyak sinyal muncul bersamaan. Termasuk komentar clone,
                  timing spike + cluster, atau kombinasi profil mencurigakan. Bukan berarti pasti
                  buzzer — bisa juga fans yang kompak atau bot promosi brand.
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-start bg-[#1a1a26] border border-[rgba(255,180,0,0.3)] rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg bg-[rgba(255,180,0,0.1)] flex items-center justify-center text-sm font-bold text-[#ffb400] flex-shrink-0">
                S
              </div>
              <div>
                <p className="font-semibold text-[#ffb400] text-sm mb-1">Suspect — Skor 20–49</p>
                <p className="text-[13px] text-[#8888a0] leading-relaxed">
                  Ada sinyal mencurigakan tapi tidak cukup kuat untuk diklasifikasi sebagai
                  amplifier. Komentar di zona ini yang skornya ambigu dikirim ke AI untuk evaluasi
                  lebih lanjut (jika AI Review diaktifkan).
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-start bg-[#1a1a26] border border-[rgba(100,200,100,0.3)] rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg bg-[rgba(100,200,100,0.1)] flex items-center justify-center text-sm font-bold text-[#64c864] flex-shrink-0">
                O
              </div>
              <div>
                <p className="font-semibold text-[#64c864] text-sm mb-1">Organik — Skor &lt; 20</p>
                <p className="text-[13px] text-[#8888a0] leading-relaxed">
                  Tidak ada pola koordinasi yang terdeteksi. Komentar terlihat natural dan
                  independen satu sama lain. Ini bukan jaminan 100% organik — hanya berarti tidak
                  ada sinyal yang tertangkap.
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* Section 4: Coordination Score */}
        <Section title="④ Coordination Score (0–100)">
          <Card>
            <p className="text-[13px] text-[#8888a0] leading-relaxed mb-4">
              Skor koordinasi keseluruhan dihitung dari agregasi beberapa faktor:
            </p>
            <div className="space-y-2 font-mono text-[12px]">
              <div className="flex justify-between items-center py-2 border-b border-[#2a2a3a]">
                <span className="text-[#8888a0]">% komentar Amplifier</span>
                <span className="text-[#ff3d5a]">bobot 60%</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#2a2a3a]">
                <span className="text-[#8888a0]">% komentar Suspect</span>
                <span className="text-[#ff3d5a]">bobot 20%</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#2a2a3a]">
                <span className="text-[#8888a0]">Jumlah clone cluster × 2</span>
                <span className="text-[#ff3d5a]">poin langsung</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#2a2a3a]">
                <span className="text-[#8888a0]">Spike terbesar × 0.5</span>
                <span className="text-[#ff3d5a]">poin langsung</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[#8888a0]">% narrative push</span>
                <span className="text-[#ff3d5a]">bobot 40%</span>
              </div>
            </div>
            <p className="text-[12px] text-[#55556a] mt-4">
              Skor ≥ 35 dianggap terkoordinasi. Skor ini bukan persentase akurasi — ini ukuran
              intensitas sinyal koordinasi yang terdeteksi.
            </p>
          </Card>
        </Section>

        {/* Section 5: Keterbatasan */}
        <Section title="⑤ Keterbatasan yang Perlu Diketahui">
          <div className="space-y-3">
            {[
              {
                icon: "🎭",
                title: "Fans kompak ≠ buzzer",
                desc: "Jika ribuan fans berkomentar hampir bersamaan dengan kalimat mirip (misal karena repost di grup), sistem bisa salah flag mereka sebagai amplifier. Konteks naratif konten tidak dianalisis.",
              },
              {
                icon: "🔄",
                title: "Template komentar umum",
                desc: 'Komentar singkat seperti "keren!", "mantap!", "setuju!" yang banyak dipakai berbeda orang bisa membentuk cluster kemiripan meski berasal dari akun yang tidak berkoordinasi.',
              },
              {
                icon: "🌐",
                title: "Keterbatasan scraping",
                desc: "Platform seperti Instagram dan TikTok membatasi jumlah komentar yang bisa diambil. Komentar lama atau dari post viral besar mungkin tidak terambil semua, sehingga sampling bisa bias.",
              },
              {
                icon: "😶",
                title: "Sentimen tidak dianalisis secara pattern-based",
                desc: "Tanpa AI Review, sistem tidak tahu apakah komentar pro atau kontra — hanya bisa mendeteksi pola koordinasi. AI Review menambahkan analisis sentimen tapi tetap bisa salah untuk bahasa gaul/sarkasme.",
              },
              {
                icon: "🔐",
                title: "Akun privat bukan otomatis mencurigakan",
                desc: 'Banyak orang memilih akun privat karena privasi, bukan karena bot. "Private account" hanya memberi skor kecil tambahan, bukan flag utama.',
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-3 bg-[#1a1a26] border border-[#2a2a3a] rounded-xl p-4">
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                <div>
                  <p className="font-semibold text-[#eeeef0] text-sm mb-1">{item.title}</p>
                  <p className="text-[13px] text-[#8888a0] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Footer note */}
        <div className="mt-4 p-5 bg-[rgba(99,102,241,0.06)] border border-[rgba(99,102,241,0.2)] rounded-xl text-center">
          <p className="text-[13px] text-[#8888a0] leading-relaxed">
            AmplifierScope adalah proyek riset independen.{" "}
            <strong className="text-[#eeeef0]">
              Hasil analisis tidak bisa dijadikan dasar tuduhan atau klaim hukum.
            </strong>{" "}
            Tujuannya adalah meningkatkan transparansi dan membantu publik lebih kritis terhadap
            narasi yang muncul di media sosial.
          </p>
        </div>

        <footer className="text-center py-8 text-xs text-[#55556a]">
          <p>AmplifierScope © 2026</p>
        </footer>
      </div>
    </div>
  );
}
