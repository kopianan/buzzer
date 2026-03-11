"use client";

// import { useRef, useCallback } from "react"; // Upload JSON dinonaktifkan sementara

interface Props {
  url: string;
  setUrl: (url: string) => void;
  isAnalyzing: boolean;
  error: string | null;
  onAnalyze: (uploadedComments?: unknown[]) => void;
}

export function AnalysisInput({ url, setUrl, isAnalyzing, error, onAnalyze }: Props) {
  // Upload JSON dinonaktifkan sementara
  // const fileInputRef = useRef<HTMLInputElement>(null);

  // const handleFileUpload = useCallback(async (file: File) => {
  //   try {
  //     const text = await file.text();
  //     const parsed = JSON.parse(text);
  //     let comments: unknown[];
  //     if (Array.isArray(parsed) && parsed[0]?.comments) {
  //       comments = parsed[0].comments;
  //     } else if (Array.isArray(parsed) && parsed[0]?.comment_text !== undefined) {
  //       comments = parsed;
  //     } else if (Array.isArray(parsed)) {
  //       comments = parsed;
  //     } else {
  //       throw new Error("Format JSON tidak valid. Dibutuhkan array komentar.");
  //     }
  //     onAnalyze(comments);
  //   } catch (err) {
  //     alert(err instanceof Error ? err.message : "Gagal membaca file JSON");
  //   }
  // }, [onAnalyze]);

  // const handleDrop = useCallback(async (e: React.DragEvent) => {
  //   e.preventDefault();
  //   const file = e.dataTransfer.files[0];
  //   if (file?.type === "application/json" || file?.name.endsWith(".json")) {
  //     await handleFileUpload(file);
  //   }
  // }, [handleFileUpload]);

  return (
    <section className="my-8">
      <div
        className={`flex gap-3 bg-[#1a1a26] border rounded-2xl p-2 transition-all duration-300 focus-within:ring-[3px] focus-within:ring-[rgba(255,61,90,0.3)] ${
          error ? "border-[#ff3d5a]" : "border-[#2a2a3a] focus-within:border-[#ff3d5a]"
        }`}
        // onDrop={handleDrop}  // Upload JSON dinonaktifkan
        // onDragOver={(e) => e.preventDefault()}
      >
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isAnalyzing && onAnalyze()}
          placeholder="https://www.instagram.com/p/ABC123... atau https://www.tiktok.com/@user/video/..."
          spellCheck={false}
          className="flex-1 bg-transparent border-none outline-none text-[#eeeef0] font-mono text-sm px-4 py-3 tracking-tight placeholder:text-[#55556a]"
        />
        {/* Upload JSON button dinonaktifkan sementara */}
        {/* <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isAnalyzing}
          title="Upload JSON file"
          className="bg-[#2a2a3a] border-none text-[#8888a0] px-3 py-3 rounded-xl font-medium text-sm transition-all duration-200 hover:bg-[#333348] hover:text-[#eeeef0] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          📂
        </button> */}
        <button
          onClick={() => onAnalyze()}
          disabled={isAnalyzing}
          className="bg-gradient-to-br from-[#ff3d5a] to-[#ff6b35] border-none text-white px-7 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[rgba(255,61,90,0.3)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap tracking-wide"
        >
          {isAnalyzing ? "Menganalisis..." : "Analisis Post"}
        </button>
      </div>

      {/* Hidden file input — dinonaktifkan sementara */}
      {/* <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await handleFileUpload(file);
          e.target.value = "";
        }}
      /> */}

      {error && (
        <div className="mt-3 p-3.5 bg-[rgba(255,61,90,0.08)] border border-[rgba(255,61,90,0.2)] rounded-xl text-[13px] text-[#ff3d5a]">
          ⚠️ {error}
        </div>
      )}

      <div className="mt-4 p-4 bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.2)] rounded-xl flex items-start gap-2.5 text-[13px] text-[#8888a0] leading-relaxed">
        <span className="text-base flex-shrink-0 mt-0.5">ℹ️</span>
        <span>
          Paste URL post Instagram atau TikTok, lalu klik <strong>Analisis Post</strong>.
        </span>
      </div>
    </section>
  );
}
