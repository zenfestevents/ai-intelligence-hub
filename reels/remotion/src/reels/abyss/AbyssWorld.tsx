import React from "react";
import { AbsoluteFill, Audio, interpolate, random, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Browser, Camera, ChatCircleDots, Cube, FileText, Function as FnIcon, GameController, ImageSquare } from "@phosphor-icons/react";
import timing from "../abyss-timing.json";
import { C, F } from "../../themes/aitools";
import { clamp, EndCard, ease, makeTimeline, Sfx, Timing, usePop } from "../common";

// Reel: Claude Fable 5.2 built "Abyssal Garden", a 96 KB underwater world that runs in a browser.
// Facts: strategy/posts_2026-11-17.md, Post 3 (Tom's Hardware, 16 Nov 2026). Style: "deep sea" — the whole reel
// is underwater: swaying kelp and rising bubbles drawn with math (our own art, not the real demo), glass panels
// that float up like bubbles, and captions that rise and fade like air. Brand names as plain text only.
const T = makeTimeline(timing as Timing);
export const ABYSS_TOTAL = timing.total;
const { span, cue, cueAbs, END_FROM, SPANS, WORDS, FPS } = T;

const DEEP = "#03141C";
const SEA = "#06303D";
const CYAN = "#5CE1E6";

/* ---------- the sea, drawn with math ---------- */

const KELP = Array.from({ length: 9 }).map((_, i) => ({
  x: 40 + i * 125 + random(`kx${i}`) * 50,
  h: 200 + random(`kh${i}`) * 220,
  w: 22 + random(`kw${i}`) * 18,
  ph: random(`kp${i}`) * 6.28,
  hue: random(`kc${i}`),
}));
const BUBBLES = Array.from({ length: 46 }).map((_, i) => ({
  x: random(`bx${i}`) * 1080,
  r: 4 + random(`br${i}`) * 14,
  sp: 2 + random(`bs${i}`) * 4,
  off: random(`bo${i}`) * 1920,
  wob: random(`bw${i}`) * 6.28,
}));
const MOTES = Array.from({ length: 70 }).map((_, i) => ({ x: random(`mx${i}`) * 1080, y: random(`my${i}`) * 1920, s: 1.5 + random(`ms${i}`) * 3 }));

const Sea: React.FC<{ glow?: number }> = ({ glow = 0 }) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${SEA} 0%, ${DEEP} 70%)` }} />
      {/* light shafts */}
      <AbsoluteFill style={{ opacity: 0.18 + glow * 0.1 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ position: "absolute", top: -200, left: 120 + i * 240 + Math.sin(t * 0.5 + i) * 40, width: 120, height: 1600, background: "linear-gradient(180deg, rgba(160,240,255,0.55), transparent)", transform: `rotate(${12 + i * 2}deg)`, filter: "blur(18px)" }} />
        ))}
      </AbsoluteFill>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {MOTES.map((m, i) => (
          <circle key={i} cx={(m.x + Math.sin(t * 0.3 + i) * 12) % 1080} cy={(m.y - t * 6 + 1920) % 1920} r={m.s} fill="rgba(180,240,255,0.35)" />
        ))}
        {KELP.map((k, i) => {
          const pts: string[] = [];
          const seg = 14;
          for (let j = 0; j <= seg; j++) {
            const yy = 1920 - (k.h * j) / seg;
            const sway = Math.sin(t * 1.1 + k.ph + j * 0.35) * j * 2.6;
            pts.push(`${k.x + sway},${yy}`);
          }
          const col = k.hue > 0.5 ? "#1F8A6E" : "#2BA37A";
          return <polyline key={i} points={pts.join(" ")} fill="none" stroke={col} strokeWidth={k.w} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />;
        })}
        {BUBBLES.map((b, i) => {
          const y = (b.off - frame * b.sp + 4000) % 2100 - 90;
          const x = b.x + Math.sin(frame / 14 + b.wob) * 10;
          return <circle key={i} cx={x} cy={y} r={b.r} fill="none" stroke="rgba(200,250,255,0.6)" strokeWidth={2.5} />;
        })}
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(circle 900px at 540px 900px, transparent 40%, rgba(0,0,0,0.55) 100%)" }} />
    </AbsoluteFill>
  );
};

// A glass panel that rises into place like a bubble.
const Glass: React.FC<{ at: number; top: number; left?: number; right?: number; children: React.ReactNode; pad?: string }> = ({ at, top, left = 80, right = 80, children, pad = "34px 40px" }) => {
  const frame = useCurrentFrame();
  const p = usePop(at, 13);
  if (frame < at - 1) return null;
  return (
    <div style={{ position: "absolute", top, left, right, transform: `translateY(${(1 - p) * 260}px) scale(${0.85 + 0.15 * p})`, opacity: Math.min(1, p * 1.4) }}>
      <div style={{ background: "rgba(8,40,52,0.72)", border: `2px solid rgba(92,225,230,0.45)`, borderRadius: 34, padding: pad, boxShadow: "0 20px 60px rgba(0,0,0,0.5), inset 0 0 40px rgba(92,225,230,0.08)" }}>{children}</div>
    </div>
  );
};

const Layer: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const enter = ease(frame, 0, 10);
  const exit = ease(frame, dur - 6, dur + 8);
  return <AbsoluteFill style={{ opacity: enter * (1 - exit), transform: `translateY(${-exit * 220}px)`, filter: `blur(${exit * 10}px)` }}>{children}</AbsoluteFill>;
};

const Big: React.FC<{ top: number; children: React.ReactNode; size?: number; at?: number }> = ({ top, children, size = 104, at = 0 }) => {
  const frame = useCurrentFrame();
  const t = ease(frame, at, at + 12);
  return (
    <div style={{ position: "absolute", top, left: 40, right: 40, textAlign: "center", fontFamily: F.head, fontSize: size, lineHeight: 1.05, color: C.white, opacity: t, transform: `translateY(${(1 - t) * 40}px)`, textShadow: "0 0 30px rgba(92,225,230,0.35)" }}>
      {children}
    </div>
  );
};

/* ---------- scenes ---------- */

const S1: React.FC = () => {
  const frame = useCurrentFrame();
  const ai = cue("s1", "ai");
  const sm = cue("s1", "smaller");
  return (
    <AbsoluteFill>
      <Big top={300}>
        A WHOLE
        <br />
        <span style={{ color: CYAN }}>UNDERWATER WORLD</span>
      </Big>
      <Big top={540} size={88} at={ai}>
        BUILT BY <span style={{ color: C.yellow }}>AI</span>
      </Big>
      <Glass at={sm} top={760} left={90} right={90}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 22 }}>
          <Camera size={70} weight="fill" color={C.yellow} />
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 46, color: C.white }}>Smaller than 1 phone photo</span>
        </div>
      </Glass>
    </AbsoluteFill>
  );
};

const S2: React.FC = () => {
  const frame = useCurrentFrame();
  const fable = cue("s2", "fable");
  const lines = cue("s2", "40");
  const n = Math.round(interpolate(frame, [lines - 4, lines + 22], [0, 40], clamp));
  return (
    <AbsoluteFill>
      <Glass at={2} top={270}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <ChatCircleDots size={70} weight="fill" color={C.yellow} />
          <div>
            <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 36, color: CYAN }}>One developer asked</div>
            <div style={{ fontFamily: F.head, fontSize: 84, color: C.white, lineHeight: 1.05, opacity: ease(frame, fable - 2, fable + 8) }}>CLAUDE FABLE 5.2</div>
          </div>
        </div>
      </Glass>
      {/* the prompt as a page of lines (shapes only, not the real prompt text) */}
      <Glass at={lines - 6} top={590} left={170} right={170} pad="30px 36px">
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <FileText size={50} weight="fill" color={C.yellow} />
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 40, color: C.white }}>The prompt</span>
          <span style={{ marginLeft: "auto", fontFamily: F.head, fontSize: 64, color: C.yellow }}>{n} lines</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, height: 300, overflow: "hidden" }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} style={{ height: 8, width: `${45 + random(`ln${i}`) * 55}%`, borderRadius: 4, background: i * 2 < n ? "rgba(92,225,230,0.7)" : "rgba(255,255,255,0.08)" }} />
          ))}
        </div>
      </Glass>
      <Big top={1060} size={78} at={cue("s2", "sea")}>
        "BUILD A <span style={{ color: CYAN }}>3D WORLD</span> UNDER THE SEA"
      </Big>
    </AbsoluteFill>
  );
};

const S3: React.FC = () => {
  const frame = useCurrentFrame();
  const kb = cue("s3", "96");
  const kbT = ease(frame, kb - 2, kb + 14);
  return (
    <AbsoluteFill>
      <Big top={270} size={120}>
        <span style={{ color: CYAN }}>ABYSSAL GARDEN</span>
      </Big>
      <Glass at={cue("s3", "browser")} top={460} left={200} right={200} pad="22px 30px">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
          <Browser size={60} weight="fill" color={C.yellow} />
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 44, color: C.white }}>Runs in your browser</span>
        </div>
      </Glass>
      {/* file size comparison */}
      <div style={{ position: "absolute", top: 700, left: 100, right: 100, opacity: ease(frame, kb - 8, kb + 4) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 14 }}>
          <ImageSquare size={56} weight="fill" color={C.grey} />
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 40, color: C.grey }}>A typical phone photo: 2-5 MB</span>
        </div>
        <div style={{ height: 64, borderRadius: 16, background: "rgba(255,255,255,0.14)", width: "100%" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 40, marginBottom: 14 }}>
          <Cube size={56} weight="fill" color={C.yellow} />
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 40, color: C.white }}>This whole world</span>
        </div>
        <div style={{ height: 64, borderRadius: 16, background: C.yellow, width: `${Math.max(1, 3.2 * kbT)}%`, boxShadow: `0 0 30px ${C.yellow}` }} />
      </div>
      <Big top={1080} size={170} at={kb}>
        <span style={{ color: C.yellow }}>96 KB</span>
      </Big>
    </AbsoluteFill>
  );
};

const S4: React.FC = () => {
  const frame = useCurrentFrame();
  const no = cue("s4", "no");
  const math = cue("s4", "math");
  const x = usePop(no + 6, 10);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 280, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 40 }}>
        {[Cube, ImageSquare].map((Icon, i) => (
          <div key={i} style={{ width: 230, height: 230, borderRadius: 40, background: "rgba(8,40,52,0.72)", border: "2px solid rgba(92,225,230,0.45)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <Icon size={130} weight="duotone" color={C.grey} />
            <svg width={230} height={230} style={{ position: "absolute", inset: 0 }}>
              <line x1={30} y1={30} x2={30 + 170 * x} y2={30 + 170 * x} stroke={C.red} strokeWidth={16} strokeLinecap="round" />
            </svg>
          </div>
        ))}
      </div>
      <Big top={560} size={84} at={no}>
        NO 3D MODELS. <span style={{ color: C.red }}>NO PICTURES.</span>
      </Big>
      <Glass at={math - 2} top={760} left={110} right={110}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <FnIcon size={90} weight="bold" color={C.yellow} />
          <div>
            <div style={{ fontFamily: F.head, fontSize: 76, color: C.white, lineHeight: 1.05 }}>DRAWN WITH MATH</div>
            <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 38, color: CYAN }}>the moment the page opens</div>
          </div>
        </div>
      </Glass>
      <div style={{ position: "absolute", top: 1050, left: 0, right: 0, textAlign: "center", fontFamily: F.mono, fontSize: 40, color: "rgba(92,225,230,0.8)", opacity: ease(frame, math + 6, math + 16) }}>
        y = sin(t + x) · depth
      </div>
    </AbsoluteFill>
  );
};

const S5: React.FC = () => {
  const frame = useCurrentFrame();
  const at = cue("s5", "180");
  const fps = Math.round(interpolate(frame, [at - 10, at + 12], [0, 180], clamp));
  const p = usePop(at - 10, 12);
  return (
    <AbsoluteFill>
      <Glass at={cue("s5", "gaming") - 4} top={300} left={240} right={240} pad="20px 30px">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
          <GameController size={60} weight="fill" color={C.yellow} />
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 44, color: C.white }}>On a gaming PC</span>
        </div>
      </Glass>
      <div style={{ position: "absolute", top: 520, left: 0, right: 0, textAlign: "center", transform: `scale(${0.6 + 0.4 * p})`, opacity: p }}>
        <div style={{ fontFamily: F.head, fontSize: 340, lineHeight: 1, color: C.yellow, textShadow: `0 0 50px rgba(255,212,0,0.5)` }}>{fps}</div>
        <div style={{ fontFamily: F.head, fontSize: 84, color: C.white }}>FRAMES PER SECOND</div>
      </div>
    </AbsoluteFill>
  );
};

const S6: React.FC = () => {
  const frame = useCurrentFrame();
  const c = usePop(cue("s6", "comment"), 10);
  return (
    <AbsoluteFill>
      <Big top={310} size={96}>
        WANT THE <span style={{ color: CYAN }}>LINK?</span>
      </Big>
      <div style={{ position: "absolute", top: 560, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${c}) rotate(${(1 - c) * -12 + 2}deg)` }}>
        <div style={{ background: C.yellow, borderRadius: 34, padding: "26px 56px 14px", textAlign: "center", boxShadow: "0 0 60px rgba(255,212,0,0.4)" }}>
          <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 46, color: C.ink }}>Comment</div>
          <div style={{ fontFamily: F.head, fontSize: 190, color: C.ink, lineHeight: 1 }}>WORLD</div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 1000, left: 0, right: 0, textAlign: "center", fontFamily: F.body, fontWeight: 800, fontSize: 46, color: C.white, opacity: ease(frame, cue("s6", "send"), cue("s6", "send") + 10) }}>
        I'll send it to you in DMs
      </div>
    </AbsoluteFill>
  );
};

/* ---------- captions: two words at a time, rising like air ---------- */

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (frame >= END_FROM - 4) return null;
  let idx = -1;
  for (let i = 0; i < WORDS.length; i++) if (WORDS[i].start - 0.04 <= t) idx = i;
  if (idx < 0) return null;
  const g = Math.floor(idx / 2);
  const words = WORDS.slice(g * 2, g * 2 + 2);
  const start = words[0].start;
  const end = words[words.length - 1].end;
  if (t > end + 0.5) return null;
  const rise = ease(frame, Math.round(start * FPS) - 2, Math.round(start * FPS) + 6);
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 1360, textAlign: "center", transform: `translateY(${(1 - rise) * 50}px)`, opacity: rise }}>
      <span style={{ fontFamily: F.head, fontSize: 96, color: C.white, textTransform: "uppercase", textShadow: "0 0 24px rgba(92,225,230,0.8), 0 6px 0 rgba(0,0,0,0.8)", whiteSpace: "nowrap" }}>
        {words.map((w, i) => (
          <span key={i} style={{ color: g * 2 + i === idx ? C.yellow : C.white, marginRight: i === 0 ? 24 : 0, opacity: g * 2 + i <= idx ? 1 : 0.35 }}>
            {w.text.replace(/[,.:?!]$/, "")}
          </span>
        ))}
      </span>
    </div>
  );
};

/* ---------- sound ---------- */

const SOUND: { at: number; src: string; volume?: number }[] = [
  { at: 2, src: "whoosh", volume: 0.4 },
  { at: cueAbs("s1", "ai"), src: "ding", volume: 0.3 },
  { at: cueAbs("s1", "smaller"), src: "pop", volume: 0.3 },
  ...SPANS.slice(1).map((s) => ({ at: s.from - 2, src: "whoosh", volume: 0.25 })),
  { at: cueAbs("s2", "fable"), src: "pop", volume: 0.3 },
  { at: cueAbs("s2", "40"), src: "click", volume: 0.4 },
  { at: cueAbs("s3", "browser"), src: "pop", volume: 0.3 },
  { at: cueAbs("s3", "96"), src: "impact", volume: 0.45 },
  { at: cueAbs("s4", "no") + 6, src: "click", volume: 0.45 },
  { at: cueAbs("s4", "math"), src: "ding", volume: 0.35 },
  { at: cueAbs("s5", "180"), src: "impact", volume: 0.45 },
  { at: cueAbs("s6", "comment"), src: "pop", volume: 0.4 },
  { at: END_FROM + 4, src: "impact", volume: 0.35 },
];

/* ---------- composition ---------- */

const SCENES: Record<string, React.FC> = { s1: S1, s2: S2, s3: S3, s4: S4, s5: S5, s6: S6 };

export const AbyssWorld: React.FC = () => (
  <AbsoluteFill style={{ background: DEEP }}>
    <Sea />
    {SPANS.map((s) => {
      const Scene = SCENES[s.id];
      return (
        <Sequence key={s.id} from={s.from} durationInFrames={s.dur + 10} layout="none">
          <Layer dur={s.dur}>
            <Scene />
          </Layer>
        </Sequence>
      );
    })}
    <Sequence from={END_FROM} layout="none">
      <AbsoluteFill style={{ background: "rgba(3,20,28,0.6)" }} />
      <EndCard />
    </Sequence>
    <Captions />
    <Sequence from={timing.lead_in} layout="none">
      <Audio src={staticFile("vo/abyss/vo.mp3")} />
    </Sequence>
    {SOUND.map((s, i) => (
      <Sfx key={i} {...s} />
    ))}
  </AbsoluteFill>
);

/* ---------- cover (grid keeps y 240-1680) ---------- */

export const AbyssWorldCover: React.FC = () => (
  <AbsoluteFill style={{ background: DEEP }}>
    <Sea glow={1} />
    <div style={{ position: "absolute", top: 330, left: 40, right: 40, textAlign: "center", fontFamily: F.head, fontSize: 132, lineHeight: 1.03, color: C.white, textShadow: "0 0 40px rgba(92,225,230,0.45), 0 6px 0 rgba(0,0,0,0.6)" }}>
      AI BUILT THIS
      <br />
      <span style={{ color: CYAN }}>OCEAN WORLD</span>
    </div>
    <div style={{ position: "absolute", top: 760, left: 0, right: 0, textAlign: "center" }}>
      <div style={{ display: "inline-block", background: C.yellow, borderRadius: 30, padding: "16px 50px 4px", fontFamily: F.head, fontSize: 200, lineHeight: 1, color: C.ink, transform: "rotate(-3deg)", boxShadow: "0 0 60px rgba(255,212,0,0.45)" }}>
        96 KB
      </div>
    </div>
    <div style={{ position: "absolute", top: 1080, left: 0, right: 0, textAlign: "center", fontFamily: F.body, fontWeight: 800, fontSize: 54, color: C.white, textShadow: "0 4px 12px rgba(0,0,0,0.8)" }}>
      from a <span style={{ color: C.yellow }}>40-line prompt</span>
    </div>
  </AbsoluteFill>
);
