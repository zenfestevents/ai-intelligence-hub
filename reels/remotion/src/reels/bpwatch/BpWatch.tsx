import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Heartbeat, PaperPlaneTilt, Person, Pulse, Stethoscope, Warning, Waveform } from "@phosphor-icons/react";
import timing from "../bpwatch-timing.json";
import { C, F } from "../../themes/aitools";
import { clamp, EndCard, ease, makeTimeline, Sfx, Timing, usePop } from "../common";

// Reel: Google Research, "Detecting signs of hypertension using wearable sensors" (5 Nov 2026), paper in Nature.
// Facts: AI-PPG-ACC-HTN uses consumer smartwatch PPG + accelerometer, no cuff calibration; self-supervised on
// 492,347 hours from 2,109 participants; estimates hypertensive state over multiple days; 196-person multi-center
// study vs 24-hour ambulatory BP monitoring; initial screening PPV 80.6%. Over a billion people have hypertension and
// more than half of adults with it are unaware. Not a diagnosis; early research. 18 Nov 2026.
// Style: a drawn smartwatch (our own, no brand) with camera moves: zooms, pans, tilts.
// Captions: one line, words fill yellow as they're spoken.
const T = makeTimeline(timing as Timing);
export const BPWATCH_TOTAL = timing.total;
const { cue, cueAbs, END_FROM, SPANS, WORDS, FPS } = T;

/* ---------- building blocks ---------- */

const Backdrop: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <AbsoluteFill style={{ background: "radial-gradient(circle 720px at 540px 780px, rgba(255,77,77,0.10), transparent 70%)" }} />
  </AbsoluteFill>
);

// Our own drawn watch: rounded body, strap, a screen that takes children.
const Watch: React.FC<{ size?: number; children?: React.ReactNode }> = ({ size = 520, children }) => {
  const w = size;
  const h = size * 1.12;
  return (
    <div style={{ position: "relative", width: w, height: h + size * 0.9 }}>
      <div style={{ position: "absolute", left: w * 0.2, width: w * 0.6, top: 0, height: size * 0.5, background: "#2A2D35", borderRadius: "30px 30px 0 0" }} />
      <div style={{ position: "absolute", left: w * 0.2, width: w * 0.6, bottom: 0, height: size * 0.5, background: "#2A2D35", borderRadius: "0 0 30px 30px" }} />
      <div style={{ position: "absolute", left: 0, top: size * 0.45, width: w, height: h, borderRadius: size * 0.24, background: "#3A3E48", boxShadow: "0 40px 90px rgba(0,0,0,0.7)", padding: size * 0.05 }}>
        <div style={{ width: "100%", height: "100%", borderRadius: size * 0.2, background: "#050608", overflow: "hidden", position: "relative" }}>{children}</div>
      </div>
      <div style={{ position: "absolute", right: -size * 0.04, top: size * 0.45 + h * 0.3, width: size * 0.06, height: size * 0.16, borderRadius: 10, background: "#4A4F5A" }} />
    </div>
  );
};

// A moving trace line, drawn with SVG.
const Trace: React.FC<{ w: number; h: number; color: string; kind: "pulse" | "motion"; speed?: number }> = ({ w, h, color, kind, speed = 4 }) => {
  const frame = useCurrentFrame();
  const pts: string[] = [];
  for (let x = 0; x <= w; x += 6) {
    const t = (x + frame * speed) / w;
    let y: number;
    if (kind === "pulse") {
      const ph = (t * 4) % 1;
      y = ph < 0.08 ? -Math.sin((ph / 0.08) * Math.PI) * 0.9 : ph < 0.16 ? Math.sin(((ph - 0.08) / 0.08) * Math.PI) * 0.3 : Math.sin(ph * 6) * 0.05;
    } else {
      y = Math.sin(t * 23) * 0.25 + Math.sin(t * 61) * 0.12;
    }
    pts.push(`${x},${h / 2 + y * h * 0.45}`);
  }
  return (
    <svg width={w} height={h}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

// Camera: everything inside zooms/pans with the scene.
const Camera: React.FC<{ from: number[]; to: number[]; dur: number; children: React.ReactNode }> = ({ from, to, dur, children }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, dur], [0, 1], clamp);
  const k = (i: number) => from[i] + (to[i] - from[i]) * p;
  return <AbsoluteFill style={{ transform: `translate(${k(0)}px, ${k(1)}px) scale(${k(2)}) rotate(${k(3)}deg)` }}>{children}</AbsoluteFill>;
};

const Layer: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const enter = ease(frame, 0, 12);
  const exit = ease(frame, dur - 6, dur + 8);
  return <AbsoluteFill style={{ opacity: enter * (1 - exit), transform: `scale(${1 + exit * 0.25})`, filter: `blur(${exit * 10}px)` }}>{children}</AbsoluteFill>;
};

const Head: React.FC<{ top: number; at?: number; children: React.ReactNode; size?: number }> = ({ top, at = 0, children, size = 100 }) => {
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
  const cuffAt = cue("s1", "with");
  const strike = ease(frame, 14, 24);
  const beat = 1 + 0.08 * Math.max(0, Math.sin(frame / 4));
  return (
    <AbsoluteFill>
      <Camera from={[0, 120, 1.25, -6]} to={[0, 0, 1, 0]} dur={60}>
        <div style={{ position: "absolute", top: 370, left: 350 }}>
          <Watch size={380}>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <Heartbeat size={120} weight="fill" color={C.red} style={{ transform: `scale(${beat})` }} />
              <div style={{ fontFamily: F.head, fontSize: 46, color: C.white }}>BLOOD PRESSURE</div>
              <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 32, color: C.yellow }}>checking…</div>
            </div>
          </Watch>
        </div>
      </Camera>
      <div style={{ position: "absolute", top: 1165, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: ease(frame, cuffAt - 6, cuffAt) }}>
        <div style={{ fontFamily: F.head, fontSize: 104, color: C.yellow }}>NO CUFF NEEDED</div>
      </div>
      <div style={{ position: "absolute", top: 260, left: 0, right: 0, textAlign: "center", fontFamily: F.head, fontSize: 70, color: C.white, opacity: strike }}>
        COULD SPOT HIGH BLOOD PRESSURE
      </div>
    </AbsoluteFill>
  );
};

const S2: React.FC = () => {
  const frame = useCurrentFrame();
  const at = cue("s2", "492000");
  const n = Math.round(interpolate(frame, [at - 8, at + 16], [0, 492000], clamp));
  const pAt = cue("s2", "2000");
  const people = usePop(pAt - 2, 12);
  return (
    <AbsoluteFill>
      <Head top={270} size={84}>
        <span style={{ color: C.yellow }}>GOOGLE</span> TRAINED AN AI ON
      </Head>
      <Camera from={[0, 0, 0.9, 0]} to={[0, 0, 1.05, 0]} dur={180}>
        <div style={{ position: "absolute", top: 450, left: 0, right: 0, textAlign: "center" }}>
          <div style={{ fontFamily: F.head, fontSize: 220, color: C.white, lineHeight: 1 }}>~{n.toLocaleString("en-US")}</div>
          <div style={{ fontFamily: F.head, fontSize: 90, color: C.yellow }}>HOURS OF WATCH DATA</div>
        </div>
      </Camera>
      <div style={{ position: "absolute", top: 860, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${people})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, background: C.panel, border: `2px solid ${C.line}`, borderRadius: 999, padding: "20px 44px" }}>
          <div style={{ display: "flex" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Person key={i} size={60} weight="fill" color={i % 2 ? C.grey : C.white} style={{ marginLeft: i ? -14 : 0 }} />
            ))}
          </div>
          <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 52, color: C.white }}>from 2,000+ people</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const DAYS = ["DAY 1", "DAY 2", "DAY 3"];

const S3: React.FC = () => {
  const frame = useCurrentFrame();
  const pulseAt = cue("s3", "pulse");
  const wristAt = cue("s3", "wrist");
  const daysAt = cue("s3", "days");
  return (
    <AbsoluteFill>
      <Camera from={[160, 60, 1.15, 4]} to={[0, 0, 1, 0]} dur={50}>
        <div style={{ position: "absolute", top: 280, left: 160, right: 160, display: "flex", flexDirection: "column", gap: 30 }}>
          {[
            { at: pulseAt, label: "PULSE (light sensor)", kind: "pulse" as const, color: C.red, icon: Pulse },
            { at: wristAt, label: "TINY WRIST MOVEMENTS", kind: "motion" as const, color: C.yellow, icon: Waveform },
          ].map((r) => {
            const t = ease(frame, r.at - 4, r.at + 8);
            const Icon = r.icon;
            return (
              <div key={r.label} style={{ background: C.panel, border: `2px solid ${C.line}`, borderRadius: 26, padding: "24px 30px", opacity: t, transform: `translateY(${(1 - t) * 40}px)` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: F.body, fontWeight: 900, fontSize: 40, color: C.white }}>
                  <Icon size={50} weight="bold" color={r.color} /> {r.label}
                </div>
                <Trace w={690} h={150} color={r.color} kind={r.kind} />
              </div>
            );
          })}
        </div>
      </Camera>
      <div style={{ position: "absolute", top: 940, left: 120, right: 120, display: "flex", gap: 20 }}>
        {DAYS.map((d, i) => {
          const t = ease(frame, daysAt - 4 + i * 6, daysAt + 4 + i * 6);
          return (
            <div key={d} style={{ flex: 1, height: 150, borderRadius: 22, background: t > 0.5 ? C.yellow : C.panel2, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.head, fontSize: 60, color: t > 0.5 ? C.ink : C.grey, transform: `scale(${0.9 + 0.1 * t})` }}>
              {d}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 1130, left: 0, right: 0, textAlign: "center", fontFamily: F.body, fontWeight: 800, fontSize: 44, color: C.grey, opacity: ease(frame, daysAt + 10, daysAt + 20) }}>
        worn over a few days
      </div>
    </AbsoluteFill>
  );
};

const S4: React.FC = () => {
  const frame = useCurrentFrame();
  const natAt = cue("s4", "nature");
  const monAt = cue("s4", "monitoring");
  const eightAt = cue("s4", "8");
  const badge = usePop(natAt - 2, 11);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 270, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${badge}) rotate(${(1 - badge) * -8}deg)` }}>
        <div style={{ background: C.white, borderRadius: 20, padding: "16px 40px", textAlign: "center" }}>
          <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 34, color: "#555", letterSpacing: 3 }}>PUBLISHED IN</div>
          <div style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 92, color: C.ink, lineHeight: 1 }}>Nature</div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 520, left: 120, right: 120, display: "flex", alignItems: "center", gap: 22, background: C.panel, border: `2px solid ${C.line}`, borderRadius: 22, padding: "22px 30px", opacity: ease(frame, monAt - 6, monAt + 4) }}>
        <Stethoscope size={70} weight="fill" color={C.yellow} />
        <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 42, color: C.white, lineHeight: 1.2 }}>Checked against a full day of medical monitoring</span>
      </div>
      <Camera from={[0, 60, 0.92, 0]} to={[0, 0, 1, 0]} dur={60}>
        <div style={{ position: "absolute", top: 760, left: 120, right: 120, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
          {Array.from({ length: 10 }).map((_, i) => {
            const t = ease(frame, eightAt - 6 + i * 2, eightAt + 2 + i * 2);
            const right = i < 8;
            return (
              <div key={i} style={{ height: 150, borderRadius: 20, background: t > 0.5 ? (right ? C.yellow : C.panel2) : C.panel, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${0.85 + 0.15 * t})` }}>
                <Person size={96} weight="fill" color={t > 0.5 && right ? C.ink : C.dim} />
              </div>
            );
          })}
        </div>
      </Camera>
      <div style={{ position: "absolute", top: 1110, left: 0, right: 0, textAlign: "center", fontFamily: F.head, fontSize: 78, color: C.white, opacity: ease(frame, eightAt + 14, eightAt + 24) }}>
        RIGHT ABOUT <span style={{ color: C.yellow }}>8 IN 10</span> FLAGS
      </div>
    </AbsoluteFill>
  );
};

const S5: React.FC = () => {
  const frame = useCurrentFrame();
  const bAt = cue("s5", "billion");
  const hAt = cue("s5", "half");
  const rAt = cue("s5", "research");
  const bar = ease(frame, hAt - 2, hAt + 16);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 270, left: 0, right: 0, textAlign: "center", opacity: ease(frame, bAt - 6, bAt + 4) }}>
        <div style={{ fontFamily: F.head, fontSize: 150, color: C.yellow, lineHeight: 1 }}>1 BILLION+</div>
        <div style={{ fontFamily: F.head, fontSize: 66, color: C.white }}>PEOPLE HAVE HIGH BLOOD PRESSURE</div>
      </div>
      <div style={{ position: "absolute", top: 560, left: 110, right: 110, opacity: ease(frame, hAt - 6, hAt + 4) }}>
        <div style={{ height: 110, borderRadius: 24, overflow: "hidden", display: "flex", background: C.panel2 }}>
          <div style={{ width: `${bar * 55}%`, background: C.red, display: "flex", alignItems: "center", paddingLeft: 26, fontFamily: F.head, fontSize: 52, color: C.white, whiteSpace: "nowrap", overflow: "hidden" }}>DON'T KNOW IT</div>
        </div>
        <div style={{ marginTop: 16, fontFamily: F.body, fontWeight: 800, fontSize: 42, color: C.grey, textAlign: "center" }}>more than half of them</div>
      </div>
      <div style={{ position: "absolute", top: 860, left: 100, right: 100, display: "flex", alignItems: "center", gap: 24, background: C.yellow, borderRadius: 24, padding: "26px 34px", opacity: ease(frame, rAt - 4, rAt + 6), transform: `translateY(${(1 - ease(frame, rAt - 4, rAt + 6)) * 40}px)` }}>
        <Warning size={84} weight="fill" color={C.ink} />
        <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 44, color: C.ink, lineHeight: 1.2 }}>Still research, not a diagnosis. Get a proper check-up.</span>
      </div>
    </AbsoluteFill>
  );
};

const S6: React.FC = () => {
  const frame = useCurrentFrame();
  const at = cue("s6", "share");
  const t = usePop(at - 2, 11);
  const tapAt = at + 14;
  const press = 1 - 0.08 * Math.sin(Math.PI * ease(frame, tapAt, tapAt + 8));
  const ring = ease(frame, tapAt + 2, tapAt + 24);
  const hint = ease(frame, tapAt + 6, tapAt + 18);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 290, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${t})` }}>
        <div style={{ position: "relative", width: 320, height: 320 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `8px solid ${C.yellow}`, opacity: (1 - ring) * 0.8, transform: `scale(${1 + ring * 0.45})` }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: C.yellow, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${press})` }}>
            <PaperPlaneTilt size={170} weight="fill" color={C.ink} />
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 700, left: 60, right: 60, textAlign: "center", fontFamily: F.head, fontSize: 86, color: C.white, lineHeight: 1.05, opacity: t }}>
        SEND THIS TO
        <br />
        SOMEONE WHO NEVER
        <br />
        <span style={{ color: C.yellow }}>CHECKS THEIR BP</span>
      </div>
      <div style={{ position: "absolute", top: 1020, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: hint, transform: `translateY(${(1 - hint) * 24}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, background: C.white, borderRadius: 60, padding: "18px 40px" }}>
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 50, color: C.ink }}>Tap</span>
          <div style={{ width: 70, height: 70, borderRadius: 35, background: C.yellow, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PaperPlaneTilt size={44} weight="fill" color={C.ink} />
          </div>
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 50, color: C.ink }}>and pick someone</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- captions: one line; words fill yellow as they're spoken ---------- */

const LINES = (() => {
  const out: (typeof WORDS)[] = [];
  let cur: typeof WORDS = [];
  for (const w of WORDS) {
    cur.push(w);
    if (cur.length >= 4 || /[.,?!:]$/.test(w.text)) {
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
  const i = LINES.findIndex((l, k) => t >= l[0].start - 0.05 && (k === LINES.length - 1 || t < LINES[k + 1][0].start - 0.05));
  if (i < 0) return null;
  const line = LINES[i];
  if (t > line[line.length - 1].end + 0.5) return null;
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 1370, display: "flex", justifyContent: "center", gap: 18, flexWrap: "wrap" }}>
      {line.map((w, k) => {
        const fill = interpolate(t, [w.start - 0.03, Math.max(w.start + 0.05, w.end)], [0, 100], clamp);
        return (
          <span
            key={k}
            style={{
              fontFamily: F.head,
              fontSize: 80,
              textTransform: "uppercase",
              color: "transparent",
              backgroundImage: `linear-gradient(90deg, ${C.yellow} ${fill}%, ${C.white} ${fill}%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.9))",
            }}
          >
            {w.text.replace(/[,.:?!]$/, "")}
          </span>
        );
      })}
    </div>
  );
};

/* ---------- sound ---------- */

const SOUND: { at: number; src: string; volume?: number }[] = [
  { at: 2, src: "whoosh", volume: 0.4 },
  { at: cueAbs("s1", "cuff"), src: "impact", volume: 0.45 },
  ...SPANS.slice(1).map((s) => ({ at: s.from - 2, src: "whoosh", volume: 0.25 })),
  { at: cueAbs("s2", "492000"), src: "ding", volume: 0.35 },
  { at: cueAbs("s2", "2000"), src: "pop", volume: 0.3 },
  { at: cueAbs("s3", "pulse"), src: "pop", volume: 0.3 },
  { at: cueAbs("s3", "wrist"), src: "pop", volume: 0.3 },
  { at: cueAbs("s4", "nature"), src: "impact", volume: 0.4 },
  { at: cueAbs("s4", "8"), src: "ding", volume: 0.35 },
  { at: cueAbs("s5", "research"), src: "click", volume: 0.45 },
  { at: cueAbs("s6", "share") + 14, src: "whoosh", volume: 0.35 },
  { at: END_FROM + 4, src: "impact", volume: 0.35 },
];

/* ---------- composition ---------- */

const SCENES: Record<string, React.FC> = { s1: S1, s2: S2, s3: S3, s4: S4, s5: S5, s6: S6 };

export const BpWatch: React.FC = () => (
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
      <EndCard title="SHARE THIS" icon={<PaperPlaneTilt size={88} weight="fill" color={C.yellow} />} line={<>Send it to someone you <span style={{ color: C.yellow }}>care about</span></>} />
    </Sequence>
    <Captions />
    <Sequence from={timing.lead_in} layout="none">
      <Audio src={staticFile("vo/bpwatch/vo.mp3")} />
    </Sequence>
    {SOUND.map((s, i) => (
      <Sfx key={i} {...s} />
    ))}
  </AbsoluteFill>
);

/* ---------- cover (profile grid keeps only the middle 1080 x 1440, y 240-1680) ---------- */

export const BpWatchCover: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <AbsoluteFill style={{ background: "radial-gradient(circle 640px at 540px 980px, rgba(255,77,77,0.16), transparent 72%)" }} />
    <div style={{ position: "absolute", top: 300, left: 30, right: 30, textAlign: "center", fontFamily: F.head, fontSize: 100, lineHeight: 1.04, color: C.white }}>
      YOUR WATCH COULD SPOT
      <br />
      <span style={{ color: C.yellow }}>HIGH BLOOD PRESSURE</span>
    </div>
    <div style={{ position: "absolute", top: 600, left: 340, transform: "rotate(-4deg)" }}>
      <Watch size={400}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Heartbeat size={130} weight="fill" color={C.red} />
          <div style={{ fontFamily: F.head, fontSize: 56, color: C.white }}>NO CUFF</div>
        </div>
      </Watch>
    </div>
  </AbsoluteFill>
);
