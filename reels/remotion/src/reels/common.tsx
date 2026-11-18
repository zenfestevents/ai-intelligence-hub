import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BookmarkSimple } from "@phosphor-icons/react";
import { C, EASE_OUT, F } from "../themes/aitools";
import { AiLogo } from "../themes/AiToolsBrand";

// Shared helpers for reels built from an ElevenLabs timing file (segments + word timings).

export type Word = { text: string; start: number; end: number };
export type Timing = {
  fps: number;
  lead_in: number;
  speech_end: number;
  total: number;
  segments: { id: string; from: number; dur: number; words: Word[] }[];
};

export const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9']/g, "");
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ease = (f: number, a: number, b: number, from = 0, to = 1) => interpolate(f, [a, b], [from, to], { ...clamp, easing: EASE_OUT });

export const usePop = (at: number, damping = 11) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping, stiffness: 170, mass: 0.7 } });
};

export const makeTimeline = (timing: Timing) => {
  const FPS = timing.fps;
  const SEG = Object.fromEntries(timing.segments.map((s) => [s.id, s]));
  const IDS = timing.segments.map((s) => s.id);
  const END_FROM = timing.speech_end + 8;
  const cueAbs = (id: string, key: string, nth = 0) => {
    const words = SEG[id].words;
    let hits = words.filter((w) => norm(w.text) === key);
    if (!hits.length) hits = words.filter((w) => norm(w.text).startsWith(key));
    const w = hits[nth] ?? hits[0];
    if (!w) throw new Error(`no word "${key}" in ${id}`);
    return Math.round(w.start * FPS);
  };
  const SPANS = IDS.map((id, i) => {
    const from = i === 0 ? 0 : SEG[id].from - 4;
    const to = i < IDS.length - 1 ? SEG[IDS[i + 1]].from - 4 : END_FROM;
    return { id, from, dur: to - from };
  });
  const span = (id: string) => SPANS.find((s) => s.id === id)!;
  const cue = (id: string, key: string, nth = 0) => cueAbs(id, key, nth) - span(id).from;
  const WORDS: Word[] = timing.segments.flatMap((s) => s.words);
  return { FPS, SEG, IDS, END_FROM, cueAbs, cue, span, SPANS, WORDS };
};

export const Sfx: React.FC<{ at: number; src: string; volume?: number }> = ({ at, src, volume = 0.35 }) => (
  <Sequence from={Math.max(0, at)} durationInFrames={30} layout="none">
    <Audio src={staticFile(`sfx/${src}.wav`)} volume={volume} />
  </Sequence>
);

// title/icon default to "SAVE THIS" + bookmark; share-style reels pass their own (e.g. "SHARE THIS" + paper plane).
export const EndCard: React.FC<{ line?: React.ReactNode; title?: React.ReactNode; icon?: React.ReactNode }> = ({ line, title, icon }) => {
  const frame = useCurrentFrame();
  const logo = usePop(4, 10);
  const t1 = ease(frame, 12, 24);
  const t2 = ease(frame, 18, 30);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${logo}) rotate(${(1 - logo) * -30}deg)`, marginTop: -160 }}>
        <AiLogo size={360} />
      </div>
      <div style={{ marginTop: 60, display: "flex", alignItems: "center", gap: 16, fontFamily: F.head, fontSize: 96, color: C.white, opacity: t1, transform: `translateY(${(1 - t1) * 30}px)` }}>
        {icon ?? <BookmarkSimple size={88} weight="fill" color={C.yellow} />} {title ?? "SAVE THIS"}
      </div>
      <div style={{ marginTop: 18, fontFamily: F.body, fontWeight: 800, fontSize: 50, color: C.grey, opacity: t2, transform: `translateY(${(1 - t2) * 30}px)` }}>
        {line ?? (
          <>
            Follow for <span style={{ color: C.yellow }}>daily AI updates</span>
          </>
        )}
      </div>
    </AbsoluteFill>
  );
};
