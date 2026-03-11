"use client";

import { useAuth } from "@/lib/firebase/auth-context";
import { isValidConfig } from "@/lib/firebase/config";
import { useEffect, useCallback, useState } from "react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { signInWithGoogle, isAuthenticated, user, error: authError } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);

  // Close modal when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      onClose();
    }
  }, [isAuthenticated, isOpen, onClose]);

  // Handle ESC key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  const handleGoogleSignIn = async () => {
    try {
      setLocalError(null);
      await signInWithGoogle();
    } catch (error) {
      console.error("Login failed:", error);
      setLocalError("Gagal masuk. Silakan coba lagi.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 animate-fadeUp">
        <div className="bg-[#1a1a26] border border-[#2a2a3a] rounded-2xl p-8 shadow-2xl">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#55556a] hover:text-[#eeeef0] transition-colors"
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
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          {/* Logo/Icon */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-[#ff3d5a] to-[#ff6b35] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-[rgba(255,61,90,0.3)]">
              📡
            </div>
            <h2 className="text-2xl font-bold text-[#eeeef0] mb-2">
              Amplifier<span className="text-[#ff3d5a]">Scope</span>
            </h2>
            <p className="text-[#8888a0] text-sm">
              Masuk untuk menganalisis post dan menyimpan riwayat
            </p>
          </div>

          {/* Error Message */}
          {(localError || authError) && (
            <div className="mb-4 p-3 bg-[rgba(255,61,90,0.1)] border border-[rgba(255,61,90,0.3)] rounded-xl text-[#ff3d5a] text-sm">
              ⚠️ {localError || authError}
            </div>
          )}

          {/* Not Configured Warning */}
          {!isValidConfig && (
            <div className="mb-4 p-3 bg-[rgba(255,193,7,0.1)] border border-[rgba(255,193,7,0.3)] rounded-xl text-[#ffc107] text-sm">
              ⚠️ Firebase belum dikonfigurasi. Tambahkan environment variables di file .env.local
            </div>
          )}

          {/* Login Options */}
          <div className="space-y-3">
            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={!isValidConfig}
              className="w-full flex items-center justify-center gap-3 bg-[#2a2a3a] hover:bg-[#333348] disabled:opacity-50 disabled:cursor-not-allowed border border-[#3a3a4a] text-[#eeeef0] py-3.5 px-4 rounded-xl transition-all duration-200 font-medium"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Lanjutkan dengan Google
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[#2a2a3a]"></div>
            <span className="text-[#55556a] text-xs">atau</span>
            <div className="flex-1 h-px bg-[#2a2a3a]"></div>
          </div>

          {/* Continue as Guest */}
          <button
            onClick={onClose}
            className="w-full text-[#8888a0] hover:text-[#eeeef0] py-2 text-sm transition-colors"
          >
            Kembali ke beranda
          </button>

          {/* Terms */}
          <p className="text-center text-[11px] text-[#55556a] mt-6 leading-relaxed">
            Dengan masuk, kamu menyetujui{" "}
            <a href="#" className="text-[#ff3d5a] hover:underline">
              Syarat Penggunaan
            </a>{" "}
            dan{" "}
            <a href="#" className="text-[#ff3d5a] hover:underline">
              Kebijakan Privasi
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
