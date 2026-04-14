"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Music4 } from "lucide-react";

function toObjectUrl(audioBase64) {
  const bytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "audio/mpeg" });
  return URL.createObjectURL(blob);
}

export function GlobalAudioPlayer() {
  const audioRef = useRef(null);
  const [track, setTrack] = useState(null);
  const [srcUrl, setSrcUrl] = useState(null);

  useEffect(() => {
    const onPlayAudio = (event) => {
      const detail = event.detail;
      if (!detail?.audioBase64) return;
      setTrack({
        label: detail.label || "Audio",
        filename: detail.filename || "audio.mp3",
      });
      setSrcUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return toObjectUrl(detail.audioBase64);
      });
    };

    window.addEventListener("briefme:play-audio", onPlayAudio);
    return () => window.removeEventListener("briefme:play-audio", onPlayAudio);
  }, []);

  useEffect(() => {
    if (!srcUrl || !audioRef.current) return;
    audioRef.current.play().catch(() => {});
  }, [srcUrl]);

  useEffect(() => {
    return () => {
      if (srcUrl) URL.revokeObjectURL(srcUrl);
    };
  }, [srcUrl]);

  const hasTrack = useMemo(() => Boolean(track && srcUrl), [track, srcUrl]);

  if (!hasTrack) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-lime-300/25 bg-zinc-950/95 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-3 py-2.5 sm:px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-lime-300/15">
          <Music4 className="h-4 w-4 text-lime-200" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-200">
            {track.label}
          </p>
          <p className="truncate text-[11px] text-slate-500">{track.filename}</p>
        </div>
        <audio ref={audioRef} controls preload="metadata" src={srcUrl} className="w-[48%] min-w-[190px]" />
        <button
          type="button"
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.pause();
            }
            if (srcUrl) {
              URL.revokeObjectURL(srcUrl);
            }
            setTrack(null);
            setSrcUrl(null);
          }}
          className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
          aria-label="Close player"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
