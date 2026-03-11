"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/auth-context";
import { UserCredits, CreditTransaction } from "@/lib/types/user";
import { AnalysisJob, AnalysisStatus, STATUS_LABELS } from "@/lib/types/analysis-job";
import { getUserTransactions } from "@/services/user";
import { subscribeToUserAnalyses } from "@/services/firestore";

const STATUS_BADGE: Record<AnalysisStatus, { bg: string; text: string; label: string }> = {
  pending:  { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Mengirim..." },
  scraping: { bg: "bg-blue-500/20",   text: "text-blue-400",   label: "Mengambil komentar" },
  scraped:  { bg: "bg-teal-500/20",   text: "text-teal-400",   label: "Siap Dianalisis" },
  analyzing:{ bg: "bg-purple-500/20", text: "text-purple-400", label: "Menganalisis" },
  completed:{ bg: "bg-green-500/20",  text: "text-green-400",  label: "Selesai" },
  failed:   { bg: "bg-red-500/20",    text: "text-red-400",    label: "Gagal" },
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, userData, isAuthenticated, loading: authLoading, refreshUserData } = useAuth();

  const [analyses, setAnalyses] = useState<AnalysisJob[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "history" | "transactions">("active");
  const [loading, setLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, authLoading, router]);

  // Subscribe to analyses (real-time)
  useEffect(() => {
    if (!user) return;

    const unsub = subscribeToUserAnalyses(
      user.uid,
      (jobs) => {
        setAnalyses(jobs);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading analyses:", err);
        setLoading(false);
      },
      50
    );

    return () => unsub();
  }, [user]);

  // Load transactions
  useEffect(() => {
    if (!user) return;
    getUserTransactions(user.uid, 20)
      .then(setTransactions)
      .catch((err) => console.error("Error loading transactions:", err));
  }, [user]);

  // Refresh user data
  useEffect(() => {
    if (user) refreshUserData();
  }, [user]);

  const activeJobs = analyses.filter(
    (a) => a.status !== "completed" && a.status !== "failed" && a.status !== "scraped"
  );
  const scrapedJobs = analyses.filter((a) => a.status === "scraped");
  const completedJobs = analyses.filter((a) => a.status === "completed");
  const failedJobs = analyses.filter((a) => a.status === "failed");

  const displayUserData = userData || (user
    ? ({
        userId: user.uid,
        email: user.email || "",
        displayName: user.displayName,
        photoURL: user.photoURL,
        credits: 0,
        totalAnalyses: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserCredits)
    : null);

  const handleAnalysisClick = (job: AnalysisJob) => {
    if (job.status !== "failed") {
      router.push(`/?analysisId=${job.id}`);
    }
  };

  if (authLoading || (loading && analyses.length === 0)) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-[#eeeef0] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#ff3d5a] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[#8888a0]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#eeeef0]">
      <div className="fixed w-[600px] h-[600px] rounded-full blur-[150px] opacity-[0.07] pointer-events-none z-0 -top-[200px] -left-[100px] bg-[#ff3d5a]" />
      <div className="fixed w-[600px] h-[600px] rounded-full blur-[150px] opacity-[0.07] pointer-events-none z-0 -bottom-[200px] -right-[100px] bg-[#6366f1]" />

      <div className="max-w-[1100px] mx-auto px-6 py-10 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Dashboard <span className="text-[#ff3d5a]">User</span>
            </h1>
            <p className="text-[#8888a0]">Kelola kredit dan lihat riwayat analisis</p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 bg-[#2a2a3a] hover:bg-[#333348] border border-[#3a3a4a] text-[#eeeef0] px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium"
          >
            &larr; Kembali ke Beranda
          </button>
        </div>

        {/* Credit Card */}
        <div className="bg-gradient-to-br from-[#ff3d5a] to-[#ff6b35] rounded-2xl p-8 mb-8 shadow-lg shadow-[rgba(255,61,90,0.3)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm mb-1">Sisa Kredit AI Analysis</p>
              <h2 className="text-5xl font-bold text-white">{displayUserData?.credits || 0}</h2>
              <p className="text-white/60 text-sm mt-2">
                {(displayUserData?.credits || 0) === 0
                  ? "Kredit habis. Beli kredit untuk melanjutkan."
                  : "Setiap analisis AI membutuhkan 1 kredit"}
              </p>
            </div>
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center text-4xl backdrop-blur-sm">
              🪙
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button className="bg-white text-[#ff3d5a] px-6 py-3 rounded-xl font-semibold hover:bg-white/90 transition-colors">
              Beli Kredit
            </button>
            <button
              onClick={() => refreshUserData()}
              className="bg-white/20 text-white px-6 py-3 rounded-xl font-medium hover:bg-white/30 transition-colors backdrop-blur-sm"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1a1a26] border border-[#2a2a3a] rounded-xl p-6">
            <p className="text-[#8888a0] text-sm mb-2">Total Selesai</p>
            <p className="text-3xl font-bold">{completedJobs.length}</p>
          </div>
          <div className="bg-[#1a1a26] border border-[#2a2a3a] rounded-xl p-6">
            <p className="text-[#8888a0] text-sm mb-2">Siap Dianalisis</p>
            <p className="text-3xl font-bold text-teal-400">{scrapedJobs.length}</p>
          </div>
          <div className="bg-[#1a1a26] border border-[#2a2a3a] rounded-xl p-6">
            <p className="text-[#8888a0] text-sm mb-2">Sedang Berjalan</p>
            <p className="text-3xl font-bold text-blue-400">{activeJobs.length}</p>
          </div>
          <div className="bg-[#1a1a26] border border-[#2a2a3a] rounded-xl p-6">
            <p className="text-[#8888a0] text-sm mb-2">Email</p>
            <p className="text-sm font-medium truncate">{displayUserData?.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-[#1a1a26] border border-[#2a2a3a] rounded-2xl overflow-hidden">
          <div className="flex border-b border-[#2a2a3a]">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${
                activeTab === "active"
                  ? "text-[#ff3d5a] border-b-2 border-[#ff3d5a]"
                  : "text-[#8888a0] hover:text-[#eeeef0]"
              }`}
            >
              Proses ({activeJobs.length + scrapedJobs.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${
                activeTab === "history"
                  ? "text-[#ff3d5a] border-b-2 border-[#ff3d5a]"
                  : "text-[#8888a0] hover:text-[#eeeef0]"
              }`}
            >
              Riwayat ({completedJobs.length})
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${
                activeTab === "transactions"
                  ? "text-[#ff3d5a] border-b-2 border-[#ff3d5a]"
                  : "text-[#8888a0] hover:text-[#eeeef0]"
              }`}
            >
              Transaksi ({transactions.length})
            </button>
          </div>

          <div className="p-6">
            {/* Active + Scraped Jobs */}
            {activeTab === "active" && (
              <div className="space-y-3">
                {/* Scraped jobs — ready to analyze */}
                {scrapedJobs.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-teal-400 font-mono uppercase tracking-wider mb-2">
                      Siap Dianalisis ({scrapedJobs.length})
                    </p>
                    {scrapedJobs.map((job) => (
                      <div
                        key={job.id}
                        onClick={() => handleAnalysisClick(job)}
                        className="flex items-center justify-between p-4 bg-[#0a0a0f] border border-teal-500/20 rounded-xl cursor-pointer hover:bg-[#12121a] transition-colors mb-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate max-w-[400px]">{job.postUrl}</p>
                          <div className="flex items-center gap-3 text-sm text-[#8888a0] mt-1">
                            <span className="capitalize">{job.platform}</span>
                            {job.totalComments && (
                              <>
                                <span>·</span>
                                <span>{job.totalComments.toLocaleString("id-ID")} komentar</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-500/20 text-teal-400 border border-teal-500/30">
                            Mulai Analisis &rarr;
                          </span>
                          <p className="text-xs text-[#55556a] mt-1">
                            {job.createdAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* In-progress jobs */}
                {activeJobs.length > 0 && (
                  <div>
                    {scrapedJobs.length > 0 && (
                      <p className="text-xs text-[#55556a] font-mono uppercase tracking-wider mb-2">
                        Sedang Berjalan ({activeJobs.length})
                      </p>
                    )}
                    {activeJobs.map((job) => (
                      <div
                        key={job.id}
                        onClick={() => handleAnalysisClick(job)}
                        className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-xl cursor-pointer hover:bg-[#12121a] transition-colors mb-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate max-w-[400px]">{job.postUrl}</p>
                          <div className="flex items-center gap-3 text-sm text-[#8888a0] mt-1">
                            <span className="capitalize">{job.platform}</span>
                            {job.totalComments && (
                              <>
                                <span>·</span>
                                <span>{job.totalComments.toLocaleString("id-ID")} komentar</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_BADGE[job.status].bg} ${STATUS_BADGE[job.status].text}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                            {STATUS_BADGE[job.status].label}
                          </span>
                          <p className="text-xs text-[#55556a] mt-1">
                            {job.createdAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeJobs.length === 0 && scrapedJobs.length === 0 && (
                  <p className="text-[#8888a0] text-center py-8">
                    Tidak ada analisis yang sedang berjalan
                  </p>
                )}
              </div>
            )}

            {/* Completed History */}
            {activeTab === "history" && (
              <div className="space-y-3">
                {completedJobs.length === 0 ? (
                  <p className="text-[#8888a0] text-center py-8">
                    Belum ada riwayat analisis
                  </p>
                ) : (
                  completedJobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => handleAnalysisClick(job)}
                      className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-xl cursor-pointer hover:bg-[#12121a] transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate max-w-[400px]">{job.postUrl}</p>
                        <div className="flex items-center gap-3 text-sm text-[#8888a0] mt-1">
                          <span className="capitalize">{job.platform}</span>
                          <span>·</span>
                          <span>{job.totalComments || 0} komentar</span>
                          <span>·</span>
                          <span>Score: {(job.coordinationScore || 0).toFixed(1)}</span>
                          {job.aiReviewed && (
                            <>
                              <span>·</span>
                              <span className="text-purple-400">AI Reviewed</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-medium">
                          Lihat Hasil &rarr;
                        </span>
                        <p className="text-xs text-[#55556a] mt-1">
                          {job.completedAt
                            ? job.completedAt.toLocaleDateString("id-ID", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : job.createdAt.toLocaleDateString("id-ID", {
                                month: "short",
                                day: "numeric",
                              })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Transactions */}
            {activeTab === "transactions" && (
              <div className="space-y-3">
                {transactions.length === 0 ? (
                  <p className="text-[#8888a0] text-center py-8">Belum ada transaksi</p>
                ) : (
                  transactions.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 bg-[#0a0a0f] rounded-xl"
                    >
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-xs text-[#55556a] mt-1">
                          {new Date(item.createdAt).toLocaleDateString("id-ID", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                            item.type === "usage"
                              ? "bg-[#ff3d5a]/20 text-[#ff3d5a]"
                              : item.type === "purchase"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          {item.amount > 0 ? "+" : ""}
                          {item.amount} 🪙
                        </span>
                        <p className="text-xs text-[#55556a] mt-1">Saldo: {item.balanceAfter}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
