"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAnalysis } from "@/hooks/useAnalysis";
import { useAuth } from "@/lib/firebase/auth-context";
import { Header } from "@/components/layout/Header";
import { HowItWorks } from "@/components/layout/HowItWorks";
import { AnalysisInput } from "@/components/analysis/AnalysisInput";
import { LoadingSteps } from "@/components/analysis/LoadingSteps";
import { JobProgress } from "@/components/analysis/JobProgress";
import { ResultsView } from "@/components/analysis/ResultsView";
import { LoginModal } from "@/components/auth/LoginModal";

export default function BuzzerGuard() {
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const { isAuthenticated, user, userData, refreshUserData } = useAuth();
  
  // Use credits from userData (from AuthContext)
  const credits = userData?.credits ?? null;
  
  const searchParams = useSearchParams();

  const {
    url, setUrl,
    isAnalyzing,
    isAiReviewing,
    currentStep,
    aiSteps,
    showResults,
    result,
    filter, setFilter,
    activeTab, setActiveTab,
    meterWidth,
    error,
    analysisId,
    job,
    statusMessage,
    startAnalysis,
    startAnalysisFromScraped,
    triggerAIReview,
    loadAnalysis,
    resetAll,
  } = useAnalysis({
    onRequireAuth: () => setShowLoginModal(true),
    onRequireCredit: () => setShowCreditModal(true),
    isAuthenticated,
    user: user || undefined,
  });

  // Handle ?analysisId= query param from dashboard navigation
  useEffect(() => {
    const paramId = searchParams.get("analysisId");
    if (paramId && !analysisId && !showResults && user) {
      (async () => {
        try {
          const idToken = await user.getIdToken();
          const res = await fetch(`/api/analyze/${paramId}`, {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (!res.ok) return;
          const data = await res.json();
          if (data.status === "completed" && data.result) {
            loadAnalysis(data.result, paramId);
          } else if (data.status !== "failed") {
            // Job in progress (scraping/scraped/analyzing) — subscribe via analysisId
            loadAnalysis(data.result || null as any, paramId);
          }
        } catch (err) {
          console.error("Error loading analysis from URL:", err);
        }
      })();
    }
  }, [searchParams, user]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#eeeef0] font-sans overflow-x-hidden">
      {/* Background effects */}
      <div
        className="fixed inset-0 pointer-events-none z-[9999] opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="fixed w-[600px] h-[600px] rounded-full blur-[150px] opacity-[0.07] pointer-events-none z-0 -top-[200px] -left-[100px] bg-[#ff3d5a]" />
      <div className="fixed w-[600px] h-[600px] rounded-full blur-[150px] opacity-[0.07] pointer-events-none z-0 -bottom-[200px] -right-[100px] bg-[#6366f1]" />

      <div className="max-w-[1100px] mx-auto px-6 relative z-10">
        <Header onLoginClick={() => setShowLoginModal(true)} />

        <AnalysisInput
          url={url}
          setUrl={setUrl}
          isAnalyzing={isAnalyzing}
          error={error}
          onAnalyze={startAnalysis}
        />

        {analysisId && !showResults && (
          <JobProgress
            job={job}
            statusMessage={statusMessage}
            error={error}
            onStartAnalysis={() => startAnalysisFromScraped()}
            isAnalyzing={isAnalyzing}
          />
        )}

        {isAnalyzing && !analysisId && (
          <LoadingSteps
            steps={["Menganalisis komentar...", "Mendeteksi pola...", "Menyelesaikan..."]}
            currentStep={currentStep}
          />
        )}

        {isAiReviewing && (
          <LoadingSteps steps={aiSteps} currentStep={currentStep} />
        )}

        {showResults && result && (
          <ResultsView
            result={result}
            meterWidth={meterWidth}
            filter={filter}
            setFilter={setFilter}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onReset={resetAll}
            onTriggerAIReview={triggerAIReview}
            isAiReviewing={isAiReviewing}
            credits={credits}
            onRequireCredit={() => setShowCreditModal(true)}
          />
        )}

        {!showResults && !isAnalyzing && <HowItWorks />}

        <footer className="text-center py-8 text-xs text-[#55556a] border-t border-[#2a2a3a]">
          <p className="mb-1">AmplifierScope © 2026 — Deteksi transparansi koordinasi narasi</p>
          <p className="text-[10px] opacity-70 mb-2">
            "Amplifier" adalah istilah netral untuk akun yang memperkuat narasi (buzzer), bisa pro maupun kontra
          </p>
          <button
            onClick={() => router.push("/cara-kerja")}
            className="text-[#6366f1] hover:text-[#8b8ef5] transition-colors underline underline-offset-2 text-[11px]"
          >
            Bagaimana cara kerjanya?
          </button>
        </footer>
      </div>

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />

      {/* Credit Modal */}
      {showCreditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCreditModal(false)}
          />
          <div className="relative w-full max-w-md mx-4 animate-fadeUp">
            <div className="bg-[#1a1a26] border border-[#2a2a3a] rounded-2xl p-8 shadow-2xl">
              <button
                onClick={() => setShowCreditModal(false)}
                className="absolute top-4 right-4 text-[#55556a] hover:text-[#eeeef0] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-[#ff3d5a] to-[#ff6b35] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-[rgba(255,61,90,0.3)]">
                  🪙
                </div>
                <h2 className="text-2xl font-bold text-[#eeeef0] mb-2">
                  Kredit Habis
                </h2>
                <p className="text-[#8888a0] text-sm">
                  Kamu membutuhkan 1 kredit untuk analisis AI. Beli kredit untuk melanjutkan.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowCreditModal(false);
                    router.push("/dashboard");
                  }}
                  className="w-full bg-gradient-to-br from-[#ff3d5a] to-[#ff6b35] border-none text-white py-3.5 px-4 rounded-xl transition-all duration-200 font-medium"
                >
                  Pergi ke Dashboard
                </button>
                <button
                  onClick={() => setShowCreditModal(false)}
                  className="w-full text-[#8888a0] hover:text-[#eeeef0] py-2 text-sm transition-colors"
                >
                  Kembali
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeUp { animation: fadeUp 0.5s ease forwards; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 3px; }
      `}</style>
    </div>
  );
}
