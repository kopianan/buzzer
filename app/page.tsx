"use client";

import { useAnalysis } from "@/hooks/useAnalysis";
import { Header } from "@/components/layout/Header";
import { HowItWorks } from "@/components/layout/HowItWorks";
import { AnalysisInput } from "@/components/analysis/AnalysisInput";
import { LoadingSteps } from "@/components/analysis/LoadingSteps";
import { ResultsView } from "@/components/analysis/ResultsView";

export default function BuzzerGuard() {
  const {
    url, setUrl,
    isAnalyzing,
    isAiReviewing,
    currentStep,
    steps,
    aiSteps,
    showResults,
    result,
    filter, setFilter,
    activeTab, setActiveTab,
    meterWidth,
    error,
    startAnalysis,
    triggerAIReview,
    resetAll,
  } = useAnalysis();

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
        <Header />

        <AnalysisInput
          url={url}
          setUrl={setUrl}
          isAnalyzing={isAnalyzing}
          error={error}
          onAnalyze={startAnalysis}
        />

        {(isAnalyzing || isAiReviewing) && (
          <LoadingSteps 
            steps={isAiReviewing ? aiSteps : steps} 
            currentStep={currentStep} 
          />
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
          />
        )}

        {!showResults && !isAnalyzing && <HowItWorks />}

        <footer className="text-center py-8 text-xs text-[#55556a] border-t border-[#2a2a3a]">
          <p className="mb-1">AmplifierScope © 2026 — Deteksi transparansi koordinasi narasi</p>
          <p className="text-[10px] opacity-70">
            "Amplifier" adalah istilah netral untuk akun yang memperkuat narasi (buzzer), bisa pro maupun kontra
          </p>
        </footer>
      </div>

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
