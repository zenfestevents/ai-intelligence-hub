import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { ChatCircleDots, FilmStrip, GameController, GraphicsCard, Link, MagicWand, Monitor, Sparkle, Sun, VideoCamera, WindowsLogo } from "@phosphor-icons/react";
import timing from "../veyra-timing.json";
import { C, F } from "../../themes/aitools";
import { clamp, EndCard, ease, makeTimeline, Sfx, Timing, usePop } from "../common";

// Reel: Veyra (github.com/Likely7/Veyra-NRVideo), free open-source real-time video enhancement for Windows.
// Facts from its README, 18 Nov 2026: super resolution, denoising, HDR, frame generation; local video, capture
// cards, PS5 Remote Play and PC streaming; "Windows 11 x64 and DirectX 12 are required"; NVIDIA & AMD; GPL-3.0;
// "Veyra remains free and open-source"; most tests on an RTX 5070, heavier settings need more GPU/VRAM.
// (Its README also promotes a community token; we don't mention or link it.)
// Style: panel cards + diagonal wipes; the screen is our own drawn scene, blurry/noisy before, sharp after.
// Captions: rising two-word chunks.
const T = makeTimeline(timing as Timing);
export const VEYRA_TOTAL = timing.total;
const { cue, cueAbs, END_FROM, SPANS, WORDS, FPS } = T;

/* ---------- building blocks ---------- */

const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: -400,
            width: 2000,
            height: 140,
            top: ((frame * 2 + i * 640) % 2200) - 200,
            background: "rgba(255,212,0,0.035)",
            transform: "rotate(-24deg)",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

// Our own drawn scene: a city at dusk.
const Scene: React.FC<{ w: number; h: number; t: number }> = ({ w, h, t }) => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "linear-gradient(180deg, #2B2F6B 0%, #C2569B 45%, #FFB25E 75%)" }}>
    <div style={{ position: "absolute", left: w * 0.62, top: h * 0.2, width: w * 0.16, height: w * 0.16, borderRadius: "50%", background: "#FFE7A3", boxShadow: "0 0 60px #FFD27A" }} />
    {Array.from({ length: 9 }).map((_, i) => {
      const bw = w / 9;
      const bh = h * (0.28 + ((i * 37) % 30) / 100);
      return (
        <div key={i} style={{ position: "absolute", left: i * bw, bottom: 0, width: bw - 6, height: bh, background: "#14152A" }}>
          {Array.from({ length: 6 }).map((__, j) => (
            <div key={j} style={{ position: "absolute", left: 10 + (j % 2) * (bw / 2 - 6), top: 16 + Math.floor(j / 2) * 34, width: bw / 2 - 22, height: 16, background: (i + j + Math.floor(t / 20)) % 4 === 0 ? "#FFD400" : "#3B3E66" }} />
          ))}
        </div>
      );
    })}
  </div>
);

// A monitor whose picture is wiped diagonally from "before" (blurred, noisy) to "after" (sharp).
const Screen: React.FC<{ w: number; h: number; wipe: number; label?: boolean }> = ({ w, h, wipe, label = true }) => {
  const frame = useCurrentFrame();
  const cut = -0.35 + wipe * 1.7; // diagonal position across the screen
  const clipAfter = `polygon(0 0, ${cut * 100 + 30}% 0, ${cut * 100 - 30}% 100%, 0 100%)`;
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 24, overflow: "hidden", border: `6px solid ${C.panel2}`, boxShadow: "0 30px 70px rgba(0,0,0,0.6)" }}>
      <div style={{ position: "absolute", inset: 0, filter: "blur(9px) saturate(0.55) brightness(0.8)" }}>
        <Scene w={w} h={h} t={frame} />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.35,
          backgroundImage: "repeating-radial-gradient(circle at 17% 32%, rgba(255,255,255,0.5) 0 1px, transparent 1px 4px)",
          backgroundPosition: `${(frame * 7) % 40}px ${(frame * 3) % 40}px`,
        }}
      />
      <div style={{ position: "absolute", inset: 0, clipPath: clipAfter }}>
        <Scene w={w} h={h} t={frame} />
      </div>
      {wipe > 0 && wipe < 1 && (
        <div style={{ position: "absolute", top: -40, bottom: -40, left: `${cut * 100}%`, width: 10, background: C.yellow, transform: "rotate(17deg)", boxShadow: `0 0 30px ${C.yellow}` }} />
      )}
      {label && (
        <>
          <div style={{ position: "absolute", top: 18, right: 18, fontFamily: F.body, fontWeight: 900, fontSize: 30, color: C.white, background: "rgba(0,0,0,0.55)", padding: "6px 14px", borderRadius: 10, opacity: 1 - wipe }}>BEFORE</div>
          <div style={{ position: "absolute", top: 18, left: 18, fontFamily: F.body, fontWeight: 900, fontSize: 30, color: C.ink, background: C.yellow, padding: "6px 14px", borderRadius: 10, opacity: wipe }}>AFTER</div>
        </>
      )}
    </div>
  );
};

// A panel card that enters with a diagonal wipe.
const Panel: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties; color?: string }> = ({ at, children, style, color = C.panel }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at - 4, at + 10);
  return (
    <div
      style={{
        background: color,
        borderRadius: 22,
        border: `2px solid ${C.line}`,
        clipPath: `polygon(0 0, ${p * 130}% 0, ${p * 130 - 30}% 100%, 0 100%)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Layer: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const exit = ease(frame, dur - 6, dur + 8);
  return <AbsoluteFill style={{ clipPath: `polygon(${exit * 130}% 0, 100% 0, 100% 100%, ${exit * 130 - 30}% 100%)` }}>{children}</AbsoluteFill>;
};

const Title: React.FC<{ top: number; children: React.ReactNode; at?: number; size?: number }> = ({ top, children, at = 0, size = 100 }) => {
  const frame = useCurrentFrame();
  const t = ease(frame, at, at + 10);
  return (
    <div style={{ position: "absolute", top, left: 60, right: 60, textAlign: "center", fontFamily: F.head, fontSize: size, lineHeight: 1.04, color: C.white, opacity: t, transform: `translateX(${(1 - t) * -60}px)` }}>
      {children}
    </div>
  );
};

/* ---------- scenes ---------- */

const S1: React.FC = () => {
  const frame = useCurrentFrame();
  const at = cue("s1", "sharper");
  const wipe = ease(frame, at - 10, at + 22);
  return (
    <AbsoluteFill>
      <Title top={270}>
        ANY VIDEO. <span style={{ color: C.yellow }}>SHARPER.</span>
      </Title>
      <div style={{ position: "absolute", top: 450, left: 90 }}>
        <Screen w={900} h={560} wipe={wipe} />
      </div>
      <div style={{ position: "absolute", top: 1080, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 20 }}>
        {[
          { k: "free", t: "FREE APP" },
          { k: "live", t: "LIVE, AS IT PLAYS" },
        ].map((c) => (
          <Panel key={c.k} at={cue("s1", c.k)} color={C.yellow} style={{ padding: "14px 30px" }}>
            <span style={{ fontFamily: F.head, fontSize: 60, color: C.ink }}>{c.t}</span>
          </Panel>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const FEATURES = [
  { key: "noise", icon: MagicWand, title: "Cleans up noise" },
  { key: "detail", icon: Sparkle, title: "Adds detail" },
  { key: "hdr", icon: Sun, title: "HDR colour" },
];

const S2: React.FC = () => {
  const frame = useCurrentFrame();
  const name = usePop(cue("s2", "veyra") - 2, 11);
  const rt = cue("s2", "real");
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 270, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${name})` }}>
        <div style={{ fontFamily: F.head, fontSize: 200, color: C.yellow, lineHeight: 1, letterSpacing: 6 }}>VEYRA</div>
      </div>
      <div style={{ position: "absolute", top: 530, left: 110, right: 110, display: "flex", flexDirection: "column", gap: 28 }}>
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <Panel key={f.key} at={cue("s2", f.key)} style={{ display: "flex", alignItems: "center", gap: 28, padding: "30px 36px" }}>
              <Icon size={84} weight="fill" color={C.yellow} />
              <span style={{ fontFamily: F.head, fontSize: 80, color: C.white }}>{f.title}</span>
            </Panel>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 1150, left: 0, right: 0, textAlign: "center", fontFamily: F.body, fontWeight: 900, fontSize: 54, color: C.white, opacity: ease(frame, rt - 3, rt + 8) }}>
        all in <span style={{ color: C.yellow }}>real time</span>
      </div>
    </AbsoluteFill>
  );
};

const S3: React.FC = () => {
  const frame = useCurrentFrame();
  const at = cue("s3", "extra");
  const add = ease(frame, at - 2, at + 14);
  const sm = cue("s3", "smoother");
  // a ball bouncing across the frames: choppy before, smooth after
  const n = 4;
  return (
    <AbsoluteFill>
      <Title top={270}>
        + EXTRA <span style={{ color: C.yellow }}>FRAMES</span>
      </Title>
      <div style={{ position: "absolute", top: 480, left: 60, right: 60, display: "flex", justifyContent: "center", alignItems: "center", gap: 10 * add + 4 }}>
        {Array.from({ length: n * 2 - 1 }).map((_, i) => {
          const real = i % 2 === 0;
          const w = real ? 140 : 110 * add;
          const x = (i / (n * 2 - 2)) * 100;
          return (
            <div key={i} style={{ width: w, height: 210, borderRadius: 16, overflow: "hidden", background: real ? C.panel2 : C.yellow, opacity: real ? 1 : add, position: "relative", flexShrink: 0 }}>
              <div style={{ position: "absolute", left: `${15 + x * 0.55}%`, top: `${70 - Math.sin((x / 100) * Math.PI) * 45}%`, width: 40, height: 40, borderRadius: 20, background: real ? C.white : C.ink }} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 780, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 26, fontFamily: F.body, fontWeight: 800, fontSize: 40 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10, color: C.grey }}>
          <span style={{ width: 30, height: 30, borderRadius: 6, background: C.panel2 }} /> original
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 10, color: C.yellow, opacity: add }}>
          <span style={{ width: 30, height: 30, borderRadius: 6, background: C.yellow }} /> added
        </span>
      </div>
      <div style={{ position: "absolute", top: 930, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Panel at={sm} color={C.yellow} style={{ padding: "18px 44px" }}>
          <span style={{ fontFamily: F.head, fontSize: 100, color: C.ink }}>SMOOTHER</span>
        </Panel>
      </div>
      <div style={{ position: "absolute", top: 1170, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 50, opacity: ease(frame, cue("s3", "videos") - 4, cue("s3", "videos") + 6) }}>
        <FilmStrip size={80} weight="fill" color={C.grey} />
        <GameController size={80} weight="fill" color={C.grey} />
      </div>
    </AbsoluteFill>
  );
};

const SOURCES = [
  { key: "videos", icon: FilmStrip, text: "Your own videos" },
  { key: "capture", icon: VideoCamera, text: "A capture card" },
  { key: "ps5", icon: GameController, text: "PS5 or PC game streams" },
];

const S4: React.FC = () => (
  <AbsoluteFill>
    <Title top={270}>USE IT ON</Title>
    <div style={{ position: "absolute", top: 440, left: 90, right: 90, display: "flex", flexDirection: "column", gap: 30 }}>
      {SOURCES.map((s, i) => {
        const Icon = s.icon;
        return (
          <Panel key={s.key} at={cue("s4", s.key)} style={{ display: "flex", alignItems: "center", gap: 30, padding: "34px 40px", marginLeft: i * 30, marginRight: (2 - i) * 30 }}>
            <div style={{ width: 120, height: 120, borderRadius: 24, background: C.yellow, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={76} weight="fill" color={C.ink} />
            </div>
            <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 56, color: C.white }}>{s.text}</span>
          </Panel>
        );
      })}
    </div>
  </AbsoluteFill>
);

const S5: React.FC = () => {
  const frame = useCurrentFrame();
  const st = cue("s5", "stronger");
  const meter = ease(frame, st, st + 30);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 270, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Panel at={cue("s5", "free")} color={C.yellow} style={{ padding: "16px 40px" }}>
          <span style={{ fontFamily: F.head, fontSize: 96, color: C.ink }}>FREE + OPEN SOURCE</span>
        </Panel>
      </div>
      <div style={{ position: "absolute", top: 470, left: 90, right: 90, display: "flex", gap: 26 }}>
        <Panel at={cue("s5", "windows")} style={{ flex: 1, padding: "34px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <WindowsLogo size={110} weight="fill" color={C.yellow} />
          <span style={{ fontFamily: F.head, fontSize: 64, color: C.white }}>Windows 11</span>
        </Panel>
        <Panel at={cue("s5", "nvidia")} style={{ flex: 1, padding: "34px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <GraphicsCard size={110} weight="fill" color={C.yellow} />
          <span style={{ fontFamily: F.head, fontSize: 60, color: C.white }}>NVIDIA or AMD</span>
        </Panel>
      </div>
      <div style={{ position: "absolute", top: 860, left: 110, right: 110, opacity: ease(frame, st - 4, st + 6) }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.body, fontWeight: 800, fontSize: 40, color: C.grey, marginBottom: 16 }}>
          <span>Graphics card</span>
          <span style={{ color: C.yellow }}>stronger = better</span>
        </div>
        <div style={{ height: 70, borderRadius: 35, background: C.panel2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${12 + meter * 88}%`, background: `linear-gradient(90deg, ${C.grey}, ${C.yellow})`, borderRadius: 35 }} />
        </div>
      </div>
      <div style={{ position: "absolute", top: 1060, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 18, alignItems: "center", opacity: ease(frame, st + 10, st + 20) }}>
        <Monitor size={56} weight="fill" color={C.grey} />
        <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 40, color: C.grey }}>needs a Windows PC</span>
      </div>
    </AbsoluteFill>
  );
};

const S6: React.FC = () => {
  const frame = useCurrentFrame();
  const at = cue("s6", "sharp");
  const typed = "SHARP".slice(0, Math.max(0, Math.floor((frame - at + 4) / 3)));
  const box = usePop(2, 12);
  const link = usePop(cue("s6", "link"), 10);
  return (
    <AbsoluteFill>
      <Title top={290}>COMMENT</Title>
      <div style={{ position: "absolute", top: 450, left: 110, right: 110, display: "flex", alignItems: "center", gap: 24, background: C.panel, border: `3px solid ${C.yellow}`, borderRadius: 30, padding: "30px 36px", transform: `scale(${box})` }}>
        <ChatCircleDots size={76} weight="fill" color={C.yellow} />
        <span style={{ fontFamily: F.head, fontSize: 120, color: C.white, letterSpacing: 6 }}>
          {typed}
          <span style={{ opacity: frame % 20 < 10 ? 1 : 0, color: C.yellow }}>|</span>
        </span>
      </div>
      <div style={{ position: "absolute", top: 760, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 20, transform: `scale(${link})` }}>
        <Link size={70} weight="bold" color={C.yellow} />
        <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 56, color: C.white }}>I'll DM you the link</span>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- captions: two words at a time, rising in ---------- */

const CHUNKS = (() => {
  const out: { text: string; start: number; end: number }[] = [];
  let cur: typeof WORDS = [];
  for (const w of WORDS) {
    cur.push(w);
    if (cur.length >= 2 || /[.,?!:]$/.test(w.text)) {
      out.push({ text: cur.map((x) => x.text.replace(/[,.:?!]$/, "")).join(" "), start: cur[0].start, end: cur[cur.length - 1].end });
      cur = [];
    }
  }
  if (cur.length) out.push({ text: cur.map((x) => x.text).join(" "), start: cur[0].start, end: cur[cur.length - 1].end });
  return out;
})();

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (frame >= END_FROM - 4) return null;
  const i = CHUNKS.findIndex((c, k) => t >= c.start - 0.04 && (k === CHUNKS.length - 1 || t < CHUNKS[k + 1].start - 0.04));
  if (i < 0) return null;
  const c = CHUNKS[i];
  if (t > c.end + 0.5) return null;
  const s = Math.round(c.start * FPS);
  const p = interpolate(frame, [s - 2, s + 5], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1360, display: "flex", justifyContent: "center", overflow: "hidden", height: 120 }}>
      <div style={{ fontFamily: F.head, fontSize: 92, color: C.white, textTransform: "uppercase", transform: `translateY(${(1 - p) * 100}px)`, WebkitTextStroke: "2px rgba(0,0,0,0.6)", textShadow: "0 6px 20px rgba(0,0,0,0.8)" }}>
        {c.text}
      </div>
    </div>
  );
};

/* ---------- sound ---------- */

const SOUND: { at: number; src: string; volume?: number }[] = [
  { at: 2, src: "whoosh", volume: 0.4 },
  { at: cueAbs("s1", "sharper") - 8, src: "whoosh", volume: 0.45 },
  ...SPANS.slice(1).map((s) => ({ at: s.from - 2, src: "whoosh", volume: 0.25 })),
  ...FEATURES.map((f) => ({ at: cueAbs("s2", f.key), src: "pop", volume: 0.3 })),
  { at: cueAbs("s3", "extra"), src: "click", volume: 0.4 },
  { at: cueAbs("s3", "smoother"), src: "ding", volume: 0.35 },
  ...SOURCES.map((s) => ({ at: cueAbs("s4", s.key), src: "pop", volume: 0.3 })),
  { at: cueAbs("s5", "free"), src: "ding", volume: 0.35 },
  { at: cueAbs("s6", "sharp"), src: "click", volume: 0.4 },
  { at: END_FROM + 4, src: "impact", volume: 0.35 },
];

/* ---------- composition ---------- */

const SCENES: Record<string, React.FC> = { s1: S1, s2: S2, s3: S3, s4: S4, s5: S5, s6: S6 };

export const Veyra: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Backdrop />
    {SPANS.map((s) => {
      const Sc = SCENES[s.id];
      return (
        <Sequence key={s.id} from={s.from} durationInFrames={s.dur + 10} layout="none">
          <Layer dur={s.dur}>
            <Sc />
          </Layer>
        </Sequence>
      );
    })}
    <Sequence from={END_FROM} layout="none">
      <EndCard />
    </Sequence>
    <Captions />
    <Sequence from={timing.lead_in} layout="none">
      <Audio src={staticFile("vo/veyra/vo.mp3")} />
    </Sequence>
    {SOUND.map((s, i) => (
      <Sfx key={i} {...s} />
    ))}
  </AbsoluteFill>
);

/* ---------- cover (profile grid keeps only the middle 1080 x 1440, y 240-1680) ---------- */

export const VeyraCover: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <div style={{ position: "absolute", top: 330, left: 40, right: 40, textAlign: "center", fontFamily: F.head, fontSize: 132, lineHeight: 1.02, color: C.white }}>
      MAKE ANY VIDEO
      <br />
      <span style={{ color: C.yellow }}>SHARPER, FREE</span>
    </div>
    <div style={{ position: "absolute", top: 690, left: 90 }}>
      <Screen w={900} h={580} wipe={0.5} />
    </div>
    <div style={{ position: "absolute", top: 1340, left: 0, right: 0, textAlign: "center", fontFamily: F.body, fontWeight: 900, fontSize: 56, color: C.white }}>
      Live, on your <span style={{ color: C.yellow }}>Windows PC</span>
    </div>
  </AbsoluteFill>
);
