import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { AppleLogo, ChatCircleDots, Cursor, LinuxLogo, Link, Stack, PaintBrush, SelectionBackground, WindowsLogo, FileArrowDown, Warning } from "@phosphor-icons/react";
import timing from "../photocraft-timing.json";
import { C, F } from "../../themes/aitools";
import { clamp, EndCard, ease, makeTimeline, Sfx, Timing, usePop, Word } from "../common";

// Reel: PhotoCraft, a free open-source Photoshop alternative built with AI by ArtCraft.
// Facts: github.com/storytold/photocraft README (MIT or Apache-2.0; opens/edits/saves real PSD files; installers for
// macOS, Windows, Linux; "early alpha ... not yet a Photoshop replacement for daily professional work") and Latent Space
// "ArtCraft" (12 Nov 2026): 17 open-source apps incl. Acrobat (PdfCraft) and Figma alternatives, AI prompted with
// Photoshop's tools/data structures/importers, founder Brandon Thomas says ~1.7M downloads a day. 18 Nov 2026.
// Style: hanging price tags on strings + rubber "FREE" stamps; plate captions with an underlined current word.
// Brand names as plain text only; the editor window is our own drawing.
const T = makeTimeline(timing as Timing);
export const PHOTOCRAFT_TOTAL = timing.total;
const { cue, cueAbs, END_FROM, SPANS, WORDS, FPS } = T;

const TAG = "#F4EFE3";
const INK = "#1B1B1F";
const MUTED = "#6E6858";

/* ---------- building blocks ---------- */

const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 2px, transparent 2px)",
          backgroundSize: "44px 44px",
          transform: `translateY(${(frame * 0.3) % 44}px)`,
        }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(circle 760px at 540px 860px, rgba(255,212,0,0.10), transparent 70%)" }} />
    </AbsoluteFill>
  );
};

// A price tag hanging from a string; it swings in and settles.
const HangTag: React.FC<{ at?: number; w: number; h: number; x: number; top: number; string?: number; children: React.ReactNode; color?: string; tilt?: number }> = ({
  at = 0,
  w,
  h,
  x,
  top,
  string = 120,
  children,
  color = TAG,
  tilt = 0,
}) => {
  const frame = useCurrentFrame();
  const p = usePop(at, 9);
  const swing = Math.sin((frame - at) / 7) * 6 * Math.max(0, 1 - (frame - at) / 50) + tilt;
  if (frame < at) return null;
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: top - string, width: w, transformOrigin: `${w / 2}px 0px`, transform: `rotate(${swing}deg) translateY(${(1 - p) * -500}px)` }}>
      <div style={{ marginLeft: w / 2 - 2, width: 4, height: string, background: "rgba(255,255,255,0.55)" }} />
      <div style={{ width: w, height: h, background: color, borderRadius: 26, clipPath: `polygon(${w / 2 - 70}px 0, ${w / 2 + 70}px 0, 100% 70px, 100% 100%, 0 100%, 0 70px)`, position: "relative", boxShadow: "0 30px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ position: "absolute", left: w / 2 - 18, top: 22, width: 36, height: 36, borderRadius: 18, background: C.bg, border: "5px solid #CFC7B3" }} />
        <div style={{ position: "absolute", inset: "80px 0 0 0" }}>{children}</div>
      </div>
    </div>
  );
};

const Stamp: React.FC<{ at: number; text: string; color?: string; rot?: number; size?: number }> = ({ at, text, color = C.red, rot = -12, size = 150 }) => {
  const frame = useCurrentFrame();
  if (frame < at - 6) return null;
  const drop = ease(frame, at - 6, at);
  const settle = interpolate(frame, [at, at + 4, at + 10], [1.12, 0.97, 1], clamp);
  return (
    <div style={{ transform: `rotate(${rot}deg) scale(${(2.2 - 1.2 * drop) * (frame >= at ? settle : 1)})`, opacity: drop, border: `12px solid ${color}`, borderRadius: 22, padding: "6px 34px 0", fontFamily: F.head, fontSize: size, lineHeight: 1.1, color, letterSpacing: 6, background: "rgba(13,14,17,0.35)" }}>
      {text}
    </div>
  );
};

const Layer: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const enter = ease(frame, 0, 10);
  const exit = ease(frame, dur - 6, dur + 8);
  return <AbsoluteFill style={{ opacity: enter * (1 - exit), transform: `translateY(${exit * -160}px)` }}>{children}</AbsoluteFill>;
};

const Headline: React.FC<{ top: number; at?: number; children: React.ReactNode; size?: number }> = ({ top, at = 0, children, size = 104 }) => {
  const frame = useCurrentFrame();
  const t = ease(frame, at, at + 10);
  return (
    <div style={{ position: "absolute", top, left: 60, right: 60, textAlign: "center", fontFamily: F.head, fontSize: size, lineHeight: 1.04, color: C.white, opacity: t, transform: `translateY(${(1 - t) * 30}px)` }}>
      {children}
    </div>
  );
};

/* ---------- scenes ---------- */

const S1: React.FC = () => {
  const frame = useCurrentFrame();
  const freeAt = cue("s1", "completely");
  const strike = ease(frame, freeAt - 10, freeAt - 2);
  return (
    <AbsoluteFill>
      <Headline top={280}>
        AI REBUILT <span style={{ color: C.yellow }}>PHOTOSHOP</span>
      </Headline>
      <HangTag at={4} w={740} h={420} x={540} top={560}>
        <div style={{ textAlign: "center", paddingTop: 30 }}>
          <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 44, color: MUTED, letterSpacing: 4 }}>PRO PHOTO EDITOR</div>
          <div style={{ position: "relative", display: "inline-block", fontFamily: F.head, fontSize: 170, color: INK, marginTop: 20 }}>
            PAID
            <div style={{ position: "absolute", left: -20, right: -20, top: "52%", height: 16, background: C.red, transform: `scaleX(${strike}) rotate(-6deg)`, transformOrigin: "0 50%" }} />
          </div>
        </div>
      </HangTag>
      <div style={{ position: "absolute", top: 1010, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Stamp at={freeAt} text="FREE" size={170} rot={-8} color={C.yellow} />
      </div>
    </AbsoluteFill>
  );
};

const FEATURES = [
  { key: "layers", icon: Stack, text: "Layers" },
  { key: "masks", icon: SelectionBackground, text: "Masks" },
  { key: "brushes", icon: PaintBrush, text: "Brushes" },
  { key: "opens", icon: FileArrowDown, text: "Real .PSD files" },
];

const S2: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <HangTag at={2} w={820} h={300} x={540} top={400} string={150} color={C.yellow}>
        <div style={{ textAlign: "center", fontFamily: F.head, fontSize: 150, color: C.ink, lineHeight: 1.1 }}>PHOTOCRAFT</div>
      </HangTag>
      <div style={{ position: "absolute", top: 780, left: 120, right: 120, display: "flex", flexDirection: "column", gap: 34 }}>
        {FEATURES.map((f, i) => {
          const at = cue("s2", f.key);
          const t = ease(frame, at - 3, at + 8);
          const Icon = f.icon;
          return (
            <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 24, background: TAG, borderRadius: 18, padding: "18px 30px", opacity: t, transform: `translateX(${(1 - t) * (i % 2 ? 260 : -260)}px) rotate(${i % 2 ? 1.5 : -1.5}deg)` }}>
              <Icon size={60} weight="fill" color={INK} />
              <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 52, color: INK }}>{f.text}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const PLAN = ["Every tool", "How files are stored", "How files open"];

const S3: React.FC = () => {
  const frame = useCurrentFrame();
  const planAt = cue("s3", "plan");
  const builtAt = cue("s3", "built");
  const app = ease(frame, builtAt - 4, builtAt + 14);
  return (
    <AbsoluteFill>
      <Headline top={270} size={92}>
        TEAM <span style={{ color: C.yellow }}>ARTCRAFT</span>
        <br />
        GAVE AN AI A PLAN
      </Headline>
      {/* the plan: a paper checklist */}
      <div style={{ position: "absolute", top: 500, left: 90, width: 520, background: TAG, borderRadius: 22, padding: "30px 34px", transform: `rotate(-3deg) translateX(${(1 - ease(frame, planAt - 8, planAt + 4)) * -600}px)`, boxShadow: "0 24px 50px rgba(0,0,0,0.5)" }}>
        <div style={{ fontFamily: F.body, fontWeight: 900, fontSize: 38, color: MUTED, letterSpacing: 3 }}>THE PLAN</div>
        {PLAN.map((p, i) => {
          const t = ease(frame, planAt + 4 + i * 6, planAt + 12 + i * 6);
          return (
            <div key={p} style={{ marginTop: 18, fontFamily: F.body, fontWeight: 800, fontSize: 40, color: INK, opacity: t }}>
              ✓ {p}
            </div>
          );
        })}
      </div>
      {/* the result: our own drawing of a generic editor window */}
      <div style={{ position: "absolute", top: 850, left: 440, width: 560, height: 360, background: C.panel, border: `3px solid ${C.yellow}`, borderRadius: 22, overflow: "hidden", opacity: app, transform: `scale(${0.7 + 0.3 * app}) rotate(${(1 - app) * 6 + 2}deg)`, boxShadow: "0 30px 70px rgba(0,0,0,0.6)" }}>
        <div style={{ height: 48, background: C.panel2, display: "flex", alignItems: "center", gap: 10, paddingLeft: 18 }}>
          {[C.red, C.yellow, C.green].map((c) => (
            <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />
          ))}
        </div>
        <div style={{ display: "flex", height: 312 }}>
          <div style={{ width: 70, background: C.panel2, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, paddingTop: 20 }}>
            {[Cursor, PaintBrush, SelectionBackground, Stack].map((I, i) => (
              <I key={i} size={36} weight="fill" color={i === 1 ? C.yellow : C.grey} />
            ))}
          </div>
          <div style={{ flex: 1, margin: 20, borderRadius: 12, background: "linear-gradient(160deg, #3A6EA5 0%, #F2A65A 60%, #2E2A45 100%)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 140, background: "#1E2A22", clipPath: "polygon(0 60%, 30% 10%, 55% 55%, 80% 0, 100% 40%, 100% 100%, 0 100%)" }} />
            <div style={{ position: "absolute", top: 50, right: 60, width: 70, height: 70, borderRadius: 35, background: "#FFE9A8" }} />
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 1236, left: 0, right: 0, textAlign: "center", fontFamily: F.head, fontSize: 66, color: C.yellow, opacity: ease(frame, cue("s3", "scratch") - 4, cue("s3", "scratch") + 6) }}>
        BUILT FROM SCRATCH
      </div>
    </AbsoluteFill>
  );
};

const APPS = [
  { key: "made", text: "Photoshop", x: 215, rot: -3 },
  { key: "acrobat", text: "Acrobat", x: 540, rot: 2 },
  { key: "figma", text: "Figma", x: 865, rot: -2 },
];

const S4: React.FC = () => {
  const frame = useCurrentFrame();
  const n = Math.round(interpolate(frame, [cue("s4", "17") - 6, cue("s4", "17") + 10], [0, 17], clamp));
  const dlAt = cue("s4", "downloaded");
  const dl = usePop(dlAt - 4, 12);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 260, left: 0, right: 0, textAlign: "center" }}>
        <span style={{ fontFamily: F.head, fontSize: 230, color: C.yellow, lineHeight: 1 }}>{n}</span>
        <span style={{ fontFamily: F.head, fontSize: 90, color: C.white, marginLeft: 22 }}>FREE APPS</span>
      </div>
      {APPS.map((a) => (
        <HangTag key={a.key} at={cue("s4", a.key) - 2} w={280} h={250} x={a.x} top={640} string={90} tilt={a.rot}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 26, color: MUTED, letterSpacing: 2 }}>FREE ALT TO</div>
            <div style={{ fontFamily: F.head, fontSize: a.text.length > 7 ? 50 : 62, color: INK, marginTop: 8 }}>{a.text}</div>
          </div>
        </HangTag>
      ))}
      <div style={{ position: "absolute", top: 1010, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${dl})` }}>
        <div style={{ fontFamily: F.head, fontSize: 130, color: C.white, lineHeight: 1 }}>
          ~1.7M <span style={{ fontSize: 70, color: C.grey }}>DOWNLOADS/DAY</span>
        </div>
        <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 36, color: C.grey, marginTop: 10 }}>according to the founder</div>
      </div>
    </AbsoluteFill>
  );
};

const OS = [
  { key: "windows", icon: WindowsLogo, text: "Windows" },
  { key: "mac", icon: AppleLogo, text: "Mac" },
  { key: "linux", icon: LinuxLogo, text: "Linux" },
];

const S5: React.FC = () => {
  const frame = useCurrentFrame();
  const earlyAt = cue("s5", "early");
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 290, left: 80, right: 80, display: "flex", justifyContent: "space-between" }}>
        {OS.map((o) => {
          const t = usePop(cue("s5", o.key) - 3, 11);
          const Icon = o.icon;
          return (
            <div key={o.key} style={{ width: 280, height: 250, borderRadius: 26, background: C.panel, border: `2px solid ${C.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, transform: `scale(${t})` }}>
              <Icon size={100} weight="fill" color={C.yellow} />
              <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 44, color: C.white }}>{o.text}</span>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 680, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Stamp at={earlyAt} text="EARLY ALPHA" size={120} rot={-5} />
      </div>
      <div style={{ position: "absolute", top: 940, left: 100, right: 100, display: "flex", alignItems: "center", gap: 22, background: TAG, borderRadius: 22, padding: "24px 34px", opacity: ease(frame, cue("s5", "replace") - 4, cue("s5", "replace") + 6) }}>
        <Warning size={70} weight="fill" color={INK} />
        <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 44, color: INK, lineHeight: 1.2 }}>Not a full Photoshop replacement for pro work yet</span>
      </div>
    </AbsoluteFill>
  );
};

const S6: React.FC = () => {
  const frame = useCurrentFrame();
  const at = cue("s6", "craft");
  const typed = "CRAFT".slice(0, Math.max(0, Math.floor((frame - at + 4) / 3)));
  const box = usePop(2, 12);
  const link = usePop(cue("s6", "link"), 10);
  return (
    <AbsoluteFill>
      <Headline top={290}>COMMENT</Headline>
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

/* ---------- captions: a dark plate with the phrase; the spoken word gets a yellow underline ---------- */

const PHRASES: Word[][] = (() => {
  const out: Word[][] = [];
  let cur: Word[] = [];
  for (const w of WORDS) {
    cur.push(w);
    if (cur.length >= 5 || /[.,?!:]$/.test(w.text)) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
})();

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (frame >= END_FROM - 4) return null;
  const pi = PHRASES.findIndex((p, i) => t >= p[0].start - 0.05 && (i === PHRASES.length - 1 || t < PHRASES[i + 1][0].start - 0.05));
  if (pi < 0) return null;
  const ph = PHRASES[pi];
  if (t > ph[ph.length - 1].end + 0.6) return null;
  const inT = ease(frame, Math.round(ph[0].start * FPS) - 2, Math.round(ph[0].start * FPS) + 4);
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: 1350, display: "flex", justifyContent: "center", opacity: inT }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: 16, background: C.ink, borderLeft: `10px solid ${C.yellow}`, borderRadius: 8, padding: "14px 28px", maxWidth: 980 }}>
        {ph.map((w, i) => {
          const active = t >= w.start - 0.03 && (i === ph.length - 1 || t < ph[i + 1].start - 0.03);
          return (
            <span key={i} style={{ fontFamily: F.body, fontWeight: 900, fontSize: 54, color: C.white, whiteSpace: "nowrap", borderBottom: `7px solid ${active ? C.yellow : "transparent"}` }}>
              {w.text.replace(/[,.:?!]$/, "")}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/* ---------- sound ---------- */

const SOUND: { at: number; src: string; volume?: number }[] = [
  { at: 2, src: "whoosh", volume: 0.4 },
  { at: cueAbs("s1", "completely"), src: "impact", volume: 0.5 },
  ...SPANS.slice(1).map((s) => ({ at: s.from - 2, src: "whoosh", volume: 0.25 })),
  ...FEATURES.map((f) => ({ at: cueAbs("s2", f.key), src: "pop", volume: 0.3 })),
  { at: cueAbs("s3", "built"), src: "ding", volume: 0.35 },
  { at: cueAbs("s4", "17"), src: "ding", volume: 0.35 },
  { at: cueAbs("s4", "downloaded"), src: "pop", volume: 0.3 },
  { at: cueAbs("s5", "early"), src: "impact", volume: 0.45 },
  { at: cueAbs("s6", "craft"), src: "click", volume: 0.4 },
  { at: END_FROM + 4, src: "impact", volume: 0.35 },
];

/* ---------- composition ---------- */

const SCENES: Record<string, React.FC> = { s1: S1, s2: S2, s3: S3, s4: S4, s5: S5, s6: S6 };

export const PhotoCraft: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Backdrop />
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
      <EndCard />
    </Sequence>
    <Captions />
    <Sequence from={timing.lead_in} layout="none">
      <Audio src={staticFile("vo/photocraft/vo.mp3")} />
    </Sequence>
    {SOUND.map((s, i) => (
      <Sfx key={i} {...s} />
    ))}
  </AbsoluteFill>
);

/* ---------- cover (profile grid keeps only the middle 1080 x 1440, y 240-1680) ---------- */

export const PhotoCraftCover: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <AbsoluteFill style={{ background: "radial-gradient(circle 680px at 540px 960px, rgba(255,212,0,0.14), transparent 72%)" }} />
    <div style={{ position: "absolute", top: 330, left: 40, right: 40, textAlign: "center", fontFamily: F.head, fontSize: 140, lineHeight: 1.02, color: C.white }}>
      AI REBUILT
      <br />
      <span style={{ color: C.yellow }}>PHOTOSHOP</span>
    </div>
    <div style={{ position: "absolute", top: 700, left: 160, width: 760, height: 460, background: TAG, borderRadius: 30, transform: "rotate(-3deg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 30px 60px rgba(0,0,0,0.5)" }}>
      <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 46, color: MUTED, letterSpacing: 4 }}>PHOTOCRAFT</div>
      <div style={{ position: "relative", fontFamily: F.head, fontSize: 170, color: INK }}>
        PAID
        <div style={{ position: "absolute", left: -20, right: -20, top: "52%", height: 16, background: C.red, transform: "rotate(-6deg)" }} />
      </div>
    </div>
    <div style={{ position: "absolute", top: 1180, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div style={{ transform: "rotate(-8deg)", border: `14px solid ${C.yellow}`, borderRadius: 24, padding: "6px 44px 0", fontFamily: F.head, fontSize: 200, lineHeight: 1.1, color: C.yellow, letterSpacing: 8, background: C.bg }}>
        FREE
      </div>
    </div>
  </AbsoluteFill>
);
