import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { ArrowDown, ArrowUp, ChatCircleDots, Crown } from "@phosphor-icons/react";
import timing from "../claudeindia-timing.json";
import { C, F } from "../../themes/aitools";
import { clamp, EndCard, ease, makeTimeline, Sfx, Timing, usePop } from "../common";

// Reel: Claude's India growth. Facts: Inc42, 17 Nov 2026, "Claude Outpaces ChatGPT, Gemini In India Adoption", using
// Sensor Tower app data (Google Play + App Store only). Sept quarter: Claude downloads up 15x YoY; ChatGPT downloads
// down 21%; Gemini down 29%. Claude rose to No. 3 by consumer in-app spending (from No. 5), overtaking Instagram and
// YouTube; Google One No. 1, ChatGPT No. 2. ChatGPT still India's GenAI leader; India is its largest market by WAU.
// Style: big kinetic numbers + bar charts. Captions: one word at a time on a flip card. App names as text only.
const T = makeTimeline(timing as Timing);
export const CLAUDEINDIA_TOTAL = timing.total;
const { cue, cueAbs, END_FROM, SPANS, WORDS, FPS } = T;

const SAFFRON = "#FF9933";
const GREEN_IN = "#2BB673";

/* ---------- pieces ---------- */

const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* faint chart grid that slowly scrolls */}
      <AbsoluteFill style={{ backgroundImage: `linear-gradient(${C.line} 2px, transparent 2px)`, backgroundSize: "100% 120px", backgroundPosition: `0 ${frame % 120}px`, opacity: 0.7 }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(255,212,0,0.08), transparent 60%)" }} />
    </AbsoluteFill>
  );
};

const Slam: React.FC<{ at: number; children: React.ReactNode; size: number; color?: string; top: number }> = ({ at, children, size, color = C.white, top }) => {
  const frame = useCurrentFrame();
  const p = usePop(at, 9);
  if (frame < at) return null;
  return (
    <div style={{ position: "absolute", top, left: 40, right: 40, textAlign: "center", fontFamily: F.head, fontSize: size, lineHeight: 1, color, transform: `scale(${2.2 - 1.2 * p})`, opacity: Math.min(1, p * 2) }}>
      {children}
    </div>
  );
};

const Layer: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const enter = ease(frame, 0, 8);
  const exit = ease(frame, dur - 6, dur + 6);
  return <AbsoluteFill style={{ opacity: enter * (1 - exit), transform: `translateX(${exit * -200}px)` }}>{children}</AbsoluteFill>;
};

/* ---------- scenes ---------- */

const S1: React.FC = () => {
  const frame = useCurrentFrame();
  const india = cue("s1", "india");
  const u = ease(frame, india, india + 10);
  return (
    <AbsoluteFill>
      <Slam at={2} size={190} color={C.yellow} top={300}>CLAUDE</Slam>
      <Slam at={cue("s1", "growing")} size={110} top={510}>IS GROWING FASTER</Slam>
      <Slam at={cue("s1", "than")} size={80} color={C.grey} top={650}>THAN CHATGPT &amp; GEMINI</Slam>
      <div style={{ position: "absolute", top: 820, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: u, transform: `scale(${0.8 + 0.2 * u})` }}>
        <div style={{ fontFamily: F.head, fontSize: 150, color: C.white, padding: "10px 50px 0", borderTop: `14px solid ${SAFFRON}`, borderBottom: `14px solid ${GREEN_IN}`, background: "rgba(255,255,255,0.04)" }}>IN INDIA</div>
      </div>
      <div style={{ position: "absolute", top: 1110, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 26, height: 160 }}>
        {[0.25, 0.4, 0.55, 0.8, 1].map((h, i) => {
          const g = ease(frame, india + i * 3, india + 12 + i * 3);
          return <div key={i} style={{ width: 70, height: 160 * h * g, background: i === 4 ? C.yellow : C.panel2, borderRadius: "10px 10px 0 0" }} />;
        })}
      </div>
    </AbsoluteFill>
  );
};

const S2: React.FC = () => {
  const frame = useCurrentFrame();
  const at = cue("s2", "15x");
  const n = Math.round(interpolate(frame, [at - 6, at + 14], [1, 15], clamp));
  const p = usePop(at - 6, 10);
  const bars = ease(frame, cue("s2", "september"), cue("s2", "september") + 18);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", fontFamily: F.body, fontWeight: 800, fontSize: 46, color: C.grey, opacity: ease(frame, 4, 14) }}>Claude downloads in India</div>
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center", transform: `scale(${p})` }}>
        <span style={{ fontFamily: F.head, fontSize: 380, color: C.yellow, lineHeight: 1 }}>{n}</span>
        <span style={{ fontFamily: F.head, fontSize: 220, color: C.white }}>x</span>
      </div>
      <div style={{ position: "absolute", top: 740, left: 140, right: 140, height: 420, display: "flex", alignItems: "flex-end", justifyContent: "space-around", borderBottom: `4px solid ${C.grey}` }}>
        {[
          { label: "Sept qtr 2025", h: 1 / 15, color: C.panel2 },
          { label: "Sept qtr 2026", h: 1, color: C.yellow },
        ].map((b) => (
          <div key={b.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 260 }}>
            <div style={{ width: 200, height: Math.max(6, 400 * b.h * bars), background: b.color, borderRadius: "14px 14px 0 0" }} />
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", top: 1180, left: 140, right: 140, display: "flex", justifyContent: "space-around", opacity: bars }}>
        {["Sept qtr 2025", "Sept qtr 2026"].map((l) => (
          <span key={l} style={{ width: 260, textAlign: "center", fontFamily: F.body, fontWeight: 800, fontSize: 36, color: C.grey }}>{l}</span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const S3: React.FC = () => {
  const frame = useCurrentFrame();
  const rows = [
    { name: "Claude", value: "+15x", dir: 1, at: 4, w: 1, color: C.green },
    { name: "ChatGPT", value: "−21%", dir: -1, at: cue("s3", "chatgpt"), w: 0.21 / 0.29 * 0.8, color: C.red },
    { name: "Gemini", value: "−29%", dir: -1, at: cue("s3", "gemini"), w: 0.8, color: C.red },
  ];
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 260, left: 0, right: 0, textAlign: "center", fontFamily: F.head, fontSize: 92, color: C.white, opacity: ease(frame, 2, 12) }}>
        DOWNLOADS, <span style={{ color: C.yellow }}>SAME PERIOD</span>
      </div>
      <div style={{ position: "absolute", top: 470, left: 70, right: 70, display: "flex", flexDirection: "column", gap: 70 }}>
        {rows.map((r) => {
          const g = ease(frame, r.at, r.at + 16);
          const Icon = r.dir > 0 ? ArrowUp : ArrowDown;
          return (
            <div key={r.name} style={{ opacity: Math.min(1, g * 2) }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 58, color: C.white }}>{r.name}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: F.head, fontSize: 92, color: r.color, lineHeight: 1 }}>
                  <Icon size={70} weight="bold" color={r.color} /> {r.value}
                </span>
              </div>
              <div style={{ height: 64, background: C.panel, borderRadius: 14, overflow: "hidden", display: "flex", justifyContent: r.dir > 0 ? "flex-start" : "flex-end" }}>
                <div style={{ width: `${r.w * g * 100}%`, height: "100%", background: r.color, opacity: 0.9 }} />
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const S4: React.FC = () => {
  const frame = useCurrentFrame();
  const climbAt = cue("s4", "no3");
  const climb = ease(frame, climbAt - 6, climbAt + 14);
  const ahead = cue("s4", "ahead");
  const a = ease(frame, ahead, ahead + 10);
  // Claude climbs from slot 5 to slot 3.
  const slotH = 150;
  const top = 470;
  const rows = [
    { name: "Google One", slot: 0 },
    { name: "ChatGPT", slot: 1 },
  ];
  const claudeSlot = interpolate(climb, [0, 1], [4, 2]);
  const others = [
    { name: "Instagram", slot: interpolate(climb, [0, 1], [2, 3]) },
    { name: "YouTube", slot: interpolate(climb, [0, 1], [3, 4]) },
  ];
  const Row: React.FC<{ name: string; slot: number; hi?: boolean; rank: string; dim?: boolean }> = ({ name, slot, hi, rank, dim }) => (
    <div style={{ position: "absolute", top: top + slot * slotH, left: 80, right: 80, height: 124, display: "flex", alignItems: "center", gap: 26, background: hi ? C.yellow : C.panel, border: `2px solid ${hi ? C.yellow : C.line}`, borderRadius: 26, padding: "0 34px", opacity: dim ? 0.55 : 1 }}>
      <span style={{ fontFamily: F.head, fontSize: 76, color: hi ? C.ink : C.grey, width: 90 }}>{rank}</span>
      <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 56, color: hi ? C.ink : C.white, flex: 1 }}>{name}</span>
      {hi ? <ArrowUp size={70} weight="bold" color={C.ink} /> : null}
    </div>
  );
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", fontFamily: F.head, fontSize: 84, color: C.white, opacity: ease(frame, 2, 12) }}>
        TOP APPS BY <span style={{ color: C.yellow }}>IN-APP SPENDING</span>
      </div>
      <div style={{ position: "absolute", top: 360, left: 0, right: 0, textAlign: "center", fontFamily: F.body, fontWeight: 800, fontSize: 40, color: C.grey, opacity: ease(frame, 6, 16) }}>India · Sept quarter</div>
      {rows.map((r, i) => (
        <Row key={r.name} name={r.name} slot={r.slot} rank={`#${i + 1}`} />
      ))}
      {others.map((r) => (
        <Row key={r.name} name={r.name} slot={r.slot} rank="" dim={a > 0.5} />
      ))}
      <Row name="Claude" slot={claudeSlot} hi rank={climb > 0.5 ? "#3" : "#5"} />
      <div style={{ position: "absolute", top: 1240, left: 0, right: 0, textAlign: "center", fontFamily: F.body, fontWeight: 800, fontSize: 44, color: C.white, opacity: a }}>
        Ahead of <span style={{ color: C.yellow }}>Instagram</span> and <span style={{ color: C.yellow }}>YouTube</span>
      </div>
    </AbsoluteFill>
  );
};

const S5: React.FC = () => {
  const frame = useCurrentFrame();
  const b = usePop(2, 9);
  const crown = usePop(cue("s5", "biggest"), 10);
  const mkt = cue("s5", "largest");
  const m = ease(frame, mkt, mkt + 10);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", fontFamily: F.head, fontSize: 200, color: C.red, transform: `scale(${2 - b})`, opacity: Math.min(1, b * 2) }}>BUT</div>
      <div style={{ position: "absolute", top: 520, left: 80, right: 80, display: "flex", alignItems: "center", gap: 30, background: C.panel, border: `3px solid ${C.yellow}`, borderRadius: 34, padding: "34px 40px", transform: `scale(${crown})`, opacity: Math.min(1, crown * 1.5) }}>
        <Crown size={130} weight="fill" color={C.yellow} />
        <div>
          <div style={{ fontFamily: F.head, fontSize: 96, color: C.white, lineHeight: 1 }}>CHATGPT</div>
          <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 44, color: C.grey, marginTop: 6 }}>is still India's biggest AI app</div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 880, left: 80, right: 80, opacity: m, transform: `translateY(${(1 - m) * 40}px)` }}>
        <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 46, color: C.white, textAlign: "center", lineHeight: 1.3 }}>
          India is ChatGPT's
          <br />
          <span style={{ fontFamily: F.head, fontSize: 110, color: C.yellow }}>#1 MARKET</span>
          <br />
          by weekly users
        </div>
      </div>
    </AbsoluteFill>
  );
};

const S6: React.FC = () => {
  const frame = useCurrentFrame();
  const q = cue("s6", "which");
  const opts = ["Claude", "ChatGPT", "Gemini"];
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: ease(frame, 2, 12) }}>
        <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 40, color: C.grey, border: `2px solid ${C.line}`, borderRadius: 999, padding: "10px 30px" }}>Data: Sensor Tower, via Inc42</div>
      </div>
      <Slam at={q} size={120} top={400}>WHICH ONE</Slam>
      <Slam at={q + 6} size={120} color={C.yellow} top={530}>DO YOU USE?</Slam>
      <div style={{ position: "absolute", top: 720, left: 120, right: 120, display: "flex", flexDirection: "column", gap: 26 }}>
        {opts.map((o, i) => {
          const p = usePop(q + 12 + i * 5, 11);
          return (
            <div key={o} style={{ display: "flex", alignItems: "center", gap: 24, background: C.panel, border: `2px solid ${C.line}`, borderRadius: 28, padding: "22px 34px", transform: `scale(${p})`, opacity: Math.min(1, p * 1.5) }}>
              <div style={{ width: 56, height: 56, borderRadius: 28, border: `5px solid ${C.yellow}` }} />
              <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 58, color: C.white }}>{o}</span>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 1200, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 14, fontFamily: F.body, fontWeight: 800, fontSize: 46, color: C.white, opacity: ease(frame, cue("s6", "comments") - 4, cue("s6", "comments") + 6) }}>
        <ChatCircleDots size={56} weight="fill" color={C.yellow} /> Tell me in the comments
      </div>
    </AbsoluteFill>
  );
};

/* ---------- captions: one word at a time on a flip card ---------- */

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (frame >= END_FROM - 4) return null;
  let idx = -1;
  for (let i = 0; i < WORDS.length; i++) if (WORDS[i].start - 0.04 <= t) idx = i;
  if (idx < 0) return null;
  const w = WORDS[idx];
  if (t > w.end + 0.5) return null;
  const f0 = Math.round(w.start * FPS);
  const flip = ease(frame, f0 - 2, f0 + 4);
  const text = w.text.replace(/[,.:?!]$/, "");
  const isNum = /\d/.test(text);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1350, display: "flex", justifyContent: "center", perspective: 800 }}>
      <div style={{ background: isNum ? C.yellow : C.white, color: C.ink, fontFamily: F.head, fontSize: 92, lineHeight: 1, padding: "16px 40px 6px", borderRadius: 14, transform: `rotateX(${(1 - flip) * 90}deg)`, transformOrigin: "top", boxShadow: "0 12px 30px rgba(0,0,0,0.5)", whiteSpace: "nowrap", textTransform: "uppercase" }}>
        {text}
      </div>
    </div>
  );
};

/* ---------- sound ---------- */

const SOUND: { at: number; src: string; volume?: number }[] = [
  { at: 2, src: "impact", volume: 0.4 },
  { at: cueAbs("s1", "growing"), src: "whoosh", volume: 0.3 },
  { at: cueAbs("s1", "india"), src: "impact", volume: 0.35 },
  ...SPANS.slice(1).map((s) => ({ at: s.from - 2, src: "whoosh", volume: 0.22 })),
  ...Array.from({ length: 7 }).map((_, i) => ({ at: cueAbs("s2", "15x") - 6 + i * 3, src: "click", volume: 0.18 })),
  { at: cueAbs("s2", "15x") + 14, src: "ding", volume: 0.35 },
  { at: cueAbs("s3", "chatgpt"), src: "pop", volume: 0.3 },
  { at: cueAbs("s3", "gemini"), src: "pop", volume: 0.3 },
  { at: cueAbs("s4", "no3"), src: "whoosh", volume: 0.35 },
  { at: cueAbs("s4", "no3") + 14, src: "ding", volume: 0.35 },
  { at: cueAbs("s5", "but"), src: "impact", volume: 0.35 },
  { at: cueAbs("s6", "which"), src: "impact", volume: 0.35 },
  { at: END_FROM + 4, src: "impact", volume: 0.35 },
];

/* ---------- composition ---------- */

const SCENES: Record<string, React.FC> = { s1: S1, s2: S2, s3: S3, s4: S4, s5: S5, s6: S6 };

export const ClaudeIndia: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Backdrop />
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
      <EndCard />
    </Sequence>
    <Captions />
    <Sequence from={timing.lead_in} layout="none">
      <Audio src={staticFile("vo/claudeindia/vo.mp3")} />
    </Sequence>
    {SOUND.map((s, i) => (
      <Sfx key={i} {...s} />
    ))}
  </AbsoluteFill>
);

/* ---------- cover (grid keeps y 240-1680) ---------- */

export const ClaudeIndiaCover: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Backdrop />
    <div style={{ position: "absolute", top: 380, left: 0, right: 0, textAlign: "center", fontFamily: F.body, fontWeight: 800, fontSize: 48, color: C.grey }}>Claude downloads in India, vs last year</div>
    <div style={{ position: "absolute", top: 450, left: 0, right: 0, textAlign: "center" }}>
      <span style={{ fontFamily: F.head, fontSize: 460, color: C.yellow, lineHeight: 1 }}>15</span>
      <span style={{ fontFamily: F.head, fontSize: 260, color: C.white }}>x</span>
    </div>
    <div style={{ position: "absolute", top: 990, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 30 }}>
      {[
        { n: "ChatGPT", v: "−21%" },
        { n: "Gemini", v: "−29%" },
      ].map((r) => (
        <div key={r.n} style={{ background: C.panel, border: `2px solid ${C.line}`, borderRadius: 24, padding: "14px 30px", textAlign: "center" }}>
          <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 40, color: C.grey }}>{r.n}</div>
          <div style={{ fontFamily: F.head, fontSize: 90, color: C.red, lineHeight: 1 }}>{r.v}</div>
        </div>
      ))}
    </div>
    <div style={{ position: "absolute", top: 1260, left: 60, right: 60, textAlign: "center" }}>
      <div style={{ display: "inline-block", fontFamily: F.head, fontSize: 112, color: C.white, padding: "10px 40px 0", borderTop: `14px solid ${SAFFRON}`, borderBottom: `14px solid ${GREEN_IN}` }}>CLAUDE IS BOOMING IN INDIA</div>
    </div>
  </AbsoluteFill>
);
