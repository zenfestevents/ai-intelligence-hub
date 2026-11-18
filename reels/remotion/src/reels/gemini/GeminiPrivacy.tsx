import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { ChatsCircle, ClockCountdown, GearSix, PaperPlaneTilt, Brain, ClockCounterClockwise } from "@phosphor-icons/react";
import timing from "../gemini-timing.json";
import { C, F } from "../../themes/aitools";
import { EndCard, ease, makeTimeline, Sfx, Timing, usePop } from "../common";

// Reel: Gemini splits "Keep Activity" into separate History and AI-training settings; with history off, chats are
// now kept about two months (was 72 hours). Facts: Google blog "Gemini app updates: New chat history and training
// controls" (16 Nov 2026), TechCrunch 17 Nov 2026, Android Authority. Rolling out globally "in the coming weeks".
// Style: split screen before/after — a seam down the middle, BEFORE (red) vs AFTER (yellow), toggle switches.
const T = makeTimeline(timing as Timing);
export const GEMINI_TOTAL = timing.total;
const { span, cue, cueAbs, END_FROM, SPANS, WORDS, FPS } = T;

const RED = "#FF5A5A";

/* ---------- pieces ---------- */

const Toggle: React.FC<{ on: number; size?: number; color?: string }> = ({ on, size = 1, color = C.green }) => {
  const w = 170 * size;
  const h = 96 * size;
  const k = h - 16 * size;
  return (
    <div style={{ width: w, height: h, borderRadius: h, background: on > 0.5 ? color : "#3A3E47", position: "relative", flexShrink: 0, transition: "none" }}>
      <div style={{ position: "absolute", top: 8 * size, left: 8 * size + on * (w - k - 16 * size), width: k, height: k, borderRadius: k, background: C.white, boxShadow: "0 4px 10px rgba(0,0,0,0.4)" }} />
    </div>
  );
};

const Row: React.FC<{ icon: React.ReactNode; label: string; on: number; dim?: number; color?: string }> = ({ icon, label, on, dim = 0, color }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 26, background: C.panel, border: `2px solid ${C.line}`, borderRadius: 30, padding: "26px 32px", opacity: 1 - dim * 0.6 }}>
    {icon}
    <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 52, color: C.white, flex: 1, whiteSpace: "nowrap" }}>{label}</span>
    <Toggle on={on} color={color} />
  </div>
);

const SideTag: React.FC<{ text: string; color: string; side: "l" | "r"; top?: number }> = ({ text, color, side, top = 250 }) => (
  <div style={{ position: "absolute", top, ...(side === "l" ? { left: 0, width: 540 } : { left: 540, width: 540 }), display: "flex", justifyContent: "center" }}>
    <div style={{ fontFamily: F.head, fontSize: 64, letterSpacing: 4, color: C.ink, background: color, padding: "6px 30px 0", borderRadius: 14 }}>{text}</div>
  </div>
);

// The seam: the page is split down the middle; `split` 0..1 opens it.
const Seam: React.FC<{ split: number }> = ({ split }) => (
  <>
    <AbsoluteFill style={{ background: `linear-gradient(90deg, rgba(255,90,90,${0.1 * split}) 0 50%, rgba(255,212,0,${0.1 * split}) 50% 100%)` }} />
    <div style={{ position: "absolute", left: 537, top: 960 - 960 * split, width: 6, height: 1920 * split, background: C.white, opacity: 0.85 }} />
  </>
);

const Layer: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const enter = ease(frame, 0, 12);
  const exit = ease(frame, dur - 6, dur + 6);
  return <AbsoluteFill style={{ opacity: enter * (1 - exit), transform: `scale(${0.96 + enter * 0.04 + exit * 0.03})` }}>{children}</AbsoluteFill>;
};

/* ---------- scenes ---------- */

const S1: React.FC = () => {
  const frame = useCurrentFrame();
  const t = usePop(2, 12);
  const keep = cue("s1", "keep");
  const k = usePop(keep, 11);
  const offAt = cue("s1", "training") + 4;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 260, left: 60, right: 60, textAlign: "center", transform: `scale(${t})` }}>
        <div style={{ fontFamily: F.head, fontSize: 112, lineHeight: 1.02, color: C.white }}>
          STOP AI TRAINING
          <br />
          <span style={{ color: C.yellow }}>KEEP YOUR CHATS</span>
        </div>
      </div>
      <div style={{ position: "absolute", top: 640, left: 80, right: 80, display: "flex", flexDirection: "column", gap: 30 }}>
        <div style={{ opacity: ease(frame, 6, 16), transform: `translateX(${(1 - ease(frame, 6, 16)) * -300}px)` }}>
          <Row icon={<Brain size={72} weight="fill" color={C.yellow} />} label="AI training" on={1 - ease(frame, offAt, offAt + 8)} />
        </div>
        <div style={{ opacity: Math.min(1, k * 1.5), transform: `translateX(${(1 - k) * 300}px)` }}>
          <Row icon={<ClockCounterClockwise size={72} weight="bold" color={C.yellow} />} label="Chat history" on={1} />
        </div>
      </div>
      <div style={{ position: "absolute", top: 1040, left: 0, right: 0, textAlign: "center", fontFamily: F.body, fontWeight: 800, fontSize: 44, color: C.grey, opacity: ease(frame, keep + 6, keep + 16) }}>
        New in the Gemini app
      </div>
    </AbsoluteFill>
  );
};

const S2: React.FC = () => {
  const frame = useCurrentFrame();
  const t = usePop(2, 12);
  const offAt = cue("s2", "off");
  const off = ease(frame, offAt, offAt + 8);
  const gone = cue("s2", "gone");
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: t }}>
        <div style={{ fontFamily: F.head, fontSize: 64, letterSpacing: 4, color: C.ink, background: RED, padding: "6px 30px 0", borderRadius: 14 }}>BEFORE</div>
      </div>
      <div style={{ position: "absolute", top: 400, left: 80, right: 80, transform: `translateY(${(1 - t) * 160}px)`, opacity: t }}>
        <div style={{ background: C.panel, border: `3px solid ${RED}`, borderRadius: 36, padding: "40px 40px 34px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 60, color: C.white, flex: 1 }}>Keep Activity</span>
            <Toggle on={1 - off} size={1.25} />
          </div>
          <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 38, color: C.grey, marginTop: 14 }}>One switch did both:</div>
        </div>
        {/* the two things it controlled, linked by a bracket */}
        <div style={{ display: "flex", gap: 30, marginTop: 40 }}>
          {[
            { label: "History", Icon: ClockCounterClockwise },
            { label: "Training", Icon: Brain },
          ].map(({ label, Icon }, i) => {
            const p = ease(frame, cue("s2", "both") + i * 4, cue("s2", "both") + 10 + i * 4);
            const dead = label === "History" ? ease(frame, gone - 2, gone + 6) : off;
            return (
              <div key={label} style={{ flex: 1, height: 260, background: C.panel2, borderRadius: 30, border: `2px solid ${C.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, opacity: p * (1 - dead * 0.55), transform: `translateY(${(1 - p) * 60}px)` }}>
                <Icon size={96} weight="bold" color={dead > 0.5 ? C.dim : C.yellow} />
                <span style={{ fontFamily: F.head, fontSize: 64, color: dead > 0.5 ? C.dim : C.white, textDecoration: dead > 0.5 ? "line-through" : "none", textDecorationColor: RED }}>{label.toUpperCase()}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ position: "absolute", top: 1110, left: 0, right: 0, textAlign: "center", fontFamily: F.head, fontSize: 80, color: RED, opacity: ease(frame, gone, gone + 8), transform: `scale(${0.9 + ease(frame, gone, gone + 8) * 0.1})` }}>
        HISTORY GONE TOO
      </div>
    </AbsoluteFill>
  );
};

const S3: React.FC = () => {
  const frame = useCurrentFrame();
  const splitAt = cue("s3", "splitting");
  const split = ease(frame, splitAt, splitAt + 14);
  const h = usePop(cue("s3", "history"), 11);
  const tr = usePop(cue("s3", "training"), 11);
  return (
    <AbsoluteFill>
      <Seam split={split} />
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", fontFamily: F.head, fontSize: 96, color: C.white, opacity: ease(frame, 2, 12) }}>
        NOW: <span style={{ color: C.yellow }}>TWO SWITCHES</span>
      </div>
      {[
        { p: h, label: "HISTORY", Icon: ClockCounterClockwise, x: 0 },
        { p: tr, label: "AI TRAINING", Icon: Brain, x: 540 },
      ].map(({ p, label, Icon, x }) => (
        <div key={label} style={{ position: "absolute", top: 520, left: x + 40, width: 460, transform: `scale(${p})`, opacity: Math.min(1, p * 1.5) }}>
          <div style={{ background: C.panel, border: `3px solid ${C.yellow}`, borderRadius: 36, padding: "44px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
            <Icon size={130} weight="bold" color={C.yellow} />
            <span style={{ fontFamily: F.head, fontSize: 66, color: C.white, whiteSpace: "nowrap" }}>{label}</span>
            <Toggle on={1} size={1.2} />
          </div>
        </div>
      ))}
      <div style={{ position: "absolute", top: 1100, left: 0, right: 0, textAlign: "center", fontFamily: F.body, fontWeight: 800, fontSize: 46, color: C.grey, opacity: ease(frame, cue("s3", "training") + 6, cue("s3", "training") + 16) }}>
        Each one works on its own
      </div>
    </AbsoluteFill>
  );
};

const S4: React.FC = () => {
  const frame = useCurrentFrame();
  const steps = [
    { at: cue("s4", "open"), Icon: GearSix, text: "Open Gemini settings" },
    { at: cue("s4", "find"), Icon: ChatsCircle, text: "Find History" },
  ];
  const histAt = cue("s4", "keep");
  const trAt = cue("s4", "switch");
  const trOff = ease(frame, trAt + 6, trAt + 14);
  return (
    <AbsoluteFill>
      <Seam split={1} />
      <div style={{ position: "absolute", top: 250, left: 80, right: 80, display: "flex", flexDirection: "column", gap: 22 }}>
        {steps.map((s, i) => {
          const p = ease(frame, s.at - 4, s.at + 8);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 24, background: "rgba(13,14,17,0.92)", border: `2px solid ${C.line}`, borderRadius: 28, padding: "22px 30px", opacity: p, transform: `translateY(${(1 - p) * -40}px)` }}>
              <div style={{ width: 76, height: 76, borderRadius: 38, background: C.yellow, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.head, fontSize: 48, color: C.ink }}>{i + 1}</div>
              <s.Icon size={60} weight="fill" color={C.white} />
              <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 50, color: C.white }}>{s.text}</span>
            </div>
          );
        })}
      </div>
      {[
        { at: histAt, label: "HISTORY", on: 1, word: "ON", color: C.green, x: 0 },
        { at: histAt + 6, label: "TRAINING", on: 1 - trOff, word: trOff > 0.5 ? "OFF" : "ON", color: trOff > 0.5 ? RED : C.green, x: 540 },
      ].map((b) => {
        const p = usePop(b.at, 11);
        return (
          <div key={b.label} style={{ position: "absolute", top: 650, left: b.x + 50, width: 440, transform: `scale(${p})`, opacity: Math.min(1, p * 1.5), display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
            <span style={{ fontFamily: F.head, fontSize: 70, color: C.white }}>{b.label}</span>
            <Toggle on={b.on} size={1.6} />
            <span style={{ fontFamily: F.head, fontSize: 130, color: b.color, lineHeight: 1 }}>{b.word}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const S5: React.FC = () => {
  const frame = useCurrentFrame();
  const t = usePop(2, 12);
  const now = usePop(cue("s5", "two"), 10);
  const was = usePop(cue("s5", "about") , 10);
  return (
    <AbsoluteFill>
      <Seam split={1} />
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${t}) rotate(-2deg)` }}>
        <div style={{ background: RED, color: C.ink, fontFamily: F.head, fontSize: 88, padding: "10px 40px 0", borderRadius: 18 }}>ONE CATCH</div>
      </div>
      <div style={{ position: "absolute", top: 410, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: ease(frame, 8, 18) }}>
        <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 46, color: C.white, background: C.bg, border: `2px solid ${C.line}`, borderRadius: 999, padding: "10px 32px" }}>
          With history OFF, chats are still kept:
        </div>
      </div>
      <SideTag text="BEFORE" color={RED} side="l" top={560} />
      <SideTag text="NOW" color={C.yellow} side="r" top={560} />
      <div style={{ position: "absolute", top: 700, left: 0, width: 540, display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${was})`, opacity: Math.min(1, was * 1.5) }}>
        <span style={{ fontFamily: F.head, fontSize: 230, color: C.white, lineHeight: 1 }}>72</span>
        <span style={{ fontFamily: F.head, fontSize: 80, color: C.grey }}>HOURS</span>
      </div>
      <div style={{ position: "absolute", top: 700, left: 540, width: 540, display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${now})`, opacity: Math.min(1, now * 1.5) }}>
        <span style={{ fontFamily: F.head, fontSize: 230, color: C.yellow, lineHeight: 1 }}>~2</span>
        <span style={{ fontFamily: F.head, fontSize: 80, color: C.yellow }}>MONTHS</span>
      </div>
      <div style={{ position: "absolute", top: 1110, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: ease(frame, cue("s5", "used") + 8, cue("s5", "used") + 18) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: F.body, fontWeight: 800, fontSize: 42, color: C.white, background: C.panel, borderRadius: 999, padding: "12px 30px" }}>
          <ClockCountdown size={48} weight="fill" color={C.yellow} /> “about two months”, says Google
        </div>
      </div>
    </AbsoluteFill>
  );
};

const S6: React.FC = () => {
  const frame = useCurrentFrame();
  const r = usePop(2, 12);
  const shareAt = cue("s6", "share");
  const t = usePop(shareAt - 2, 11);
  const tapAt = shareAt + 10;
  const press = 1 - 0.08 * Math.sin(Math.PI * ease(frame, tapAt, tapAt + 8));
  const ring = ease(frame, tapAt + 2, tapAt + 24);
  const hint = ease(frame, tapAt + 6, tapAt + 18);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${r})` }}>
        <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 46, color: C.white, background: C.panel, border: `2px solid ${C.line}`, borderRadius: 999, padding: "14px 34px" }}>
          Rolling out over the coming weeks
        </div>
      </div>
      <div style={{ position: "absolute", top: 420, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${t})` }}>
        <div style={{ position: "relative", width: 300, height: 300 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `8px solid ${C.yellow}`, opacity: (1 - ring) * 0.8, transform: `scale(${1 + ring * 0.45})` }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: C.yellow, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${press})` }}>
            <PaperPlaneTilt size={160} weight="fill" color={C.ink} />
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 800, left: 0, right: 0, textAlign: "center", fontFamily: F.head, fontSize: 104, color: C.white, lineHeight: 1.05, opacity: t }}>
        SEND THIS TO A<br />
        <span style={{ color: C.yellow }}>GEMINI USER</span>
      </div>
      <div style={{ position: "absolute", top: 1070, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: hint, transform: `translateY(${(1 - hint) * 24}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, background: C.white, borderRadius: 60, padding: "16px 38px" }}>
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 48, color: C.ink }}>Tap</span>
          <div style={{ width: 66, height: 66, borderRadius: 33, background: C.yellow, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PaperPlaneTilt size={40} weight="fill" color={C.ink} />
          </div>
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 48, color: C.ink }}>and pick a friend</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- captions: a two-tone split bar, four words, the spoken word sits in the yellow half ---------- */

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (frame >= END_FROM - 4) return null;
  let idx = -1;
  for (let i = 0; i < WORDS.length; i++) if (WORDS[i].start - 0.04 <= t) idx = i;
  if (idx < 0) return null;
  const group = Math.floor(idx / 4);
  const words = WORDS.slice(group * 4, group * 4 + 4);
  const last = words[words.length - 1];
  if (t > last.end + 0.6) return null;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 1370, display: "flex", justifyContent: "center" }}>
      <div style={{ display: "flex", borderRadius: 16, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
        {words.map((w, i) => {
          const cur = group * 4 + i === idx;
          const said = group * 4 + i <= idx;
          return (
            <span key={i} style={{ fontFamily: F.body, fontWeight: 900, fontSize: 56, padding: "10px 18px", whiteSpace: "nowrap", background: cur ? C.yellow : "rgba(13,14,17,0.92)", color: cur ? C.ink : said ? C.white : "rgba(255,255,255,0.45)" }}>
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
  { at: cueAbs("s1", "training") + 4, src: "click", volume: 0.4 },
  { at: cueAbs("s1", "keep"), src: "pop", volume: 0.3 },
  ...SPANS.slice(1).map((s) => ({ at: s.from - 2, src: "whoosh", volume: 0.25 })),
  { at: cueAbs("s2", "off"), src: "click", volume: 0.4 },
  { at: cueAbs("s2", "gone"), src: "impact", volume: 0.3 },
  { at: cueAbs("s3", "splitting"), src: "whoosh", volume: 0.35 },
  { at: cueAbs("s3", "history"), src: "pop", volume: 0.3 },
  { at: cueAbs("s3", "training"), src: "pop", volume: 0.3 },
  { at: cueAbs("s4", "open"), src: "click", volume: 0.25 },
  { at: cueAbs("s4", "find"), src: "click", volume: 0.25 },
  { at: cueAbs("s4", "keep"), src: "ding", volume: 0.3 },
  { at: cueAbs("s4", "switch") + 6, src: "click", volume: 0.4 },
  { at: cueAbs("s5", "used"), src: "pop", volume: 0.3 },
  { at: cueAbs("s5", "two"), src: "impact", volume: 0.35 },
  { at: cueAbs("s6", "share") + 10, src: "pop", volume: 0.35 },
  { at: END_FROM + 4, src: "impact", volume: 0.35 },
];

/* ---------- composition ---------- */

const SCENES: Record<string, React.FC> = { s1: S1, s2: S2, s3: S3, s4: S4, s5: S5, s6: S6 };

export const GeminiPrivacy: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
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
      <EndCard title="SHARE THIS" icon={<PaperPlaneTilt size={88} weight="fill" color={C.yellow} />} />
    </Sequence>
    <Captions />
    <Sequence from={timing.lead_in} layout="none">
      <Audio src={staticFile("vo/gemini/vo.mp3")} />
    </Sequence>
    {SOUND.map((s, i) => (
      <Sfx key={i} {...s} />
    ))}
  </AbsoluteFill>
);

/* ---------- cover (grid keeps y 240-1680) ---------- */

export const GeminiPrivacyCover: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Seam split={1} />
    <SideTag text="HISTORY" color={C.yellow} side="l" top={470} />
    <SideTag text="TRAINING" color={RED} side="r" top={470} />
    <div style={{ position: "absolute", top: 620, left: 0, width: 540, display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      <Toggle on={1} size={1.7} />
      <span style={{ fontFamily: F.head, fontSize: 150, color: C.green, lineHeight: 1 }}>ON</span>
    </div>
    <div style={{ position: "absolute", top: 620, left: 540, width: 540, display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      <Toggle on={0} size={1.7} />
      <span style={{ fontFamily: F.head, fontSize: 150, color: RED, lineHeight: 1 }}>OFF</span>
    </div>
    <div style={{ position: "absolute", top: 1150, left: 50, right: 50, textAlign: "center" }}>
      <div style={{ display: "inline-block", background: C.yellow, padding: "16px 40px 4px", borderRadius: 22, fontFamily: F.head, fontSize: 124, lineHeight: 1.04, color: C.ink, transform: "rotate(-2deg)", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
        GEMINI'S NEW
        <br />
        PRIVACY SWITCH
      </div>
    </div>
  </AbsoluteFill>
);
