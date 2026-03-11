"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/auth-context";
import { isValidConfig } from "@/lib/firebase/config";

interface HeaderProps {
  onLoginClick?: () => void;
}

export function Header({ onLoginClick }: HeaderProps) {
  const router = useRouter();
  const { isAuthenticated, user, userData, logout } = useAuth();

  // Use credits from userData (from AuthContext)
  const credits = userData?.credits ?? null;

  return (
    <header className="py-10 pb-5">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex-1">
          <div 
            className="inline-flex items-center gap-3 cursor-pointer"
            onClick={() => router.push("/")}
          >
            <div className="w-11 h-11 bg-gradient-to-br from-[#ff3d5a] to-[#ff6b35] rounded-xl flex items-center justify-center text-xl shadow-lg shadow-[rgba(255,61,90,0.3)]">
              📡
            </div>
            <div className="text-[28px] font-bold tracking-tight">
              Amplifier<span className="text-[#ff3d5a]">Scope</span>
            </div>
          </div>
        </div>

        {/* Auth Section */}
        <div className="flex items-center gap-4">
          {!isValidConfig ? (
            <div className="text-xs text-[#55556a] hidden sm:block">
              Firebase belum dikonfigurasi
            </div>
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              {/* Credits Badge */}
              <button
                onClick={() => router.push("/dashboard")}
                className="hidden sm:flex items-center gap-2 bg-[#1a1a26] border border-[#2a2a3a] hover:border-[#ff3d5a] text-[#eeeef0] px-3 py-2 rounded-xl transition-all duration-200"
                title="Lihat Dashboard"
              >
                <span className="text-lg">🪙</span>
                <span className="font-semibold text-[#ff3d5a]">
                  {credits !== null ? credits : "-"}
                </span>
                <span className="text-xs text-[#8888a0]">kredit</span>
              </button>

              {/* User Profile */}
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-[#eeeef0]">
                    {user.displayName || user.email?.split("@")[0]}
                  </p>
                  <p className="text-xs text-[#55556a]">{user.email}</p>
                </div>
                
                <button
                  onClick={() => router.push("/dashboard")}
                  className="relative group"
                  title="Dashboard"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className="w-10 h-10 rounded-full border-2 border-[#2a2a3a] group-hover:border-[#ff3d5a] transition-colors"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff3d5a] to-[#ff6b35] flex items-center justify-center text-white font-semibold group-hover:opacity-90 transition-opacity">
                      {(user.displayName || user.email || "?")[0].toUpperCase()}
                    </div>
                  )}
                </button>

                <button
                  onClick={logout}
                  className="ml-2 text-[#8888a0] hover:text-[#ff3d5a] transition-colors p-2"
                  title="Logout"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="flex items-center gap-2 bg-[#2a2a3a] hover:bg-[#333348] border border-[#3a3a4a] text-[#eeeef0] px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              Masuk
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="text-center mt-6">
        <p className="text-[15px] text-[#8888a0] max-w-[550px] mx-auto leading-relaxed">
          Deteksi akun <strong>amplifier</strong> (buzzer) — akun yang memperkuat narasi 
          secara terkoordinasi di media sosial. Analisis berbasis pola perilaku dan AI.
        </p>
        <p className="text-[12px] text-[#55556a] mt-2">
          🔍 Mendukung Instagram dan TikTok
        </p>
      </div>
    </header>
  );
}
