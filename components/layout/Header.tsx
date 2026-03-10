export function Header() {
  return (
    <header className="py-10 pb-5 text-center">
      <div className="inline-flex items-center gap-3 mb-4">
        <div className="w-11 h-11 bg-gradient-to-br from-[#ff3d5a] to-[#ff6b35] rounded-xl flex items-center justify-center text-xl shadow-lg shadow-[rgba(255,61,90,0.3)]">
          📡
        </div>
        <div className="text-[28px] font-bold tracking-tight">
          Amplifier<span className="text-[#ff3d5a]">Scope</span>
        </div>
      </div>
      <p className="text-[15px] text-[#8888a0] max-w-[550px] mx-auto leading-relaxed">
        Deteksi akun <strong>amplifier</strong> (buzzer) — akun yang memperkuat narasi 
        secara terkoordinasi di media sosial. Analisis berbasis pola perilaku dan AI.
      </p>
      <p className="text-[12px] text-[#55556a] mt-2">
        🔍 Mendukung Instagram, X (Twitter), dan TikTok
      </p>
    </header>
  );
}
