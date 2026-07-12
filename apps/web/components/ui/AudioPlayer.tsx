"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Loader2 } from "lucide-react";

interface Props { url: string; }

function fmt(s: number) {
  if (!isFinite(s) || isNaN(s)) return "0:00";
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function AudioPlayer({ url }: Props) {
  const audioRef                = useRef<HTMLAudioElement>(null);
  const barRef                  = useRef<HTMLDivElement>(null);
  const [playing,  setPlaying]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [current,  setCurrent]  = useState(0);
  const [duration, setDuration] = useState(0);
  const [error,    setError]    = useState(false);
  const dragging                = useRef(false);

  const proxyUrl = `/api/recordings/proxy?url=${encodeURIComponent(url)}`;

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime     = () => setCurrent(a.currentTime);
    const onMeta     = () => setDuration(a.duration);
    const onDuration = () => { if (isFinite(a.duration)) setDuration(a.duration); };
    const onEnd      = () => { setPlaying(false); setCurrent(0); a.currentTime = 0; };
    const onError    = () => { setError(true); setLoading(false); };
    a.addEventListener("timeupdate",        onTime);
    a.addEventListener("loadedmetadata",    onMeta);
    a.addEventListener("durationchange",    onDuration);
    a.addEventListener("ended",             onEnd);
    a.addEventListener("error",             onError);
    return () => {
      a.removeEventListener("timeupdate",     onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onDuration);
      a.removeEventListener("ended",          onEnd);
      a.removeEventListener("error",          onError);
    };
  }, []);

  async function togglePlay() {
    const a = audioRef.current;
    if (!a || error) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      setLoading(true);
      try {
        await a.play();
        setPlaying(true);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
  }

  function seekFromEvent(e: MouseEvent | React.MouseEvent) {
    const a   = audioRef.current;
    const bar = barRef.current;
    if (!a || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = pct * duration;
    setCurrent(a.currentTime);
  }

  function onMouseDown(e: React.MouseEvent) {
    dragging.current = true;
    seekFromEvent(e);
    const onMove = (ev: MouseEvent) => { if (dragging.current) seekFromEvent(ev); };
    const onUp   = () => { dragging.current = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
  }

  const pct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="rounded-xl px-4 py-3 flex items-center gap-4"
      style={{ background: "rgba(48,125,192,0.08)", border: "1px solid rgba(48,125,192,0.2)" }}>
      <audio ref={audioRef} src={proxyUrl} preload="metadata" />

      {/* Play/Pause */}
      <button onClick={togglePlay} disabled={error}
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105"
        style={{ background: error ? "rgba(237,31,36,0.15)" : "rgba(48,125,192,0.2)", color: error ? "#ED1F24" : "#307DC0" }}>
        {loading
          ? <Loader2 size={15} className="animate-spin" />
          : playing
            ? <Pause size={15} />
            : <Play  size={15} className="ml-0.5" />}
      </button>

      {/* Progress */}
      <div className="flex-1 space-y-1.5">
        {/* Bar — tall hit area, visually thin */}
        <div ref={barRef} onMouseDown={onMouseDown}
          className="relative flex items-center cursor-pointer"
          style={{ height: 20 }}>
          {/* Track */}
          <div className="absolute inset-x-0 rounded-full" style={{ height: 4, background: "rgba(255,255,255,0.08)" }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #307DC0, #27679D)" }} />
          </div>
          {/* Dot — pointer-events-none so clicks pass to bar */}
          <div className="absolute w-3 h-3 rounded-full pointer-events-none"
            style={{ left: `calc(${pct}% - 6px)`, background: "#78ABD6", border: "2px solid #27679D", zIndex: 1 }} />
        </div>

        <div className="flex justify-between text-xs font-mono" style={{ color: "#475569" }}>
          <span>{fmt(current)}</span>
          <span>{error ? "Failed to load" : duration > 0 ? fmt(duration) : "—:——"}</span>
        </div>
      </div>
    </div>
  );
}
