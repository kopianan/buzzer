const STEPS = [
  {
    step: "01",
    icon: "🔗",
    title: "Masukkan URL atau Upload JSON",
    desc: "Paste link dari Instagram, X, atau TikTok — atau upload file JSON komentar langsung dari n8n.",
  },
  {
    step: "02",
    icon: "🔬",
    title: "Analisis Pola + AI",
    desc: "Deteksi amplifier berdasarkan similarity clustering, timing coordination, username pattern, dan AI review untuk validasi.",
  },
  {
    step: "03",
    icon: "📊",
    title: "Lihat Hasilnya",
    desc: "Coordination score, klasifikasi amplifier/organik, entitas yang dipush, dan detail pola per komentar.",
  },
];

const FAQS = [
  {
    q: "Apa itu Amplifier?",
    a: "Amplifier adalah akun yang memperkuat (amplify) suatu narasi secara terkoordinasi. Dalam konteks media sosial Indonesia, istilah ini lebih netral dari 'buzzer' yang sering bermakna negatif. Amplifier bisa pro maupun kontra.",
  },
  {
    q: "Bagaimana cara deteksinya?",
    a: "Sistem menganalisis pola perilaku: komentar copy-paste, timing yang terkoordinasi, username pattern (user123), dan akun dengan engagement anomali. Tanpa bergantung pada keyword tertentu.",
  },
  {
    q: "Apakah amplifier selalu negatif?",
    a: "Tidak. Amplifier hanyalah akun yang memperkuat narasi. Narasi yang diperkuat bisa positif, negatif, atau netral. Tujuannya adalah transparansi, bukan penghakiman.",
  },
];

export function HowItWorks() {
  return (
    <section className="mt-12 mb-10">
      <h2 className="text-xl font-semibold mb-7 tracking-tight text-center">Bagaimana Cara Kerjanya?</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {STEPS.map((item, idx) => (
          <div
            key={idx}
            className="bg-[#1a1a26] border border-[#2a2a3a] rounded-xl p-7 transition-all duration-300 hover:border-[#333348] hover:-translate-y-0.5 animate-fadeUp"
            style={{ animationDelay: `${(idx + 1) * 0.1}s` }}
          >
            <div className="font-mono text-[11px] text-[#ff3d5a] tracking-wider uppercase mb-3">
              Step {item.step}
            </div>
            <div className="text-[28px] mb-3">{item.icon}</div>
            <h3 className="text-[15px] mb-2 font-semibold">{item.title}</h3>
            <p className="text-[13px] text-[#8888a0] leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* FAQ / Edukasi */}
      <div className="bg-[#1a1a26] border border-[#2a2a3a] rounded-xl p-6">
        <h3 className="text-[15px] font-semibold mb-4 flex items-center gap-2">
          <span>💡</span> Edukasi: Memahami Amplifier
        </h3>
        <div className="space-y-4">
          {FAQS.map((faq, idx) => (
            <div key={idx} className="border-b border-[#2a2a3a] last:border-0 pb-4 last:pb-0">
              <h4 className="text-[13px] font-medium text-[#eeeef0] mb-1">{faq.q}</h4>
              <p className="text-[12px] text-[#8888a0] leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
