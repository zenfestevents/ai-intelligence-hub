import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  BookOpen,
  BookmarkSimple,
  Bug,
  CheckCircle,
  CursorClick,
  Hash,
  Lightning,
  LockSimpleOpen,
  PaperPlaneTilt,
  Robot,
  ShieldCheck,
  Sparkle,
  TrendUp,
  X,
} from "@phosphor-icons/react";
import timing from "../aitools-timing.json";
import { C, EASE_IN, EASE_OUT, F, SAFE } from "../../themes/aitools";
import { AiLogo } from "../../themes/AiToolsBrand";

// Reel: "5 free AI tools trending this week". Yellow + ink theme, owner's ElevenLabs voice, no avatar.
export const AITOOLS_TOTAL = timing.total;
const FPS = timing.fps;
type Seg = (typeof timing.segments)[number];
const SEG: Record<string, Seg> = Object.fromEntries(timing.segments.map((s) => [s.id, s]));
const IDS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7"];
const END_FROM = timing.speech_end + 8;

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9']/g, "");
// Absolute frame where the nth word starting with `key` begins in segment `id`.
const cueAbs = (id: string, key: string, nth = 0) => {
  const hits = SEG[id].words.filter((w) => norm(w.text).startsWith(key));
  const w = hits[nth] ?? hits[0];
  if (!w) throw new Error(`no word "${key}" in ${id}`);
  return Math.round(w.start * FPS);
};

// Each scene runs from its line's start (minus 4 frames) to the next line's start.
const SPANS = IDS.map((id, i) => {
  const from = i === 0 ? 0 : SEG[id].from - 4;
  const to = i < IDS.length - 1 ? SEG[IDS[i + 1]].from - 4 : END_FROM;
  return { id, from, dur: to - from };
});
const span = (id: string) => SPANS.find((s) => s.id === id)!;
const cue = (id: string, key: string, nth = 0) => cueAbs(id, key, nth) - span(id).from;
const CUTS = [...SPANS.slice(1).map((s) => s.from), END_FROM];

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (f: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing: EASE_OUT });

// Spring pop (0 -> 1 with a little overshoot) starting at frame `at`.
const usePop = (at: number, damping = 11) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping, stiffness: 170, mass: 0.7 } });
};

/* ---------- shared pieces ---------- */

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const gx = 540 + Math.sin(frame / 70) * 260;
  const gy = 820 + Math.cos(frame / 90) * 300;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(rgba(255,212,0,0.10) 2px, transparent 2.5px)`,
          backgroundSize: "44px 44px",
          backgroundPosition: `0px ${-frame * 0.4}px`,
        }}
      />
      <AbsoluteFill
        style={{ background: `radial-gradient(circle 620px at ${gx}px ${gy}px, rgba(255,212,0,0.13), transparent 70%)` }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55))" }} />
    </AbsoluteFill>
  );
};

// Five pills at the top; the current tool's pill fills yellow.
const Progress: React.FC<{ n: number }> = ({ n }) => {
  const frame = useCurrentFrame();
  const fill = ease(frame, 2, 16);
  return (
    <div style={{ position: "absolute", top: SAFE.top + 8, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 14 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ width: 120, height: 12, borderRadius: 6, background: "rgba(255,255,255,0.16)", overflow: "hidden" }}>
          <div
            style={{
              width: i < n ? "100%" : i === n ? `${fill * 100}%` : "0%",
              height: "100%",
              background: C.yellow,
              borderRadius: 6,
            }}
          />
        </div>
      ))}
    </div>
  );
};

// Yellow highlight that wipes in behind a word.
const Highlight: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, at + 10);
  return (
    <span style={{ position: "relative", display: "inline-block", padding: "0 10px", color: p > 0.5 ? C.ink : C.white }}>
      <span
        style={{
          position: "absolute",
          left: 0,
          top: "8%",
          bottom: "4%",
          width: `${p * 100}%`,
          background: C.yellow,
          borderRadius: 8,
          transform: "skewX(-6deg)",
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};

const Panel: React.FC<{ at: number; height?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  at,
  height = 470,
  children,
  style,
}) => {
  const p = usePop(at, 14);
  return (
    <div
      style={{
        position: "relative",
        width: 900,
        height,
        borderRadius: 30,
        background: C.panel,
        border: `2px solid ${C.line}`,
        boxShadow: "0 30px 80px -30px rgba(0,0,0,0.8)",
        overflow: "hidden",
        opacity: Math.min(1, p * 1.5),
        transform: `translateY(${(1 - p) * 80}px) scale(${0.9 + p * 0.1})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/* ---------- tool scene template ---------- */

type ToolProps = {
  id: string;
  n: number;
  name: string;
  by?: string;
  benefitAt: number;
  benefit: React.ReactNode;
  footnote?: string;
  children: React.ReactNode;
};

const ToolScene: React.FC<ToolProps> = ({ n, name, by, benefitAt, benefit, footnote, children }) => {
  const frame = useCurrentFrame();
  const num = usePop(0, 13);
  const typed = Math.floor(interpolate(frame, [3, 3 + name.length * 0.8], [0, name.length], clamp));
  const caretOn = typed < name.length || Math.floor(frame / 8) % 2 === 0;
  const byP = ease(frame, 10, 22);
  const b = usePop(benefitAt, 13);
  return (
    <AbsoluteFill>
      <Progress n={n} />
      <div style={{ position: "absolute", top: 300, left: SAFE.left, width: 900, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 26 }}>
          <div
            style={{
              fontFamily: F.head,
              fontSize: 210,
              lineHeight: 0.86,
              color: "transparent",
              WebkitTextStroke: `5px ${C.yellow}`,
              transform: `translateX(${(1 - num) * -260}px)`,
              opacity: Math.min(1, num * 2),
            }}
          >
            {String(n).padStart(2, "0")}
          </div>
          {by ? (
            <div
              style={{
                fontFamily: F.body,
                fontWeight: 600,
                fontSize: 36,
                color: C.grey,
                marginBottom: 14,
                opacity: byP,
                transform: `translateY(${(1 - byP) * 20}px)`,
              }}
            >
              {by}
            </div>
          ) : null}
        </div>
        <div style={{ fontFamily: F.head, fontSize: 112, lineHeight: 1.0, color: C.white, textTransform: "uppercase", marginTop: 14, minHeight: 112 }}>
          {name.slice(0, typed)}
          <span style={{ display: "inline-block", width: 26, height: 92, marginLeft: 8, background: caretOn ? C.yellow : "transparent", verticalAlign: -4 }} />
        </div>
        <div style={{ marginTop: 34 }}>{children}</div>
        <div
          style={{
            marginTop: 34,
            fontFamily: F.body,
            fontWeight: 800,
            fontSize: 54,
            lineHeight: 1.2,
            color: C.white,
            opacity: Math.min(1, b * 1.6),
            transform: `translateY(${(1 - b) * 40}px)`,
          }}
        >
          {benefit}
        </div>
        {footnote ? (
          <div style={{ marginTop: 14, fontFamily: F.body, fontWeight: 500, fontSize: 30, color: C.grey, opacity: ease(frame, benefitAt + 8, benefitAt + 20) }}>
            {footnote}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- scene 1: hook ---------- */

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const five = usePop(1, 9);
  const shake = frame >= 4 && frame < 14 ? (14 - frame) * 1.6 : 0;
  const sx = Math.sin(frame * 9.1) * shake;
  const sy = Math.cos(frame * 7.3) * shake;
  const words = [
    { t: "FREE", at: cue("s1", "free") },
    { t: "AI", at: cue("s1", "ai") },
    { t: "TOOLS", at: cue("s1", "tools") },
  ];
  const trendAt = cue("s1", "developers");
  const trendText = "trending on GitHub this week";
  const typed = Math.floor(interpolate(frame, [trendAt, trendAt + 22], [0, trendText.length], clamp));
  const tagAt = cue("s1", "number");
  const tag = usePop(tagAt, 9);
  const logo = usePop(0, 14);
  return (
    <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px)` }}>
      <div style={{ position: "absolute", top: SAFE.top + 10, left: SAFE.left, transform: `scale(${logo})`, transformOrigin: "left top" }}>
        <AiLogo size={110} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 50,
          top: 390,
          fontFamily: F.head,
          fontSize: 820,
          lineHeight: 0.9,
          color: C.yellow,
          transform: `scale(${interpolate(five, [0, 1], [3.2, 1])})`,
          transformOrigin: "40% 50%",
          opacity: Math.min(1, five * 3),
          textShadow: "0 30px 80px rgba(255,212,0,0.25)",
        }}
      >
        5
      </div>
      <div style={{ position: "absolute", left: 520, top: 440, display: "flex", flexDirection: "column" }}>
        {words.map((w) => (
          <StampWord key={w.t} text={w.t} at={w.at} />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          top: 1135,
          display: "flex",
          alignItems: "center",
          gap: 18,
          fontFamily: F.body,
          fontWeight: 700,
          fontSize: 50,
          color: C.white,
          opacity: frame >= trendAt ? 1 : 0,
        }}
      >
        <TrendUp size={58} color={C.yellow} weight="bold" />
        {trendText.slice(0, typed)}
      </div>
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          top: 1235,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "18px 34px",
          background: C.yellow,
          borderRadius: 18,
          fontFamily: F.head,
          fontSize: 64,
          color: C.ink,
          transform: `rotate(-3deg) scale(${tag})`,
          transformOrigin: "left center",
          boxShadow: "0 20px 50px -20px rgba(255,212,0,0.6)",
        }}
      >
        <Lightning size={56} weight="fill" color={C.ink} />
        #3 IS FROM OPENAI
      </div>
    </AbsoluteFill>
  );
};

const StampWord: React.FC<{ text: string; at: number }> = ({ text, at }) => {
  const p = usePop(at, 10);
  return (
    <div
      style={{
        fontFamily: F.head,
        fontSize: 200,
        lineHeight: 0.95,
        color: text === "AI" ? C.yellow : C.white,
        transform: `scale(${interpolate(p, [0, 1], [1.8, 1])})`,
        transformOrigin: "left center",
        opacity: Math.min(1, p * 3),
      }}
    >
      {text}
    </div>
  );
};

/* ---------- scene 2: browser ---------- */

const BrowserIllus: React.FC = () => {
  const frame = useCurrentFrame();
  const open = cue("s2", "open");
  const c1 = cue("s2", "click");
  const c2 = c1 + 12;
  const bug = cue("s2", "broken");
  // Cursor path: start -> button 1 -> button 2 -> broken card.
  const pts = [
    { f: open, x: 700, y: 400 },
    { f: c1 - 2, x: 205, y: 300 },
    { f: c2 - 2, x: 445, y: 300 },
    { f: bug - 2, x: 690, y: 255 },
  ];
  let x = pts[0].x;
  let y = pts[0].y;
  for (let i = 1; i < pts.length; i++) {
    if (frame >= pts[i - 1].f) {
      const p = ease(frame, pts[i - 1].f, pts[i].f);
      x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * p;
      y = pts[i - 1].y + (pts[i].y - pts[i - 1].y) * p;
    }
  }
  const ripple = (at: number) => {
    const p = ease(frame, at, at + 12);
    return frame >= at ? (
      <div
        style={{
          position: "absolute",
          left: -40 + 0,
          top: -40,
          width: 80,
          height: 80,
          borderRadius: 40,
          border: `4px solid ${C.yellow}`,
          transform: `scale(${0.3 + p})`,
          opacity: 1 - p,
        }}
      />
    ) : null;
  };
  const bugP = usePop(bug, 10);
  const press = (at: number) => (frame >= at && frame < at + 6 ? 0.94 : 1);
  return (
    <Panel at={2}>
      <div style={{ height: 70, background: C.panel2, display: "flex", alignItems: "center", gap: 14, padding: "0 26px" }}>
        {[C.red, C.yellow, C.green].map((c) => (
          <div key={c} style={{ width: 20, height: 20, borderRadius: 10, background: c, opacity: 0.85 }} />
        ))}
        <div style={{ marginLeft: 20, flex: 1, height: 40, borderRadius: 20, background: C.bg, color: C.grey, fontFamily: F.mono, fontSize: 24, display: "flex", alignItems: "center", paddingLeft: 22 }}>
          localhost:3000/checkout
        </div>
      </div>
      <div style={{ position: "relative", padding: 34 }}>
        <div style={{ width: 360, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.18)" }} />
        <div style={{ width: 520, height: 18, borderRadius: 6, background: "rgba(255,255,255,0.08)", marginTop: 18 }} />
        <div style={{ display: "flex", gap: 30, marginTop: 70 }}>
          {[
            { t: "Add to cart", at: c1 },
            { t: "Pay now", at: c2 },
          ].map((b) => (
            <div
              key={b.t}
              style={{
                width: 210,
                height: 70,
                borderRadius: 14,
                background: frame >= b.at ? C.yellow : "rgba(255,255,255,0.12)",
                color: frame >= b.at ? C.ink : C.white,
                fontFamily: F.body,
                fontWeight: 700,
                fontSize: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${press(b.at)})`,
              }}
            >
              {b.t}
            </div>
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            left: 580,
            top: 120,
            width: 240,
            height: 200,
            borderRadius: 16,
            border: "3px dashed rgba(255,255,255,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: C.dim,
            fontFamily: F.body,
            fontWeight: 700,
            fontSize: 26,
          }}
        >
          image failed
        </div>
        {/* bug circle */}
        <div
          style={{
            position: "absolute",
            left: 560,
            top: 100,
            width: 280,
            height: 240,
            borderRadius: 140,
            border: `6px solid ${C.red}`,
            transform: `scale(${bugP})`,
            opacity: Math.min(1, bugP * 2),
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 600,
            top: 345,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: C.red,
            color: C.white,
            padding: "8px 18px",
            borderRadius: 12,
            fontFamily: F.body,
            fontWeight: 800,
            fontSize: 28,
            transform: `scale(${bugP})`,
          }}
        >
          <Bug size={32} weight="fill" /> Bug found
        </div>
      </div>
      {frame >= open ? (
        <div style={{ position: "absolute", left: x, top: y + 70 }}>
          {ripple(c1)}
          {ripple(c2)}
          <CursorClick size={64} weight="fill" color={C.yellow} style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.6))" }} />
          <div style={{ position: "absolute", left: 50, top: 50, width: 44, height: 44, borderRadius: 22, background: C.yellow, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Robot size={30} weight="fill" color={C.ink} />
          </div>
        </div>
      ) : null}
    </Panel>
  );
};

/* ---------- scene 3: plan review ---------- */

const PlanIllus: React.FC = () => {
  const frame = useCurrentFrame();
  const hl = cue("s3", "read");
  const strike = cue("s3", "mark");
  const stamp = cue("s3", "homework");
  const lines = ["1. Set up the database", "2. Build the login page", "3. Delete all old users", "4. Add payments", "5. Write tests"];
  const hlP = ease(frame, hl, hl + 12);
  const stP = ease(frame, strike, strike + 10);
  const note = usePop(strike + 8, 10);
  const st = usePop(stamp, 8);
  return (
    <Panel at={2} style={{ background: "#F4F1E8", border: "none" }}>
      <div style={{ padding: "28px 50px", fontFamily: F.body, color: C.ink }}>
        <div style={{ fontFamily: F.head, fontSize: 56, letterSpacing: 2 }}>AI'S PLAN</div>
        <div style={{ height: 3, background: "rgba(20,21,24,0.15)", margin: "10px 0 18px" }} />
        {lines.map((l, i) => (
          <div key={l} style={{ position: "relative", fontSize: 36, fontWeight: 600, height: 56, display: "flex", alignItems: "center" }}>
            {i === 1 ? (
              <div style={{ position: "absolute", left: -8, top: 10, height: 44, width: `${hlP * 470}px`, background: "rgba(255,212,0,0.75)", borderRadius: 6 }} />
            ) : null}
            <span style={{ position: "relative", opacity: i === 2 ? 1 - stP * 0.45 : 1 }}>{l}</span>
            {i === 2 ? (
              <div style={{ position: "absolute", left: -6, top: 30, height: 6, width: `${stP * 440}px`, background: C.red, borderRadius: 3, transform: "rotate(-1.5deg)" }} />
            ) : null}
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 520,
          top: 190,
          background: C.red,
          color: C.white,
          padding: "12px 22px",
          borderRadius: "18px 18px 18px 4px",
          fontFamily: F.body,
          fontWeight: 800,
          fontSize: 32,
          transform: `scale(${note}) rotate(-2deg)`,
          transformOrigin: "left bottom",
        }}
      >
        No! Ask me first
      </div>
      <div
        style={{
          position: "absolute",
          right: 50,
          bottom: 40,
          width: 170,
          height: 170,
          borderRadius: 85,
          border: `8px solid ${C.green}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${interpolate(st, [0, 1], [2.4, 1])}) rotate(-12deg)`,
          opacity: Math.min(1, st * 2),
        }}
      >
        <CheckCircle size={110} weight="fill" color={C.green} />
      </div>
    </Panel>
  );
};

/* ---------- scene 4: security scan ---------- */

const CodeIllus: React.FC = () => {
  const frame = useCurrentFrame();
  const scan = cue("s4", "scans");
  const hole = cue("s4", "holes");
  const fix = cue("s4", "fix");
  const code = [
    { t: "app.get('/user', (req, res) => {", c: C.grey },
    { t: "  const id = req.query.id;", c: C.white },
    { t: "BAD", c: C.white },
    { t: "  res.json(user);", c: C.white },
    { t: "});", c: C.grey },
  ];
  const scanY = interpolate(frame, [scan, hole], [-40, 420], clamp);
  const fixed = frame >= fix;
  const flash = frame >= hole && !fixed ? 0.35 + 0.25 * Math.sin(frame * 0.6) : 0;
  const badge = usePop(hole, 10);
  const good = usePop(fix, 10);
  return (
    <Panel at={2}>
      <div style={{ padding: "40px 36px", fontFamily: F.mono, fontSize: 30, lineHeight: "62px" }}>
        {code.map((l, i) =>
          l.t === "BAD" ? (
            <div
              key={i}
              style={{
                position: "relative",
                margin: "0 -36px",
                padding: "0 36px",
                background: fixed ? "rgba(61,220,132,0.18)" : `rgba(255,77,77,${flash})`,
                borderLeft: `6px solid ${fixed ? C.green : frame >= hole ? C.red : "transparent"}`,
                color: fixed ? C.green : C.white,
                whiteSpace: "pre",
              }}
            >
              {fixed ? '  db.query("...WHERE id = ?", [id]);' : '  db.query("...WHERE id=" + id);'}
            </div>
          ) : (
            <div key={i} style={{ color: l.c, whiteSpace: "pre" }}>
              {l.t}
            </div>
          ),
        )}
      </div>
      {frame >= scan && frame < hole + 6 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: scanY,
            height: 70,
            background: "linear-gradient(180deg, transparent, rgba(255,212,0,0.35), transparent)",
            borderBottom: `3px solid ${C.yellow}`,
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          right: 34,
          bottom: 30,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 22px",
          borderRadius: 14,
          background: fixed ? C.green : C.red,
          color: fixed ? C.ink : C.white,
          fontFamily: F.body,
          fontWeight: 800,
          fontSize: 32,
          transform: `scale(${fixed ? good : badge})`,
        }}
      >
        {fixed ? <ShieldCheck size={40} weight="fill" /> : <LockSimpleOpen size={40} weight="fill" />}
        {fixed ? "Fixed" : "Security hole"}
      </div>
    </Panel>
  );
};

/* ---------- scene 5: old vs new ---------- */

const GuidanceIllus: React.FC = () => {
  const frame = useCurrentFrame();
  const fresh = cue("s5", "teaches");
  const kill = cue("s5", "outdated");
  const oldP = usePop(4, 14);
  const newP = usePop(fresh, 12);
  const x = usePop(kill, 9);
  const card: React.CSSProperties = {
    position: "absolute",
    top: 30,
    width: 405,
    height: 410,
    borderRadius: 24,
    padding: 30,
    boxSizing: "border-box",
    fontFamily: F.body,
  };
  return (
    <Panel at={2} style={{ background: "transparent", border: "none", boxShadow: "none", overflow: "visible" }}>
      <div
        style={{
          ...card,
          left: 0,
          background: "#2A2620",
          border: "2px solid rgba(255,255,255,0.06)",
          transform: `translateY(${(1 - oldP) * 60}px) rotate(${-3 - x * 4}deg)`,
          opacity: Math.min(1, oldP * 2) * (1 - x * 0.45),
          filter: `grayscale(${0.4 + x * 0.6})`,
        }}
      >
        <div style={{ fontFamily: F.head, fontSize: 56, color: "#B9A57A" }}>OLD CODE</div>
        <div style={{ fontFamily: F.mono, fontSize: 26, color: "#8D8576", lineHeight: 1.7, marginTop: 16, whiteSpace: "pre" }}>
          {"var el =\n document.all[0];\n<center>\n  <font>Hi</font>\n</center>"}
        </div>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${x})`, opacity: Math.min(1, x * 2) }}>
          <X size={300} weight="bold" color={C.red} />
        </div>
      </div>
      <div
        style={{
          ...card,
          left: 470,
          background: C.yellow,
          color: C.ink,
          transform: `translateX(${(1 - newP) * 500}px) rotate(${2 * newP}deg)`,
          opacity: Math.min(1, newP * 2),
          boxShadow: "0 30px 70px -25px rgba(255,212,0,0.55)",
        }}
      >
        <BookOpen size={70} weight="fill" />
        <div style={{ fontFamily: F.head, fontSize: 58, lineHeight: 1.0, marginTop: 10 }}>TODAY'S WEB STANDARDS</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
          {["Modern CSS", "New APIs", "Accessible"].map((t, i) => (
            <div
              key={t}
              style={{
                padding: "8px 16px",
                borderRadius: 30,
                background: C.ink,
                color: C.yellow,
                fontWeight: 700,
                fontSize: 24,
                opacity: ease(frame, fresh + 10 + i * 4, fresh + 18 + i * 4),
              }}
            >
              {t}
            </div>
          ))}
        </div>
        {[0, 1, 2].map((i) => {
          const s = Math.max(0, Math.sin((frame - fresh) / 6 + i * 2));
          return (
            <Sparkle
              key={i}
              size={40 + i * 10}
              weight="fill"
              color={C.white}
              style={{ position: "absolute", right: [-20, 40, -30][i], top: [-24, 20, 120][i], opacity: frame > fresh ? s : 0, transform: `scale(${0.6 + s * 0.4})` }}
            />
          );
        })}
      </div>
    </Panel>
  );
};

/* ---------- scene 6: shared workspace ---------- */

const ChatIllus: React.FC = () => {
  const frame = useCurrentFrame();
  const t0 = cue("s6", "workspace");
  const tEnd = span("s6").dur - 6;
  const msgs = [
    { who: "P", ai: false, text: "Checkout is broken again" },
    { who: "AI", ai: true, text: "On it. Fix is ready for review." },
    { who: "R", ai: false, text: "Looks good, merging!" },
    { who: "AI", ai: true, text: "Docs updated too." },
  ].map((m, i) => ({ ...m, at: Math.round(t0 + ((tEnd - 20 - t0) * i) / 3) }));
  const team = cue("s6", "team");
  const agents = cue("s6", "agents");
  const members = [
    { who: "P", ai: false, at: team },
    { who: "R", ai: false, at: team + 3 },
    { who: "AI", ai: true, at: agents },
    { who: "AI", ai: true, at: agents + 3 },
  ];
  return (
    <Panel at={2}>
      <div style={{ height: 80, background: C.panel2, display: "flex", alignItems: "center", padding: "0 28px", gap: 10, fontFamily: F.body, fontWeight: 800, fontSize: 34, color: C.white }}>
        <Hash size={36} weight="bold" color={C.yellow} /> launch-room
        <div style={{ flex: 1 }} />
        {members.map((m, i) => (
          <Avatar key={i} ai={m.ai} who={m.who} size={50} at={m.at} style={{ marginLeft: -12 }} />
        ))}
      </div>
      <div style={{ padding: "18px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
        {msgs.map((m, i) => (
          <ChatMsg key={i} {...m} />
        ))}
      </div>
    </Panel>
  );
};

const Avatar: React.FC<{ ai: boolean; who: string; size: number; at: number; style?: React.CSSProperties }> = ({ ai, who, size, at, style }) => {
  const p = usePop(at, 10);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        flexShrink: 0,
        background: ai ? C.yellow : "#E9E6DF",
        border: `3px solid ${C.panel2}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: F.body,
        fontWeight: 800,
        fontSize: size * 0.45,
        color: C.ink,
        transform: `scale(${p})`,
        ...style,
      }}
    >
      {ai ? <Robot size={size * 0.6} weight="fill" color={C.ink} /> : who}
    </div>
  );
};

const ChatMsg: React.FC<{ who: string; ai: boolean; text: string; at: number }> = ({ who, ai, text, at }) => {
  const p = usePop(at, 13);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * 30}px)` }}>
      <Avatar ai={ai} who={who} size={58} at={at} />
      <div
        style={{
          padding: "14px 22px",
          borderRadius: "6px 22px 22px 22px",
          background: ai ? "rgba(255,212,0,0.14)" : "rgba(255,255,255,0.08)",
          border: ai ? `2px solid rgba(255,212,0,0.45)` : "2px solid transparent",
          fontFamily: F.body,
          fontWeight: 600,
          fontSize: 31,
          color: C.white,
        }}
      >
        {text}
      </div>
    </div>
  );
};

/* ---------- scene 7: call to action ---------- */

const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const head = usePop(0, 11);
  const kw = usePop(cue("s7", "comment"), 8);
  const typeAt = cue("s7", "comment") + 4;
  const word = "TOOLS";
  const typed = Math.floor(interpolate(frame, [typeAt, typeAt + word.length * 3], [0, word.length], clamp));
  const sendAt = cue("s7", "send");
  const dmAt = cue("s7", "dm");
  const fly = ease(frame, sendAt + 2, dmAt);
  const badge = usePop(dmAt, 8);
  const sub = ease(frame, cue("s7", "all"), cue("s7", "all") + 12);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: SAFE.top + 10, left: SAFE.left }}>
        <AiLogo size={96} />
      </div>
      <div style={{ position: "absolute", top: 380, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ fontFamily: F.head, fontSize: 150, lineHeight: 1, color: C.white, transform: `scale(${head})` }}>COMMENT</div>
        <div
          style={{
            display: "inline-block",
            marginTop: 16,
            padding: "6px 46px 14px",
            background: C.yellow,
            borderRadius: 26,
            fontFamily: F.head,
            fontSize: 230,
            lineHeight: 1,
            color: C.ink,
            transform: `scale(${interpolate(kw, [0, 1], [0.4, 1])}) rotate(-2deg)`,
            opacity: Math.min(1, kw * 2),
          }}
        >
          "TOOLS"
        </div>
        <div style={{ marginTop: 34, fontFamily: F.body, fontWeight: 800, fontSize: 56, color: C.white, opacity: sub, transform: `translateY(${(1 - sub) * 30}px)` }}>
          get all <span style={{ color: C.yellow }}>5 links</span> in your DM
        </div>
      </div>
      {/* comment box */}
      <div
        style={{
          position: "absolute",
          top: 1030,
          left: SAFE.left,
          width: 900,
          height: 120,
          borderRadius: 60,
          background: C.panel,
          border: `2px solid ${C.line}`,
          display: "flex",
          alignItems: "center",
          padding: "0 18px",
          boxSizing: "border-box",
          gap: 22,
        }}
      >
        <div style={{ width: 80, height: 80, borderRadius: 40, background: "#E9E6DF" }} />
        <div style={{ flex: 1, fontFamily: F.body, fontWeight: 700, fontSize: 44, color: typed ? C.white : C.dim }}>
          {typed ? word.slice(0, typed) : "Add a comment..."}
          {typed && typed < word.length ? <span style={{ color: C.yellow }}>|</span> : null}
        </div>
        <div
          style={{
            fontFamily: F.body,
            fontWeight: 800,
            fontSize: 40,
            color: typed >= word.length ? C.yellow : C.dim,
            paddingRight: 24,
            transform: `scale(${frame >= sendAt && frame < sendAt + 6 ? 0.85 : 1})`,
          }}
        >
          Post
        </div>
      </div>
      {/* paper plane to DM */}
      {frame >= sendAt + 2 && fly < 1 ? (
        <div
          style={{
            position: "absolute",
            left: interpolate(fly, [0, 1], [820, 880]),
            top: interpolate(fly, [0, 1], [1040, 250]) - Math.sin(fly * Math.PI) * 120,
            transform: `rotate(${-20 + fly * 10}deg) scale(${1 - fly * 0.3})`,
          }}
        >
          <PaperPlaneTilt size={90} weight="fill" color={C.yellow} />
        </div>
      ) : null}
      <div style={{ position: "absolute", top: SAFE.top + 18, right: SAFE.right - 20 }}>
        <div style={{ position: "relative" }}>
          <PaperPlaneTilt size={84} weight="bold" color={C.white} />
          <div
            style={{
              position: "absolute",
              right: -16,
              top: -14,
              width: 46,
              height: 46,
              borderRadius: 23,
              background: C.red,
              color: C.white,
              fontFamily: F.body,
              fontWeight: 800,
              fontSize: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${badge})`,
            }}
          >
            1
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const logo = usePop(4, 10);
  const t1 = ease(frame, 12, 24);
  const t2 = ease(frame, 18, 30);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${logo}) rotate(${(1 - logo) * -30}deg)`, marginTop: -160 }}>
        <AiLogo size={380} />
      </div>
      <div style={{ marginTop: 60, display: "flex", alignItems: "center", gap: 16, fontFamily: F.head, fontSize: 96, color: C.white, opacity: t1, transform: `translateY(${(1 - t1) * 30}px)` }}>
        <BookmarkSimple size={88} weight="fill" color={C.yellow} /> SAVE THIS
      </div>
      <div style={{ marginTop: 18, fontFamily: F.body, fontWeight: 800, fontSize: 52, color: C.grey, opacity: t2, transform: `translateY(${(1 - t2) * 30}px)` }}>
        Follow for <span style={{ color: C.yellow }}>daily AI tools</span>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- captions ---------- */

type Word = { text: string; start: number; end: number };
const CHUNKS: Word[][] = (() => {
  const all: Word[] = timing.segments.flatMap((s) => s.words);
  const out: Word[][] = [];
  let cur: Word[] = [];
  for (const w of all) {
    cur.push(w);
    if (cur.length >= 3 || /[.,?!]$/.test(w.text)) {
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
  if (frame >= END_FROM) return null;
  const idx = CHUNKS.findIndex((c, i) => {
    const next = CHUNKS[i + 1];
    const until = next ? Math.min(next[0].start, c[c.length - 1].end + 0.6) : c[c.length - 1].end + 0.5;
    return t >= c[0].start - 0.05 && t < until;
  });
  if (idx < 0) return null;
  const chunk = CHUNKS[idx];
  const inP = ease(frame, Math.round(chunk[0].start * FPS) - 2, Math.round(chunk[0].start * FPS) + 4);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1395, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          maxWidth: 900,
          padding: "16px 30px",
          borderRadius: 22,
          background: "rgba(13,14,17,0.88)",
          border: `2px solid rgba(255,212,0,0.25)`,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0 20px",
          transform: `scale(${0.92 + inP * 0.08})`,
          opacity: inP,
        }}
      >
        {chunk.map((w, i) => {
          const active = t >= w.start - 0.03 && (i === chunk.length - 1 || t < chunk[i + 1].start - 0.03);
          return (
            <span
              key={i}
              style={{
                fontFamily: F.body,
                fontWeight: 900,
                fontSize: 60,
                lineHeight: 1.2,
                color: active ? C.yellow : C.white,
                transform: `scale(${active ? 1.08 : 1})`,
                display: "inline-block",
              }}
            >
              {w.text.replace(/[,.]$/, "")}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/* ---------- transitions + sound ---------- */

// Diagonal yellow panel that covers the screen exactly at each cut.
const Wipe: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  if (frame < at - 8 || frame > at + 8) return null;
  const cx =
    frame < at
      ? interpolate(frame, [at - 8, at], [-1350, 540], { ...clamp, easing: EASE_OUT })
      : interpolate(frame, [at, at + 8], [540, 2450], { ...clamp, easing: EASE_IN });
  return (
    <>
      <div style={{ position: "absolute", top: -150, left: cx - 1000 - 140, width: 2000, height: 2220, background: C.ink, transform: "skewX(-15deg)" }} />
      <div style={{ position: "absolute", top: -150, left: cx - 1000, width: 2000, height: 2220, background: C.yellow, transform: "skewX(-15deg)" }} />
    </>
  );
};

const Sfx: React.FC<{ at: number; src: string; volume?: number }> = ({ at, src, volume = 0.35 }) => (
  <Sequence from={Math.max(0, at)} durationInFrames={30} layout="none">
    <Audio src={staticFile(`sfx/${src}.wav`)} volume={volume} />
  </Sequence>
);


const SOUND: { at: number; src: string; volume?: number }[] = [
  { at: 1, src: "impact", volume: 0.55 },
  ...["free", "ai", "tools"].map((k) => ({ at: cueAbs("s1", k), src: "pop", volume: 0.3 })),
  { at: cueAbs("s1", "number"), src: "pop", volume: 0.4 },
  ...CUTS.map((c) => ({ at: c - 7, src: "whoosh", volume: 0.3 })),
  { at: cueAbs("s2", "click"), src: "click", volume: 0.6 },
  { at: cueAbs("s2", "click") + 12, src: "click", volume: 0.6 },
  { at: cueAbs("s2", "broken"), src: "pop", volume: 0.35 },
  { at: cueAbs("s3", "homework"), src: "ding", volume: 0.35 },
  { at: cueAbs("s4", "holes"), src: "pop", volume: 0.35 },
  { at: cueAbs("s4", "fix"), src: "ding", volume: 0.35 },
  { at: cueAbs("s5", "teaches"), src: "whoosh", volume: 0.2 },
  { at: cueAbs("s5", "outdated"), src: "pop", volume: 0.35 },
  ...[0, 1, 2, 3, 4].map((i) => ({ at: cueAbs("s7", "comment") + 4 + i * 3, src: "click", volume: 0.45 })),
  { at: cueAbs("s7", "send"), src: "whoosh", volume: 0.25 },
  { at: cueAbs("s7", "dm"), src: "ding", volume: 0.35 },
  { at: END_FROM + 4, src: "impact", volume: 0.35 },
];

/* ---------- composition ---------- */

export const FiveFreeTools: React.FC = () => {
  const S = (id: string, node: React.ReactNode) => (
    <Sequence key={id} from={span(id).from} durationInFrames={span(id).dur}>
      {node}
    </Sequence>
  );
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Background />
      {S("s1", <Hook />)}
      {S(
        "s2",
        <ToolScene id="s2" n={1} name="Chrome DevTools MCP" benefitAt={cue("s2", "lets")} benefit={<>Your AI agent controls a <Highlight at={cue("s2", "real")}>real browser</Highlight></>}>
          <BrowserIllus />
        </ToolScene>,
      )}
      {S(
        "s3",
        <ToolScene id="s3" n={2} name="Plannotator" benefitAt={cue("s3", "before")} benefit={<>Review your AI's <Highlight at={cue("s3", "plan", 1)}>plan</Highlight> before it builds</>}>
          <PlanIllus />
        </ToolScene>,
      )}
      {S(
        "s4",
        <ToolScene
          id="s4"
          n={3}
          name="Codex Security"
          by="by OpenAI"
          benefitAt={cue("s4", "it")}
          benefit={<>Finds and fixes <Highlight at={cue("s4", "holes")}>security holes</Highlight></>}
          footnote="Runs inside Codex. Needs an OpenAI account."
        >
          <CodeIllus />
        </ToolScene>,
      )}
      {S(
        "s5",
        <ToolScene id="s5" n={4} name="Modern Web Guidance" benefitAt={cue("s5", "teaches")} benefit={<>No more <Highlight at={cue("s5", "outdated")}>outdated code</Highlight> from AI</>}>
          <GuidanceIllus />
        </ToolScene>,
      )}
      {S(
        "s6",
        <ToolScene id="s6" n={5} name="Buzz" by="by Block" benefitAt={cue("s6", "one")} benefit={<>People + <Highlight at={cue("s6", "agents")}>AI agents</Highlight> in one workspace</>}>
          <ChatIllus />
        </ToolScene>,
      )}
      {S("s7", <Cta />)}
      <Sequence from={END_FROM}>
        <EndCard />
      </Sequence>
      <Captions />
      {CUTS.map((c) => (
        <Wipe key={c} at={c} />
      ))}
      <Sequence from={timing.lead_in} layout="none"><Audio src={staticFile("vo/aitools/vo.mp3")} /></Sequence>
      {SOUND.map((s, i) => (
        <Sfx key={i} {...s} />
      ))}
    </AbsoluteFill>
  );
};

