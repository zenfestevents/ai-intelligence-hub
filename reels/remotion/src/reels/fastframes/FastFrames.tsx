import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { ArrowFatLeft, ArrowFatRight, ChatCircleDots, Cpu, DownloadSimple, Warning } from "@phosphor-icons/react";
import timing from "../fastframes-timing.json";
import { C, F } from "../../themes/aitools";
import { clamp, EndCard, ease, makeTimeline, Sfx, Timing, usePop } from "../common";

// Reel: Apple's FastFrames, open video models at "interactive latency". Facts: arXiv 2611.23226 abstract
// (1.3B: 36 ms per frame on a single B200; matches a state-of-the-art model nearly 8x slower; 14B: 45 ms on 8x B200)
// and the Hugging Face card apple/FastFrames-L (14B and 1.3B, 832x480, needs an NVIDIA GPU). 18 Nov 2026.
// Style: retro terminal — green-on-black CRT, typed commands, scanlines; a drawn mini scene (ours) streams in.
const T = makeTimeline(timing as Timing);
export const FASTFRAMES_TOTAL = timing.total;
const { span, cue, cueAbs, END_FROM, SPANS, WORDS, FPS } = T;

const TERM = "#7CFF9B";
const TERM_DIM = "rgba(124,255,155,0.45)";
const CRT = "#07120B";

/* ---------- pieces ---------- */

const Scanlines: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0 2px, transparent 2px 5px)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.65) 100%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: ((frame * 9) % 2100) - 120, height: 120, background: "linear-gradient(transparent, rgba(124,255,155,0.05), transparent)" }} />
    </AbsoluteFill>
  );
};

const typed = (text: string, frame: number, at: number, cps = 1.4) => text.slice(0, Math.max(0, Math.min(text.length, Math.floor((frame - at) * cps))));

const Cursor: React.FC = () => {
  const frame = useCurrentFrame();
  return <span style={{ display: "inline-block", width: "0.55em", height: "1em", background: TERM, verticalAlign: "-0.12em", opacity: Math.floor(frame / 8) % 2 ? 0 : 1 }} />;
};

const Line: React.FC<{ at: number; text: string; size?: number; color?: string; prompt?: string; cps?: number }> = ({ at, text, size = 46, color = TERM, prompt = "$ ", cps }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const shown = typed(text, frame, at, cps);
  return (
    <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: size, color, whiteSpace: "pre-wrap", lineHeight: 1.3 }}>
      <span style={{ color: TERM_DIM }}>{prompt}</span>
      {shown}
      {shown.length < text.length ? <Cursor /> : null}
    </div>
  );
};

// Our own little drawn scene: a kite over the sea at sunset. `t` moves the sun/kite; `steer` nudges the kite.
const MiniFrame: React.FC<{ t: number; w: number; h: number; steer?: number }> = ({ t, w, h, steer = 0 }) => {
  const sunX = 0.2 + 0.6 * ((t * 0.7) % 1);
  const kx = 0.5 + steer * 0.3 + Math.sin(t * 2.2) * 0.06;
  const ky = 0.32 + Math.cos(t * 3) * 0.04;
  return (
    <svg width={w} height={h} viewBox="0 0 400 240" style={{ display: "block", borderRadius: 10 }}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3B1F6B" />
          <stop offset="0.6" stopColor="#FF7A45" />
          <stop offset="1" stopColor="#FFD08A" />
        </linearGradient>
      </defs>
      <rect width={400} height={160} fill="url(#sky)" />
      <circle cx={sunX * 400} cy={130} r={30} fill="#FFE27A" />
      <rect y={150} width={400} height={90} fill="#123B5C" />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M 0 ${168 + i * 22} Q 50 ${160 + i * 22 + Math.sin(t * 6 + i) * 4} 100 ${168 + i * 22} T 200 ${168 + i * 22} T 300 ${168 + i * 22} T 400 ${168 + i * 22}`} stroke="rgba(255,255,255,0.35)" strokeWidth={3} fill="none" />
      ))}
      <g transform={`translate(${kx * 400} ${ky * 240}) rotate(${Math.sin(t * 4) * 8 + steer * 14})`}>
        <path d="M 0 -26 L 18 0 L 0 26 L -18 0 Z" fill="#FF3B3B" stroke="#fff" strokeWidth={2} />
        <path d="M 0 26 Q 10 50 -4 70 Q -14 88 4 104" stroke="#fff" strokeWidth={2} fill="none" />
      </g>
    </svg>
  );
};

const Window: React.FC<{ title: string; children: React.ReactNode; top?: number; height?: number; p?: number }> = ({ title, children, top = 250, height, p = 1 }) => (
  <div style={{ position: "absolute", top, left: 60, right: 60, height, border: `3px solid ${TERM}`, borderRadius: 18, background: "rgba(7,18,11,0.92)", boxShadow: `0 0 40px rgba(124,255,155,0.18)`, opacity: Math.min(1, p * 1.5), transform: `scaleY(${0.2 + 0.8 * p})`, transformOrigin: "top" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 22px", borderBottom: `2px solid ${TERM_DIM}`, fontFamily: F.mono, fontWeight: 700, fontSize: 30, color: TERM_DIM }}>
      <span style={{ width: 18, height: 18, borderRadius: 9, background: TERM_DIM }} />
      <span style={{ width: 18, height: 18, borderRadius: 9, background: TERM_DIM }} />
      <span style={{ marginLeft: 10 }}>{title}</span>
    </div>
    <div style={{ padding: "26px 30px" }}>{children}</div>
  </div>
);

const Layer: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const enter = ease(frame, 0, 8);
  const exit = ease(frame, dur - 6, dur + 4);
  // CRT-style: squash vertically on the way out
  return <AbsoluteFill style={{ opacity: enter * (1 - exit), transform: `scaleY(${1 - exit * 0.9})` }}>{children}</AbsoluteFill>;
};

/* ---------- scenes ---------- */

const S1: React.FC = () => {
  const frame = useCurrentFrame();
  const w = usePop(0, 14);
  const big = usePop(14, 12);
  return (
    <AbsoluteFill>
      <Window title="apple_research — zsh" p={w}>
        <Line at={4} text="open apple/FastFrames" />
        <Line at={26} text="new from Apple ✓" prompt="> " color={C.yellow} />
      </Window>
      <div style={{ position: "absolute", top: 620, left: 60, right: 60, textAlign: "center", transform: `scale(${big})`, opacity: Math.min(1, big * 1.5) }}>
        <div style={{ fontFamily: F.head, fontSize: 116, lineHeight: 1.02, color: C.white }}>
          VIDEO AS FAST
          <br />
          <span style={{ color: TERM }}>AS YOU WATCH IT</span>
        </div>
      </div>
      {/* frames rushing past */}
      <div style={{ position: "absolute", top: 960, left: 0, display: "flex", gap: 16, transform: `translateX(${-((frame * 22) % 296)}px)`, opacity: ease(frame, cue("s1", "fast"), cue("s1", "fast") + 8) }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ border: `3px solid ${TERM}`, borderRadius: 12, padding: 4 }}>
            <MiniFrame t={(frame + i * 6) / 30} w={270} h={162} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const PROMPT = '"a kite over the sea at sunset"';

const S2: React.FC = () => {
  const frame = useCurrentFrame();
  const describe = cue("s2", "describe");
  const stream = cue("s2", "streams");
  const n = Math.max(0, Math.min(6, Math.floor((frame - stream) / 5)));
  return (
    <AbsoluteFill>
      <Window title="fastframes — generate">
        <Line at={2} text="fastframes --prompt" />
        <Line at={describe} text={PROMPT} prompt="  " color={C.yellow} cps={2} size={44} />
      </Window>
      <div style={{ position: "absolute", top: 640, left: 60, right: 60, display: "flex", flexWrap: "wrap", gap: 18, justifyContent: "center" }}>
        {Array.from({ length: 6 }).map((_, i) => {
          const on = i < n;
          return (
            <div key={i} style={{ width: 300, opacity: on ? 1 : 0.15 }}>
              <div style={{ border: `3px solid ${on ? TERM : TERM_DIM}`, borderRadius: 12, padding: 4 }}>
                {on ? <MiniFrame t={i * 0.12} w={284} h={170} /> : <div style={{ width: 284, height: 170 }} />}
              </div>
              <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 28, color: TERM_DIM, marginTop: 6 }}>frame {String(i + 1).padStart(3, "0")}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const S3: React.FC = () => {
  const frame = useCurrentFrame();
  const msAt = cue("s3", "36");
  const ms = Math.round(interpolate(frame, [msAt - 4, msAt + 12], [0, 36], clamp));
  const p = usePop(msAt - 4, 12);
  const gpu = usePop(cue("s3", "single"), 11);
  const steerAt = cue("s3", "steer");
  const s = ease(frame, steerAt, steerAt + 10);
  const dir = Math.sin((frame - steerAt) / 9);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", fontFamily: F.mono, fontWeight: 700, fontSize: 40, color: TERM_DIM }}>time per frame (small model)</div>
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center", transform: `scale(${p})` }}>
        <span style={{ fontFamily: F.head, fontSize: 300, color: TERM, lineHeight: 1, textShadow: "0 0 40px rgba(124,255,155,0.4)" }}>{ms}</span>
        <span style={{ fontFamily: F.head, fontSize: 130, color: C.white }}> MS</span>
      </div>
      <div style={{ position: "absolute", top: 640, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${gpu})`, opacity: Math.min(1, gpu * 1.5) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, border: `3px solid ${TERM}`, borderRadius: 999, padding: "10px 34px", fontFamily: F.mono, fontWeight: 700, fontSize: 44, color: TERM }}>
          <Cpu size={52} weight="fill" color={TERM} /> on a single GPU
        </div>
      </div>
      <div style={{ position: "absolute", top: 780, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 26, opacity: s, transform: `translateY(${(1 - s) * 60}px)` }}>
        <ArrowFatLeft size={90} weight="fill" color={dir < 0 ? C.yellow : C.dim} />
        <div style={{ border: `3px solid ${TERM}`, borderRadius: 14, padding: 5 }}>
          <MiniFrame t={frame / 30} w={560} h={336} steer={dir} />
        </div>
        <ArrowFatRight size={90} weight="fill" color={dir > 0 ? C.yellow : C.dim} />
      </div>
      <div style={{ position: "absolute", top: 1180, left: 0, right: 0, textAlign: "center", fontFamily: F.head, fontSize: 64, color: C.yellow, opacity: ease(frame, steerAt + 8, steerAt + 18) }}>STEER IT WHILE IT PLAYS</div>
    </AbsoluteFill>
  );
};

const S4: React.FC = () => {
  const frame = useCurrentFrame();
  const a = ease(frame, 4, 22);
  const slowAt = cue("s4", "slower");
  const b = ease(frame, cue("s4", "top"), slowAt + 20);
  const same = usePop(cue("s4", "quality"), 11);
  const bars = [
    { label: "FastFrames", w: 0.12 * a, color: TERM, tag: "1x" },
    { label: "Top model", w: 0.95 * b, color: C.red, tag: "~8x slower" },
  ];
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 260, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${same}) rotate(-2deg)` }}>
        <div style={{ background: TERM, color: CRT, fontFamily: F.head, fontSize: 96, padding: "10px 44px 0", borderRadius: 16 }}>SAME QUALITY</div>
      </div>
      <div style={{ position: "absolute", top: 520, left: 80, right: 80, display: "flex", flexDirection: "column", gap: 60 }}>
        {bars.map((r) => (
          <div key={r.label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.mono, fontWeight: 700, fontSize: 44, color: C.white, marginBottom: 14 }}>
              <span>{r.label}</span>
              <span style={{ color: r.color }}>{r.tag}</span>
            </div>
            <div style={{ height: 70, borderRadius: 12, border: `2px solid ${TERM_DIM}`, overflow: "hidden" }}>
              <div style={{ width: `${r.w * 100}%`, height: "100%", background: r.color }} />
            </div>
          </div>
        ))}
        <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 36, color: TERM_DIM, textAlign: "center" }}>time to make the same video</div>
      </div>
    </AbsoluteFill>
  );
};

const S5: React.FC = () => {
  const frame = useCurrentFrame();
  const freeAt = cue("s5", "free");
  const warnAt = cue("s5", "powerful");
  const w = usePop(warnAt - 2, 11);
  const rows = [
    { at: cue("s5", "13b"), name: "FastFrames-S", size: "1.3B" },
    { at: cue("s5", "14b"), name: "FastFrames-L", size: "14B" },
  ];
  return (
    <AbsoluteFill>
      <Window title="huggingface.co/apple" height={560}>
        <Line at={2} text="ls models/" />
        {rows.map((r) => {
          const p = ease(frame, r.at - 2, r.at + 6);
          return (
            <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 26, opacity: p, transform: `translateX(${(1 - p) * 60}px)` }}>
              <span style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 50, color: C.white, flex: 1 }}>{r.name}</span>
              <span style={{ fontFamily: F.head, fontSize: 64, color: TERM, width: 140 }}>{r.size}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: F.head, fontSize: 52, color: CRT, background: frame >= freeAt ? C.yellow : "transparent", padding: "4px 18px 0", borderRadius: 10, opacity: frame >= freeAt ? 1 : 0 }}>
                <DownloadSimple size={40} weight="bold" color={CRT} /> FREE
              </span>
            </div>
          );
        })}
      </Window>
      <div style={{ position: "absolute", top: 900, left: 80, right: 80, display: "flex", justifyContent: "center", transform: `scale(${w})`, opacity: Math.min(1, w * 1.5) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, border: `3px solid ${C.yellow}`, background: "rgba(255,212,0,0.1)", borderRadius: 22, padding: "22px 34px" }}>
          <Warning size={68} weight="fill" color={C.yellow} />
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 46, color: C.white }}>Needs a powerful NVIDIA GPU</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const S6: React.FC = () => {
  const frame = useCurrentFrame();
  const c = usePop(cue("s6", "comment"), 10);
  const links = cue("s6", "links");
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${c}) rotate(${(1 - c) * 8 - 2}deg)` }}>
        <div style={{ border: `5px solid ${TERM}`, background: CRT, borderRadius: 30, padding: "30px 60px 16px", textAlign: "center", boxShadow: "0 0 60px rgba(124,255,155,0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, fontFamily: F.mono, fontWeight: 700, fontSize: 46, color: TERM_DIM }}>
            <ChatCircleDots size={54} weight="fill" color={TERM} /> comment
          </div>
          <div style={{ fontFamily: F.head, fontSize: 220, color: TERM, lineHeight: 1 }}>FAST</div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 760, left: 0, right: 0, textAlign: "center", fontFamily: F.body, fontWeight: 800, fontSize: 50, color: C.white, opacity: ease(frame, links - 6, links + 6) }}>
        I'll send you the <span style={{ color: C.yellow }}>download links</span>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- captions: a terminal line, words typed one by one with a block cursor ---------- */

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (frame >= END_FROM - 4) return null;
  let idx = -1;
  for (let i = 0; i < WORDS.length; i++) if (WORDS[i].start - 0.04 <= t) idx = i;
  if (idx < 0) return null;
  const group = Math.floor(idx / 4);
  const words = WORDS.slice(group * 4, idx + 1);
  const last = WORDS[Math.min(WORDS.length - 1, group * 4 + 3)];
  if (t > last.end + 0.6) return null;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 1370, display: "flex", justifyContent: "center" }}>
      <div style={{ background: "rgba(7,18,11,0.95)", border: `3px solid ${TERM}`, borderRadius: 12, padding: "10px 26px", fontFamily: F.mono, fontWeight: 700, fontSize: 54, color: TERM, whiteSpace: "nowrap" }}>
        <span style={{ color: TERM_DIM }}>&gt; </span>
        {words.map((w) => w.text.replace(/[,.:?!]$/, "")).join(" ")}
        <Cursor />
      </div>
    </div>
  );
};

/* ---------- sound ---------- */

const SOUND: { at: number; src: string; volume?: number }[] = [
  { at: 0, src: "whoosh", volume: 0.35 },
  ...Array.from({ length: 8 }).map((_, i) => ({ at: 4 + i * 2, src: "click", volume: 0.15 })),
  { at: 14, src: "impact", volume: 0.35 },
  ...SPANS.slice(1).map((s) => ({ at: s.from - 2, src: "whoosh", volume: 0.22 })),
  ...Array.from({ length: 6 }).map((_, i) => ({ at: cueAbs("s2", "streams") + 5 + i * 5, src: "pop", volume: 0.2 })),
  { at: cueAbs("s3", "36"), src: "impact", volume: 0.35 },
  { at: cueAbs("s3", "single"), src: "pop", volume: 0.3 },
  { at: cueAbs("s4", "quality"), src: "ding", volume: 0.3 },
  { at: cueAbs("s5", "free"), src: "ding", volume: 0.3 },
  { at: cueAbs("s5", "powerful"), src: "pop", volume: 0.3 },
  { at: cueAbs("s6", "comment"), src: "impact", volume: 0.4 },
  { at: END_FROM + 4, src: "impact", volume: 0.35 },
];

/* ---------- composition ---------- */

const SCENES: Record<string, React.FC> = { s1: S1, s2: S2, s3: S3, s4: S4, s5: S5, s6: S6 };

const Grid: React.FC = () => (
  <AbsoluteFill style={{ background: `${CRT}`, backgroundImage: "linear-gradient(rgba(124,255,155,0.05) 2px, transparent 2px), linear-gradient(90deg, rgba(124,255,155,0.05) 2px, transparent 2px)", backgroundSize: "60px 60px" }} />
);

export const FastFrames: React.FC = () => (
  <AbsoluteFill style={{ background: CRT }}>
    <Grid />
    {SPANS.map((s) => {
      const Scene = SCENES[s.id];
      return (
        <Sequence key={s.id} from={s.from} durationInFrames={s.dur + 8} layout="none">
          <Layer dur={s.dur}>
            <Scene />
          </Layer>
        </Sequence>
      );
    })}
    <Sequence from={END_FROM} layout="none">
      <AbsoluteFill style={{ background: C.bg }}>
        <EndCard />
      </AbsoluteFill>
    </Sequence>
    <Captions />
    <Scanlines />
    <Sequence from={timing.lead_in} layout="none">
      <Audio src={staticFile("vo/fastframes/vo.mp3")} />
    </Sequence>
    {SOUND.map((s, i) => (
      <Sfx key={i} {...s} />
    ))}
  </AbsoluteFill>
);

/* ---------- cover (grid keeps y 240-1680) ---------- */

export const FastFramesCover: React.FC = () => (
  <AbsoluteFill style={{ background: CRT }}>
    <Grid />
    <div style={{ position: "absolute", top: 470, left: 0, right: 0, textAlign: "center", fontFamily: F.mono, fontWeight: 700, fontSize: 46, color: TERM }}>
      <span style={{ color: TERM_DIM }}>$ </span>apple/fastframes
    </div>
    <div style={{ position: "absolute", top: 560, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div style={{ border: `4px solid ${TERM}`, borderRadius: 16, padding: 6, boxShadow: "0 0 50px rgba(124,255,155,0.3)" }}>
        <MiniFrame t={0.6} w={840} h={504} />
      </div>
    </div>
    <div style={{ position: "absolute", top: 1150, left: 50, right: 50, textAlign: "center" }}>
      <div style={{ fontFamily: F.head, fontSize: 132, lineHeight: 1.02, color: C.white }}>
        APPLE'S <span style={{ color: TERM }}>REAL-TIME</span>
        <br />
        <span style={{ display: "inline-block", background: C.yellow, color: C.ink, padding: "8px 30px 0", borderRadius: 16, marginTop: 10 }}>AI VIDEO</span>
      </div>
    </div>
    <Scanlines />
  </AbsoluteFill>
);
