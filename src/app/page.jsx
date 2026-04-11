"use client";

import { useState } from "react";
import { Zap, BookOpen } from "lucide-react";
import { InputList } from "@/components/InputList";
import { FocusPrompt } from "@/components/FocusPrompt";
import { OutputOptions } from "@/components/OutputOptions";
import { AudioStyleOptions } from "@/components/AudioStyleOptions";
import { OutputLengthOptions } from "@/components/OutputLengthOptions";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { DownloadSection } from "@/components/DownloadSection";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function formatApiError(res, data) {
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((e) => (typeof e?.msg === "string" ? e.msg : JSON.stringify(e)))
      .join("; ");
  }
  if (data?.detail && typeof data.detail === "object") {
    return JSON.stringify(data.detail);
  }
  return data?.error || `Server error: ${res.status}`;
}

function sanitizeFilename(name) {
  return name
    .trim()
    .replace(/[^a-z0-9\s-]/gi, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 80);
}

export default function Home() {
  const [sources, setSources] = useState([{ id: "initial", kind: "url", url: "" }]);
  const [focusPrompt, setFocusPrompt] = useState("");
  const [outputMode, setOutputMode] = useState("combined");
  const [audioStyle, setAudioStyle] = useState("summary");
  const [outputLength, setOutputLength] = useState("med");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusEntries, setStatusEntries] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [globalError, setGlobalError] = useState(null);

  const validSources = sources.filter(
    (s) =>
      (s.kind === "url" && (s.url ?? "").trim() !== "") ||
      (s.kind === "file" && s.file) ||
      (s.kind === "text" && (s.text ?? "").trim() !== "")
  );

  const updateStatus = (id, update) => {
    setStatusEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...update } : e)));
  };

  async function postJson(url, body) {
    const res = await fetch(`${API_BASE}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(formatApiError(res, data));
    }
    return data;
  }

  const handleProcess = async () => {
    if (validSources.length === 0) return;
    setGlobalError(null);
    setDownloads([]);

    const initialStatuses = validSources.map((s) => ({
      id: s.id,
      url:
        s.kind === "url"
          ? s.url ?? ""
          : s.kind === "file"
            ? `file://${s.file?.name ?? s.id}`
            : `text://${(s.text ?? "").slice(0, 32) || s.id}`,
      status: "pending",
    }));
    setStatusEntries(initialStatuses);
    setIsProcessing(true);

    try {
      const newDownloads = [];
      const successful = [];

      for (const source of validSources) {
        updateStatus(source.id, { status: "extracting", error: undefined });

        try {
          let extracted;
          if (source.kind === "file") {
            if (!source.file) throw new Error("Missing uploaded file");
            const form = new FormData();
            form.append("file", source.file);
            const res = await fetch(`${API_BASE}/extract-file`, { method: "POST", body: form });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(formatApiError(res, data));
            extracted = data;
          } else if (source.kind === "text") {
            const content = (source.text ?? "").trim();
            if (!content) throw new Error("Pasted text is empty");
            extracted = {
              content,
              title: `Pasted text ${new Date().toLocaleString()}`,
              sourceType: "file",
            };
          } else {
            extracted = await postJson("/extract", { url: source.url });
          }

          updateStatus(source.id, { title: extracted.title, status: "summarizing" });

          const summarized = await postJson("/summarize", {
            content: extracted.content,
            sourceType: extracted.sourceType,
            focusPrompt: focusPrompt.trim() || undefined,
            title: extracted.title,
            audioStyle,
            outputLength,
          });

          successful.push({
            id: source.id,
            title: extracted.title,
            sourceType: extracted.sourceType,
            summary: summarized.summary,
          });

          if (outputMode === "separate") {
            updateStatus(source.id, { status: "generating" });
            const tts = await postJson("/tts", { text: summarized.summary, audioStyle });
            newDownloads.push({
              label: extracted.title,
              audioBase64: tts.audioBase64,
              filename: `${sanitizeFilename(extracted.title)}.mp3`,
              summary: summarized.summary,
            });
          }

          updateStatus(source.id, { status: "done" });
        } catch (err) {
          updateStatus(source.id, {
            status: "error",
            error: err instanceof Error ? err.message : "Processing failed",
          });
        }
      }

      if (outputMode === "combined" && successful.length > 0) {
        setStatusEntries((prev) =>
          prev.map((e) =>
            successful.some((s) => s.id === e.id && e.status === "done")
              ? { ...e, status: "generating" }
              : e
          )
        );

        const joinedText = successful
          .map((s, i) => {
            const intro =
              i === 0
                ? `Starting with the first source: ${s.title}. `
                : `Moving on to source ${i + 1}: ${s.title}. `;
            return intro + s.summary;
          })
          .join("\n\n");

        const combinedTts = await postJson("/tts", { text: joinedText, audioStyle });
        newDownloads.push({
          label: `Combined: ${successful.length} source${successful.length !== 1 ? "s" : ""}`,
          audioBase64: combinedTts.audioBase64,
          filename: `combined-${sanitizeFilename(successful.map((s) => s.title).join(" ")).slice(
            0,
            50
          )}.mp3`,
          summary: successful.map((s) => `## ${s.title}\n\n${s.summary}`).join("\n\n---\n\n"),
        });

        setStatusEntries((prev) =>
          prev.map((e) =>
            successful.some((s) => s.id === e.id && e.status === "generating")
              ? { ...e, status: "done" }
              : e
          )
        );
      }

      setDownloads(newDownloads);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setStatusEntries((prev) =>
        prev.map((e) =>
          e.status !== "done" && e.status !== "error"
            ? { ...e, status: "error", error: "Processing failed" }
            : e
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setStatusEntries([]);
    setDownloads([]);
    setGlobalError(null);
  };

  const hasResults = statusEntries.length > 0;
  const canProcess = validSources.length > 0 && !isProcessing;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/15 ring-1 ring-violet-500/30">
            <BookOpen className="h-8 w-8 text-violet-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Learn Faster</h1>
          <p className="mt-2 text-base text-slate-400">
            YouTube (captions), article links, PDFs, and text files → summarized MP3 you can listen
            to anywhere
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
          <div className="space-y-6 p-6 sm:p-8">
            <InputList sources={sources} onChange={setSources} disabled={isProcessing} />

            <div className="h-px bg-slate-800" />

            <FocusPrompt value={focusPrompt} onChange={setFocusPrompt} disabled={isProcessing} />

            <div className="h-px bg-slate-800" />

            <OutputOptions value={outputMode} onChange={setOutputMode} disabled={isProcessing} />

            <div className="h-px bg-slate-800" />

            <AudioStyleOptions
              value={audioStyle}
              onChange={setAudioStyle}
              disabled={isProcessing}
            />

            <div className="h-px bg-slate-800" />

            <OutputLengthOptions
              value={outputLength}
              onChange={setOutputLength}
              disabled={isProcessing}
            />

            {globalError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {globalError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleProcess}
                disabled={!canProcess}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:bg-violet-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Zap className="h-5 w-5" />
                {isProcessing
                  ? `Processing ${validSources.length} source${validSources.length !== 1 ? "s" : ""}…`
                  : `Generate ${audioStyle === "podcast" ? "Podcast MP3" : "MP3"}${
                      validSources.length > 1 ? "s" : ""
                    }`}
              </button>

              {hasResults && !isProcessing && (
                <button
                  onClick={handleReset}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3.5 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {(hasResults || downloads.length > 0) && (
            <div className="space-y-6 border-t border-slate-800 bg-slate-950/50 p-6 sm:p-8">
              <ProcessingStatus videos={statusEntries} />
              <DownloadSection items={downloads} />
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-600">
          Frontend React JS + Backend FastAPI, powered by Groq AI and Edge TTS
        </p>
      </div>
    </div>
  );
}
