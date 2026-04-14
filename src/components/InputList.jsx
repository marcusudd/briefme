"use client";

import { useRef } from "react";
import { Plus, Trash2, Link, Play, FileText, Upload, ClipboardPaste } from "lucide-react";
import { detectSourceType, normalizeUrlForDetect } from "@/lib/detect";

let counter = 0;
function newId() {
  return `source-${++counter}-${Date.now()}`;
}

function SourceBadge({ url }) {
  if (!url.trim()) return null;
  const canonical = normalizeUrlForDetect(url);
  try {
    new URL(canonical);
  } catch {
    return null;
  }
  const type = detectSourceType(url);
  if (type === "youtube") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">
        <Play className="h-3 w-3" />
        YouTube
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-400">
      <FileText className="h-3 w-3" />
      Article
    </span>
  );
}

export function InputList({ sources, onChange, disabled }) {
  const fileInputRef = useRef(null);

  const addSource = () => {
    onChange([...sources, { id: newId(), kind: "url", url: "" }]);
  };

  const addTextSource = () => {
    onChange([...sources, { id: newId(), kind: "text", text: "" }]);
  };

  const removeSource = (id) => {
    onChange(sources.filter((s) => s.id !== id));
  };

  const updateUrl = (id, url) => {
    onChange(
      sources.map((s) => (s.id === id ? { ...s, kind: "url", url, file: undefined } : s))
    );
  };

  const updateText = (id, text) => {
    onChange(
      sources.map((s) =>
        s.id === id ? { ...s, kind: "text", text, file: undefined, url: undefined } : s
      )
    );
  };

  const addFiles = (files) => {
    if (!files || files.length === 0) return;
    const entries = Array.from(files).map((file) => ({
      id: newId(),
      kind: "file",
      file,
    }));
    onChange([...sources, ...entries]);
  };

  return (
    <div className="space-y-2.5">
      <label className="block text-sm font-semibold text-slate-200 uppercase tracking-wider">
        YouTube, article links, PDF & text files
      </label>

      <div className="space-y-1.5">
        {sources.map((source, index) => (
          <div key={source.id} className="flex items-start gap-1.5">
            {source.kind === "file" && source.file ? (
              <div className="flex flex-1 items-center justify-between rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-sky-400" />
                  <span className="truncate text-sm text-slate-200">{source.file.name}</span>
                </div>
                <span className="ml-2 rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-400">
                  File
                </span>
              </div>
            ) : source.kind === "text" ? (
              <div className="flex-1 space-y-1.5 rounded-xl border border-white/15 bg-white/5 p-2.5">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  Pasted text
                </div>
                <textarea
                  value={source.text ?? ""}
                  onChange={(e) => updateText(source.id, e.target.value)}
                  placeholder="Paste plain text here (Ctrl/Cmd+V)…"
                  disabled={disabled}
                  rows={6}
                  className="w-full resize-y rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 transition focus:border-lime-300/70 focus:outline-none focus:ring-2 focus:ring-lime-300/20 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            ) : (
              <>
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                    <Link className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    autoComplete="off"
                    value={source.url ?? ""}
                    onChange={(e) => updateUrl(source.id, e.target.value)}
                    placeholder="YouTube URL, article link, or arXiv id (e.g. 1706.03762v7)…"
                    disabled={disabled}
                    className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 transition focus:border-lime-300/70 focus:outline-none focus:ring-2 focus:ring-lime-300/20 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <SourceBadge url={source.url ?? ""} />
              </>
            )}

            {sources.length > 1 && (
              <button
                onClick={() => removeSource(source.id)}
                disabled={disabled}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-slate-400 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Remove source ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addSource}
        disabled={disabled}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-lime-300/50 hover:bg-lime-300/10 hover:text-lime-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        Add another source
      </button>
      <button
        onClick={addTextSource}
        disabled={disabled}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-lime-300/50 hover:bg-lime-300/10 hover:text-lime-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ClipboardPaste className="h-4 w-4" />
        Add pasted text
      </button>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (disabled) return;
          addFiles(e.dataTransfer.files);
        }}
        className="rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-3.5 text-center"
      >
        <div className="mb-2 flex items-center justify-center">
          <Upload className="h-4 w-4 text-slate-400" />
        </div>
        <p className="text-xs text-slate-400">
          Drag & drop PDF, DOCX or text files here or{" "}
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="text-lime-200 hover:text-lime-100 disabled:opacity-50"
          >
            browse files
          </button>
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md,.csv,.json,.xml,.log,text/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.currentTarget.value = "";
          }}
        />
      </div>
    </div>
  );
}
