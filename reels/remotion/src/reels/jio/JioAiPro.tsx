import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { CalendarX, CheckCircle, CloudArrowUp, Lightning, PaperPlaneTilt, Sparkle, Warning, VideoCamera } from "@phosphor-icons/react";
import timing from "../jio-timing.json";
import { C, F } from "../../themes/aitools";
import { clamp, EndCard, ease, makeTimeline, norm, Sfx, Timing, usePop, Word } from "../common";

// Reel: Jio's free Google AI Pro offer is closed for new claims. Facts: strategy/posts_2026-11-17.md, Post 1
// (Inc42, 16 Nov 2026). Style: "stamp & ticket" — paper tickets on a dark desk, rubber stamps that slam down,
// a tear-off calendar, a ticket-punch progress bar, karaoke phrase captions in a pill. Brand names as text only.
const T = makeTimeline(timing as Timing);
export const JIO_TOTAL = timing.total;
const { span, cue, cueAbs, END_FROM, SPANS, WORDS, FPS } = T;

const PAPER = "#F3EEE2";
const PAPER_INK = "#1B1B1F";

/* ---------- building blocks ---------- */

const Desk: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 26px)",
          transform: `translateY(${(frame * 0.4) % 26}px)`,
        }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(circle 700px at 540px 820px, rgba(255,212,0,0.10), transparent 70%)" }} />
    </AbsoluteFill>
  );
};

// A paper ticket with punched notches on both sides.
const Ticket: React.FC<{ w: number; h: number; children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ w, h, children, color = PAPER, style }) => (
  <div
    style={{
      width: w,
      height: h,
      background: color,
      borderRadius: 26,
      position: "relative",
      boxShadow: "0 30px 60px rgba(0,0,0,0.55)",
      ...style,
    }}
  >
    {children}
    {[-34, w - 34].map((x) => (
      <div key={x} style={{ position: "absolute", left: x, top: h / 2 - 34, width: 68, height: 68, borderRadius: 34, background: C.bg }} />
    ))}
  </div>
);

// A rubber stamp that drops from above and slams onto the paper.
const Stamp: React.FC<{ at: number; text: string; color?: string; rot?: number; size?: number }> = ({ at, text, color = C.red, rot = -12, size = 150 }) => {
  const frame = useCurrentFrame();
  if (frame < at - 6) return null;
  const drop = ease(frame, at - 6, at);
  const settle = interpolate(frame, [at, at + 4, at + 10], [1.12, 0.97, 1], clamp);
  return (
    <div
      style={{
        transform: `rotate(${rot}deg) scale(${(2.2 - 1.2 * drop) * (frame >= at ? settle : 1)})`,
        opacity: drop,
        border: `12px solid ${color}`,
        borderRadius: 22,
        padding: "6px 34px 0",
        fontFamily: F.head,
        fontSize: size,
        lineHeight: 1.1,
        color,
        letterSpacing: 6,
        mixBlendMode: "normal",
        background: "rgba(255,77,77,0.06)",
        textShadow: "0 0 1px rgba(0,0,0,0.2)",
      }}
    >
      {text}
    </div>
  );
};

const Layer: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const enter = ease(frame, 0, 12);
  const exit = ease(frame, dur - 6, dur + 8);
  return (
    <AbsoluteFill style={{ transform: `translateX(${(1 - enter) * 120 - exit * 1100}px) rotate(${exit * -6}deg)`, opacity: enter }}>
      {children}
    </AbsoluteFill>
  );
};

const Kicker: React.FC<{ top: number; children: React.ReactNode; at?: number }> = ({ top, children, at = 0 }) => {
  const frame = useCurrentFrame();
  const t = ease(frame, at, at + 10);
  return (
    <div style={{ position: "absolute", top, left: 0, right: 0, textAlign: "center", opacity: t, transform: `translateY(${(1 - t) * 24}px)` }}>
      <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 44, color: C.ink, background: C.yellow, padding: "10px 26px", borderRadius: 12, letterSpacing: 1 }}>{children}</span>
    </div>
  );
};

/* ---------- scenes ---------- */

const S1: React.FC = () => {
  const frame = useCurrentFrame();
  const t = usePop(2, 12);
  const sub = ease(frame, 14, 26);
  return (
    <AbsoluteFill>
      <Kicker top={300}>INDIA · JIO USERS</Kicker>
      <div style={{ position: "absolute", top: 400, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `translateY(${(1 - t) * 400}px) rotate(${(1 - t) * 8 - 2}deg)` }}>
        <Ticket w={900} h={520}>
          <div style={{ padding: "56px 80px", textAlign: "center" }}>
            <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 46, color: "#6B6658", letterSpacing: 4 }}>FREE OFFER</div>
            <div style={{ fontFamily: F.head, fontSize: 132, lineHeight: 1.02, color: PAPER_INK, marginTop: 14 }}>GOOGLE</div>
            <div style={{ fontFamily: F.head, fontSize: 132, lineHeight: 1.02, color: PAPER_INK }}>AI PRO</div>
            <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 40, color: "#6B6658", marginTop: 20, opacity: sub }}>via Reliance Jio</div>
          </div>
        </Ticket>
      </div>
      <div style={{ position: "absolute", top: 945, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Stamp at={cue("s1", "closed")} text="CLOSED" size={150} rot={-6} />
      </div>
      <div style={{ position: "absolute", top: 1185, left: 0, right: 0, textAlign: "center", fontFamily: F.head, fontSize: 72, color: C.white, opacity: ease(frame, cue("s1", "new"), cue("s1", "new") + 8) }}>
        FOR <span style={{ color: C.yellow }}>NEW USERS</span>
      </div>
    </AbsoluteFill>
  );
};

const S2: React.FC = () => {
  const frame = useCurrentFrame();
  const flipAt = cue("s2", "window");
  const p = usePop(flipAt, 12);
  const stopAt = cue("s2", "stopped");
  const s = usePop(stopAt, 12);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 290, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${s})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22, background: C.panel, border: `2px solid ${C.line}`, borderRadius: 999, padding: "20px 40px" }}>
          <span style={{ width: 26, height: 26, borderRadius: 13, background: C.red, boxShadow: `0 0 ${10 + 8 * Math.sin(frame / 4)}px ${C.red}` }} />
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 50, color: C.white }}>New claims: STOPPED</span>
        </div>
      </div>
      {/* tear-off calendar */}
      <div style={{ position: "absolute", top: 470, left: 270, width: 540, perspective: 1400 }}>
        <div style={{ background: C.red, height: 120, borderRadius: "28px 28px 0 0", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.head, fontSize: 80, color: C.white, letterSpacing: 6 }}>
          OCTOBER
        </div>
        <div style={{ background: PAPER, height: 470, borderRadius: "0 0 28px 28px", boxShadow: "0 30px 60px rgba(0,0,0,0.55)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontFamily: F.head, fontSize: 300, lineHeight: 1, color: PAPER_INK, transform: `rotateX(${(1 - p) * 90}deg)`, transformOrigin: "50% 0%" }}>29</div>
          <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 40, color: "#6B6658", marginTop: 8, opacity: p }}>2026 · LAST DAY</div>
        </div>
        <div style={{ position: "absolute", right: -60, top: 60, opacity: p }}>
          <CalendarX size={120} weight="fill" color={C.yellow} />
        </div>
      </div>
      <div style={{ position: "absolute", top: 1130, left: 0, right: 0, textAlign: "center", fontFamily: F.head, fontSize: 76, color: C.white, opacity: p }}>
        CLAIM WINDOW <span style={{ color: C.red }}>ENDED</span>
      </div>
    </AbsoluteFill>
  );
};

const PERKS = [
  { key: "gemini", icon: Sparkle, text: "Google's best Gemini features" },
  { key: "image", icon: VideoCamera, text: "More image + video making" },
  { key: "2tb", icon: CloudArrowUp, text: "2 TB cloud storage" },
];

const S3: React.FC = () => {
  const frame = useCurrentFrame();
  const priceAt = cue("s3", "1950");
  const t = usePop(priceAt - 4, 11);
  const count = Math.round(interpolate(frame, [priceAt - 2, priceAt + 16], [0, 1950], clamp));
  return (
    <AbsoluteFill>
      <Kicker top={290}>WHAT IT'S WORTH</Kicker>
      <div style={{ position: "absolute", top: 400, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `rotate(${-3 + (1 - t) * 20}deg) scale(${t})` }}>
        <Ticket w={760} h={330} color={C.yellow}>
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontFamily: F.head, fontSize: 190, lineHeight: 1, color: C.ink }}>₹{count.toLocaleString("en-IN")}</div>
            <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 46, color: C.ink, marginTop: 6 }}>every month</div>
          </div>
        </Ticket>
      </div>
      <div style={{ position: "absolute", top: 800, left: 110, right: 110, display: "flex", flexDirection: "column", gap: 26 }}>
        {PERKS.map((p, i) => {
          const at = cue("s3", p.key);
          const pop = ease(frame, at - 3, at + 8);
          const Icon = p.icon;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 26, background: C.panel, border: `2px solid ${C.line}`, borderRadius: 22, padding: "22px 30px", opacity: pop, transform: `translateX(${(1 - pop) * (i % 2 ? 300 : -300)}px)` }}>
              <Icon size={64} weight="fill" color={C.yellow} />
              <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 48, color: C.white, whiteSpace: "nowrap" }}>{p.text}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const S4: React.FC = () => {
  const frame = useCurrentFrame();
  const goodAt = cue("s4", "good");
  const g = usePop(goodAt, 10);
  const barA = cue("s4", "keep");
  const barB = cue("s4", "started");
  const fill = ease(frame, barA, barB);
  const months = Math.round(fill * 18);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center", fontFamily: F.head, fontSize: 104, color: C.white }}>ALREADY ACTIVATED?</div>
      <div style={{ position: "absolute", top: 450, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 20, transform: `scale(${g})` }}>
        <CheckCircle size={96} weight="fill" color={C.green} />
        <span style={{ fontFamily: F.head, fontSize: 96, color: C.green }}>YOU KEEP IT</span>
      </div>
      <div style={{ position: "absolute", top: 680, left: 90, right: 90 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.body, fontWeight: 800, fontSize: 40, color: C.grey, marginBottom: 20 }}>
          <span>Day you started</span>
          <span>18 months</span>
        </div>
        {/* ticket-punch bar: 18 holes, one per month */}
        <div style={{ display: "flex", gap: 10, background: PAPER, borderRadius: 24, padding: 22 }}>
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 90, borderRadius: 10, background: i < months ? C.yellow : "#DCD5C4", boxShadow: i < months ? "inset 0 -6px 0 rgba(0,0,0,0.18)" : "none" }} />
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", top: 940, left: 0, right: 0, textAlign: "center" }}>
        <span style={{ fontFamily: F.head, fontSize: 210, color: C.yellow, lineHeight: 1 }}>{months}</span>
        <span style={{ fontFamily: F.head, fontSize: 80, color: C.white, marginLeft: 20 }}>MONTHS</span>
        <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 42, color: C.grey, marginTop: 4 }}>from the day you activated</div>
      </div>
    </AbsoluteFill>
  );
};

const S5: React.FC = () => {
  const frame = useCurrentFrame();
  const lapseAt = cue("s5", "lapse");
  const off = ease(frame, lapseAt, lapseAt + 8);
  const cutAt = cue("s5", "cut");
  const shake = frame >= cutAt && frame < cutAt + 10 ? Math.sin(frame * 3) * 10 : 0;
  const t = usePop(2, 12);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 290, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 18 }}>
        <Warning size={84} weight="fill" color={C.yellow} />
        <span style={{ fontFamily: F.head, fontSize: 100, color: C.yellow }}>THE CATCH</span>
      </div>
      <div style={{ position: "absolute", top: 460, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `translate(${shake}px, ${(1 - t) * 300}px)` }}>
        <Ticket w={880} h={440}>
          <div style={{ padding: "60px 80px" }}>
            <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 40, color: "#6B6658", letterSpacing: 3 }}>YOUR JIO RECHARGE</div>
            <div style={{ fontFamily: F.head, fontSize: 92, color: PAPER_INK, marginTop: 10 }}>ELIGIBLE PLAN</div>
            <div style={{ display: "flex", alignItems: "center", gap: 30, marginTop: 40 }}>
              <div style={{ width: 190, height: 96, borderRadius: 48, background: interpolate(off, [0, 1], [0, 1]) > 0.5 ? "#C9C2B1" : C.green, position: "relative" }}>
                <div style={{ position: "absolute", top: 8, left: 8 + (1 - off) * 94, width: 80, height: 80, borderRadius: 40, background: C.white, boxShadow: "0 4px 10px rgba(0,0,0,0.3)" }} />
              </div>
              <span style={{ fontFamily: F.head, fontSize: 84, color: off > 0.5 ? C.red : "#1E9E55" }}>{off > 0.5 ? "LAPSED" : "ACTIVE"}</span>
            </div>
          </div>
        </Ticket>
      </div>
      <div style={{ position: "absolute", top: 935, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Stamp at={cutAt} text="ACCESS CUT" size={110} rot={4} />
      </div>
      <div style={{ position: "absolute", top: 1190, left: 0, right: 0, textAlign: "center", fontFamily: F.body, fontWeight: 800, fontSize: 46, color: C.white, opacity: ease(frame, 10, 22) }}>
        Keep recharging to <span style={{ color: C.yellow }}>keep the AI plan</span>
      </div>
    </AbsoluteFill>
  );
};

const S6: React.FC = () => {
  const frame = useCurrentFrame();
  const sendAt = cue("s6", "send");
  const t = usePop(sendAt - 2, 11);
  // A "tap" on the share button: the button dips, and a ring ripples out from it. The plane stays inside its circle.
  const tapAt = sendAt + 10;
  const press = 1 - 0.08 * Math.sin(Math.PI * ease(frame, tapAt, tapAt + 8));
  const ring = ease(frame, tapAt + 2, tapAt + 24);
  const hint = ease(frame, tapAt + 6, tapAt + 18);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${t})` }}>
        <div style={{ position: "relative", width: 340, height: 340 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `8px solid ${C.yellow}`, opacity: (1 - ring) * 0.8, transform: `scale(${1 + ring * 0.45})` }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: C.yellow, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${press})` }}>
            <PaperPlaneTilt size={180} weight="fill" color={C.ink} />
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 730, left: 0, right: 0, textAlign: "center", fontFamily: F.head, fontSize: 112, color: C.white, lineHeight: 1.05, opacity: t }}>
        SEND THIS TO A<br />
        <span style={{ color: C.yellow }}>FRIEND ON JIO</span>
      </div>
      <div style={{ position: "absolute", top: 1010, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: hint, transform: `translateY(${(1 - hint) * 24}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, background: PAPER, borderRadius: 60, padding: "18px 40px" }}>
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 50, color: PAPER_INK }}>Tap</span>
          <div style={{ width: 70, height: 70, borderRadius: 35, background: C.yellow, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PaperPlaneTilt size={44} weight="fill" color={PAPER_INK} />
          </div>
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 50, color: PAPER_INK }}>and pick a friend</span>
        </div>
      </div>
      <div style={{ position: "absolute", top: 1170, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 14, opacity: ease(frame, cue("s6", "follow"), cue("s6", "follow") + 10) }}>
        <Lightning size={48} weight="fill" color={C.yellow} />
        <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 44, color: C.grey }}>Daily AI news in plain English</span>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- captions: a phrase pill, the spoken word boxed in yellow ---------- */

const PHRASES: Word[][] = (() => {
  const out: Word[][] = [];
  let cur: Word[] = [];
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
  const pi = PHRASES.findIndex((p, i) => t >= p[0].start - 0.05 && (i === PHRASES.length - 1 || t < PHRASES[i + 1][0].start - 0.05));
  if (pi < 0) return null;
  const ph = PHRASES[pi];
  if (t > ph[ph.length - 1].end + 0.6) return null;
  const inT = ease(frame, Math.round(ph[0].start * FPS) - 2, Math.round(ph[0].start * FPS) + 4);
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 1340, display: "flex", justifyContent: "center", opacity: inT, transform: `translateY(${(1 - inT) * 16}px)` }}>
      <div style={{ display: "flex", flexWrap: "nowrap", gap: 14, background: "rgba(13,14,17,0.88)", border: `2px solid ${C.line}`, borderRadius: 24, padding: "16px 24px" }}>
        {ph.map((w, i) => {
          const on = t >= w.start - 0.03;
          const active = on && (i === ph.length - 1 || t < ph[i + 1].start - 0.03);
          return (
            <span
              key={i}
              style={{
                fontFamily: F.body,
                fontWeight: 900,
                fontSize: 58,
                whiteSpace: "nowrap",
                color: active ? C.ink : on ? C.white : "rgba(255,255,255,0.45)",
                background: active ? C.yellow : "transparent",
                borderRadius: 10,
                padding: "0 10px",
              }}
            >
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
  { at: cueAbs("s1", "closed"), src: "impact", volume: 0.5 },
  ...SPANS.slice(1).map((s) => ({ at: s.from - 2, src: "whoosh", volume: 0.25 })),
  { at: cueAbs("s2", "stopped"), src: "pop", volume: 0.35 },
  { at: cueAbs("s2", "window"), src: "click", volume: 0.45 },
  { at: cueAbs("s3", "1950"), src: "ding", volume: 0.35 },
  { at: cueAbs("s3", "gemini"), src: "pop", volume: 0.3 },
  { at: cueAbs("s3", "image"), src: "pop", volume: 0.3 },
  { at: cueAbs("s3", "2tb"), src: "pop", volume: 0.3 },
  { at: cueAbs("s4", "good"), src: "ding", volume: 0.35 },
  { at: cueAbs("s5", "lapse"), src: "click", volume: 0.5 },
  { at: cueAbs("s5", "cut"), src: "impact", volume: 0.5 },
  { at: cueAbs("s6", "send") + 4, src: "whoosh", volume: 0.35 },
  { at: END_FROM + 4, src: "impact", volume: 0.35 },
];

/* ---------- composition ---------- */

const SCENES: Record<string, React.FC> = { s1: S1, s2: S2, s3: S3, s4: S4, s5: S5, s6: S6 };

export const JioAiPro: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Desk />
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
      <EndCard
        title="SHARE THIS"
        icon={<PaperPlaneTilt size={88} weight="fill" color={C.yellow} />}
        line={<>Send it to a friend on <span style={{ color: C.yellow }}>Jio</span></>}
      />
    </Sequence>
    <Captions />
    <Sequence from={timing.lead_in} layout="none">
      <Audio src={staticFile("vo/jio/vo.mp3")} />
    </Sequence>
    {SOUND.map((s, i) => (
      <Sfx key={i} {...s} />
    ))}
  </AbsoluteFill>
);

/* ---------- cover (profile grid keeps only the middle 1080 x 1440, y 240-1680) ---------- */

export const JioAiProCover: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <AbsoluteFill style={{ background: "radial-gradient(circle 640px at 540px 900px, rgba(255,212,0,0.14), transparent 72%)" }} />
    <div style={{ position: "absolute", top: 330, left: 0, right: 0, textAlign: "center", fontFamily: F.head, fontSize: 120, lineHeight: 1.04, color: C.white }}>
      JIO'S FREE
      <br />
      <span style={{ color: C.yellow }}>GOOGLE AI PRO</span>
    </div>
    <div style={{ position: "absolute", top: 640, left: 0, right: 0, display: "flex", justifyContent: "center", transform: "rotate(-2deg)" }}>
      <Ticket w={860} h={330}>
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 42, color: "#6B6658", letterSpacing: 4 }}>WORTH</div>
          <div style={{ fontFamily: F.head, fontSize: 160, color: PAPER_INK, lineHeight: 1 }}>₹1,950/mo</div>
        </div>
      </Ticket>
    </div>
    <div style={{ position: "absolute", top: 1030, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div style={{ transform: "rotate(-6deg)", border: `12px solid ${C.red}`, borderRadius: 22, padding: "6px 40px 0", fontFamily: F.head, fontSize: 150, lineHeight: 1.1, color: C.red, letterSpacing: 6 }}>
        CLOSED
      </div>
    </div>
    <div style={{ position: "absolute", top: 1330, left: 0, right: 0, textAlign: "center", fontFamily: F.body, fontWeight: 800, fontSize: 54, color: C.white }}>
      Already have it? <span style={{ color: C.yellow }}>Read this</span>
    </div>
  </AbsoluteFill>
);
