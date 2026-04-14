"use client";

import { useEffect, useRef, useState } from "react";
import { Zap, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { InputList } from "@/components/InputList";
import { FocusPrompt } from "@/components/FocusPrompt";
import { OutputOptions } from "@/components/OutputOptions";
import { AudioStyleOptions } from "@/components/AudioStyleOptions";
import { OutputLengthOptions } from "@/components/OutputLengthOptions";
import { DetailLevelOptions } from "@/components/DetailLevelOptions";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { DownloadSection } from "@/components/DownloadSection";
import { NewsSourcePicker } from "@/components/news/NewsSourcePicker";
import { parseNewsHandoffParam } from "@/lib/newsFeeds";

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

function buildTimestampPrefix() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${yy}${mm}${dd}_${hh}${min}`;
}

function buildDownloadFilename(summaryTitle) {
  const shortSummary = sanitizeFilename(summaryTitle || "summary")
    .replace(/-/g, "_")
    .slice(0, 48);
  return `${buildTimestampPrefix()}_${shortSummary || "summary"}.mp3`;
}

function appendUniqueUrlSources(currentSources, urls) {
  const existing = new Set(
    currentSources
      .filter((source) => source.kind === "url" && (source.url ?? "").trim() !== "")
      .map((source) => source.url.trim())
  );

  const additions = [];
  for (const url of urls) {
    const trimmed = url.trim();
    if (!trimmed || existing.has(trimmed)) continue;
    existing.add(trimmed);
    additions.push({
      id: `news-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      kind: "url",
      url: trimmed,
    });
  }
  return additions.length > 0 ? [...currentSources, ...additions] : currentSources;
}

export default function Home() {
  const handoffAppliedRef = useRef(false);
  const [sources, setSources] = useState([{ id: "initial", kind: "url", url: "" }]);
  const [focusPrompt, setFocusPrompt] = useState("");
  const [outputMode, setOutputMode] = useState("combined");
  const [audioStyle, setAudioStyle] = useState("summary");
  const [outputLength, setOutputLength] = useState("med");
  const [detailLevel, setDetailLevel] = useState("detailed");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusEntries, setStatusEntries] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [globalError, setGlobalError] = useState(null);
  const [newsFeedOpen, setNewsFeedOpen] = useState(false);

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
            detailLevel,
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
              filename: buildDownloadFilename(extracted.title),
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
          filename: buildDownloadFilename(
            `combined ${successful.length} sources ${successful.map((s) => s.title).join(" ")}`
          ),
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

  useEffect(() => {
    if (handoffAppliedRef.current) return;
    const rawNewsUrls =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("newsUrls")
        : null;
    const handoffUrls = parseNewsHandoffParam(rawNewsUrls);
    handoffAppliedRef.current = true;
    if (handoffUrls.length === 0) return;

    setSources((prev) => appendUniqueUrlSources(prev, handoffUrls));

    if (typeof window !== "undefined") {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete("newsUrls");
      const query = nextUrl.searchParams.toString();
      window.history.replaceState({}, "", `${nextUrl.pathname}${query ? `?${query}` : ""}`);
    }
  }, []);

  const handleAddNewsUrls = (urls) => {
    setSources((prev) => appendUniqueUrlSources(prev, urls));
  };

  return (
    <div className="min-h-screen bg-transparent px-3 py-6 sm:px-4 sm:py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-300/15 ring-1 ring-lime-300/35">
            <BookOpen className="h-7 w-7 text-lime-200" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-[0.12em] text-white sm:text-4xl">
            Learn Faster
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm tracking-wide text-slate-300 sm:text-base">
            YouTube (captions), article links, PDFs, and text files → summarized MP3 you can listen
            to anywhere
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/90 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
          <div className="space-y-5 p-5 sm:p-6">
            <div className="grid gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                  Source Inputs
                </h2>
                <div className="max-h-[520px] overflow-y-auto pr-1">
                  <InputList sources={sources} onChange={setSources} disabled={isProcessing} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
              <button
                type="button"
                onClick={() => setNewsFeedOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left"
              >
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                  AI News Feed
                </h2>
                {newsFeedOpen ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </button>
              {newsFeedOpen && (
                <div className="mt-3">
                  <NewsSourcePicker onAddUrls={handleAddNewsUrls} disabled={isProcessing} />
                </div>
              )}
            </div>

            <div className="h-px bg-white/10" />

            <FocusPrompt value={focusPrompt} onChange={setFocusPrompt} disabled={isProcessing} />

            <div className="h-px bg-white/10" />

            <OutputOptions value={outputMode} onChange={setOutputMode} disabled={isProcessing} />

            <div className="h-px bg-white/10" />

            <AudioStyleOptions
              value={audioStyle}
              onChange={setAudioStyle}
              disabled={isProcessing}
            />

            <div className="h-px bg-white/10" />

            <OutputLengthOptions
              value={outputLength}
              onChange={setOutputLength}
              disabled={isProcessing}
            />

            <div className="h-px bg-white/10" />

            <DetailLevelOptions
              value={detailLevel}
              onChange={setDetailLevel}
              disabled={isProcessing}
            />

            {globalError && (
              <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {globalError}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
              <button
                onClick={handleProcess}
                disabled={!canProcess}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-300 py-3.5 text-sm font-bold uppercase tracking-[0.08em] text-zinc-950 shadow-lg shadow-lime-300/25 transition hover:bg-lime-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
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
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:bg-white/10 hover:text-white sm:w-auto"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {(hasResults || downloads.length > 0) && (
            <div className="space-y-5 border-t border-white/10 bg-black/25 p-5 sm:p-6">
              <ProcessingStatus videos={statusEntries} />
              <DownloadSection items={downloads} />
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-500">
          Frontend React JS + Backend FastAPI, powered by Groq AI and Edge TTS
        </p>
      </div>
    </div>
  );
}
