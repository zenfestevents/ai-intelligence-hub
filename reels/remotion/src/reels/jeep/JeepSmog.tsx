import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { ChatCircleDots, Cpu, GithubLogo, Laptop, Link, LockSimple, Receipt, Wrench } from "@phosphor-icons/react";
import timing from "../jeep-timing.json";
import { C, F } from "../../themes/aitools";
import { clamp, EndCard, ease, makeTimeline, Sfx, Timing, usePop } from "../common";

// Reel: a 1994 Jeep Cherokee passes California smog with Claude + Codex. Facts: Tom's Hardware, 13 Nov 2026
// (Muhammad Zulali; failed for too much NOx, first at 25 mph, then at 25 and 50 mph after his own adjustments;
// tests cost nearly $100 each; a $3 Arduino Nano, about $15 of parts; Claude found the Chrysler SCI bus and
// logged engine data on test drives; the ECU couldn't be reflashed, so Codex put custom code in a nearby EEPROM;
// passed; no mechanic or dealer tool; "Claude did most of the diagnostic work and Codex did pretty much all of the
// memory work"). Project: github.com/MZULALI/xj-scanner, GPLv3. 18 Nov 2026.
// Style: newspaper front page; headlines print in line by line; typewriter captions on a paper strip.
const T = makeTimeline(timing as Timing);
export const JEEP_TOTAL = timing.total;
const { cue, cueAbs, END_FROM, SPANS, WORDS, FPS } = T;

const PAPER = "#EFE9DA";
const INK = "#1A1A1A";
const SERIF = "Georgia, 'Times New Roman', serif";

/* ---------- building blocks ---------- */

const Backdrop: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 8px)" }} />
  </AbsoluteFill>
);

// A sheet of newsprint.
const Sheet: React.FC<{ top: number; height: number; rot?: number; children: React.ReactNode; left?: number; right?: number }> = ({ top, height, rot = 0, children, left = 70, right = 70 }) => (
  <div style={{ position: "absolute", top, left, right, height, background: PAPER, borderRadius: 6, transform: `rotate(${rot}deg)`, boxShadow: "0 30px 70px rgba(0,0,0,0.6)", padding: "34px 44px", overflow: "hidden" }}>
    <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)", backgroundSize: "6px 6px" }} />
    <div style={{ position: "relative" }}>{children}</div>
  </div>
);

const Masthead: React.FC = () => (
  <div style={{ borderBottom: `4px double ${INK}`, paddingBottom: 10, marginBottom: 20, textAlign: "center" }}>
    <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 66, color: INK, letterSpacing: 2 }}>AI in Plain English</div>
    <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 24, color: "#555", letterSpacing: 4 }}>THE GARAGE PAGE</div>
  </div>
);

// A headline that prints in: a roller sweeps across, revealing the ink.
const PrintLine: React.FC<{ at: number; children: React.ReactNode; size?: number; color?: string; font?: string }> = ({ at, children, size = 96, color = INK, font = F.head }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at - 2, at + 12);
  return (
    <div style={{ position: "relative", fontFamily: font, fontSize: size, lineHeight: 1.02, color, clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }}>
      {children}
      {p > 0 && p < 1 && <div style={{ position: "absolute", top: 0, bottom: 0, left: `${p * 100}%`, width: 14, background: "rgba(0,0,0,0.25)" }} />}
    </div>
  );
};

const Stamp: React.FC<{ at: number; text: string; color: string; rot?: number; size?: number }> = ({ at, text, color, rot = -10, size = 120 }) => {
  const frame = useCurrentFrame();
  if (frame < at - 6) return null;
  const drop = ease(frame, at - 6, at);
  const settle = interpolate(frame, [at, at + 4, at + 10], [1.12, 0.97, 1], clamp);
  return (
    <div style={{ transform: `rotate(${rot}deg) scale(${(2.2 - 1.2 * drop) * (frame >= at ? settle : 1)})`, opacity: drop * 0.92, border: `10px solid ${color}`, borderRadius: 16, padding: "4px 28px 0", fontFamily: F.head, fontSize: size, lineHeight: 1.1, color, letterSpacing: 5 }}>
      {text}
    </div>
  );
};

const Layer: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const enter = ease(frame, 0, 12);
  const exit = ease(frame, dur - 6, dur + 8);
  return <AbsoluteFill style={{ opacity: 1 - exit, transform: `translateY(${(1 - enter) * 300}px) rotate(${(1 - enter) * 4 - exit * 8}deg) translateX(${exit * -900}px)` }}>{children}</AbsoluteFill>;
};

/* ---------- scenes ---------- */

const S1: React.FC = () => (
  <AbsoluteFill>
    <Sheet top={270} height={860} rot={-1.5}>
      <Masthead />
      <PrintLine at={cue("s1", "32")}>32-YEAR-OLD JEEP</PrintLine>
      <PrintLine at={cue("s1", "failing")} color="#B3261E">
        KEEPS FAILING
      </PrintLine>
      <PrintLine at={cue("s1", "smog")}>ITS SMOG TEST</PrintLine>
      <div style={{ height: 3, background: INK, margin: "24px 0" }} />
      <PrintLine at={cue("s1", "claude")} size={58} font={SERIF}>
        <i>Owner turns to Claude for help</i>
      </PrintLine>
      <div style={{ display: "flex", gap: 20, marginTop: 26 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ flex: 1 }}>
            {[0, 1, 2, 3].map((j) => (
              <div key={j} style={{ height: 12, background: "rgba(0,0,0,0.18)", marginBottom: 12, width: `${80 + ((i + j) % 3) * 8}%` }} />
            ))}
          </div>
        ))}
      </div>
    </Sheet>
  </AbsoluteFill>
);

const S2: React.FC = () => {
  const frame = useCurrentFrame();
  const costAt = cue("s2", "100");
  const worseAt = cue("s2", "worse");
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 280, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ background: PAPER, borderRadius: 6, padding: "26px 50px", transform: `rotate(2deg) scale(${usePop(costAt - 4, 11)})`, boxShadow: "0 20px 50px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", gap: 26 }}>
          <Receipt size={110} weight="fill" color={INK} />
          <div>
            <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 34, color: "#555", letterSpacing: 3 }}>EACH SMOG TEST</div>
            <div style={{ fontFamily: F.head, fontSize: 130, color: INK, lineHeight: 1 }}>~$100</div>
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 640, left: 110, right: 110, display: "flex", flexDirection: "column", gap: 26 }}>
        {[
          { at: costAt + 6, label: "TEST 1", fails: "25 mph" },
          { at: worseAt - 6, label: "AFTER HIS FIXES", fails: "25 + 50 mph" },
        ].map((r) => {
          const t = ease(frame, r.at - 4, r.at + 8);
          return (
            <div key={r.label} style={{ background: C.panel, border: `2px solid ${C.line}`, borderRadius: 22, padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: t, transform: `translateX(${(1 - t) * -200}px)` }}>
              <div>
                <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 34, color: C.grey }}>{r.label}</div>
                <div style={{ fontFamily: F.head, fontSize: 64, color: C.white }}>failed at {r.fails}</div>
              </div>
              <Stamp at={r.at + 4} text="FAIL" color={C.red} size={76} rot={-8} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 1100, left: 0, right: 0, textAlign: "center", fontFamily: F.head, fontSize: 84, color: C.red, opacity: ease(frame, worseAt - 2, worseAt + 8) }}>
        IT GOT WORSE
      </div>
    </AbsoluteFill>
  );
};

const Box: React.FC<{ at: number; icon: React.ElementType; title: string; sub: string; hot?: boolean }> = ({ at, icon: Icon, title, sub, hot }) => {
  const t = usePop(at, 11);
  return (
    <div style={{ width: 280, padding: "26px 10px", borderRadius: 24, background: hot ? C.yellow : C.panel, border: `2px solid ${C.line}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, transform: `scale(${t})` }}>
      <Icon size={96} weight="fill" color={hot ? C.ink : C.yellow} />
      <div style={{ fontFamily: F.head, fontSize: 54, color: hot ? C.ink : C.white, textAlign: "center", lineHeight: 1 }}>{title}</div>
      <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 28, color: hot ? C.ink : C.grey, textAlign: "center" }}>{sub}</div>
    </div>
  );
};

const READOUT = ["COOLANT TEMP", "OXYGEN SENSOR", "FUEL TRIM", "FAULT CODES"];

const S3: React.FC = () => {
  const frame = useCurrentFrame();
  const boardAt = cue("s3", "arduino");
  const ecuAt = cue("s3", "computer");
  const talkAt = cue("s3", "talk");
  const dataAt = cue("s3", "data");
  const wire = ease(frame, ecuAt, ecuAt + 14);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 270, left: 0, right: 0, textAlign: "center", fontFamily: F.head, fontSize: 84, color: C.white }}>
        A <span style={{ color: C.yellow }}>$3</span> BOARD + CLAUDE
      </div>
      <div style={{ position: "absolute", top: 430, left: 40, right: 40, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box at={talkAt - 4} icon={Laptop} title="LAPTOP" sub="Claude" />
        <Box at={boardAt - 4} icon={Cpu} title="$3 BOARD" sub="Arduino" hot />
        <Box at={ecuAt - 4} icon={Wrench} title="ENGINE" sub="computer" />
      </div>
      {/* wires */}
      <div style={{ position: "absolute", top: 600, left: 320, width: 120 * wire, height: 8, background: C.yellow, borderRadius: 4 }} />
      <div style={{ position: "absolute", top: 600, left: 640, width: 120 * wire, height: 8, background: C.yellow, borderRadius: 4 }} />
      <div style={{ position: "absolute", top: 820, left: 120, right: 120, background: "#07130B", border: `2px solid #1F5F33`, borderRadius: 18, padding: "20px 28px", fontFamily: F.mono, fontSize: 38, color: "#58F08A", opacity: ease(frame, dataAt - 10, dataAt) }}>
        <div style={{ color: "#9BE3B0", marginBottom: 8 }}>&gt; reading engine data… test drive</div>
        {READOUT.map((r, i) => {
          const on = frame >= dataAt + i * 5;
          return (
            <div key={r} style={{ opacity: on ? 1 : 0.15 }}>
              {r.padEnd(14, ".")} {on ? "OK" : ""}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const S4: React.FC = () => {
  const frame = useCurrentFrame();
  const oldAt = cue("s4", "reprogram");
  const codexAt = cue("s4", "codex");
  const chipAt = cue("s4", "chip");
  const glow = ease(frame, chipAt - 4, chipAt + 10);
  return (
    <AbsoluteFill>
      <Sheet top={290} height={250} rot={1}>
        <PrintLine at={oldAt - 6} size={78}>
          TOO OLD TO
        </PrintLine>
        <PrintLine at={oldAt} size={78} color="#B3261E">
          REPROGRAM
        </PrintLine>
      </Sheet>
      <div style={{ position: "absolute", top: 680, left: 110, right: 110, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ width: 380, height: 300, borderRadius: 24, background: C.panel2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, opacity: ease(frame, oldAt - 4, oldAt + 6) }}>
          <LockSimple size={110} weight="fill" color={C.red} />
          <span style={{ fontFamily: F.head, fontSize: 46, lineHeight: 1.05, textAlign: "center", color: C.grey }}>ENGINE<br />COMPUTER</span>
        </div>
        <div style={{ width: 380, height: 300, borderRadius: 24, background: glow > 0.5 ? C.yellow : C.panel, border: `3px solid ${C.yellow}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: `0 0 ${glow * 60}px rgba(255,212,0,0.5)`, opacity: ease(frame, codexAt - 4, codexAt + 6) }}>
          <Cpu size={110} weight="fill" color={glow > 0.5 ? C.ink : C.yellow} />
          <span style={{ fontFamily: F.head, fontSize: 46, lineHeight: 1.05, textAlign: "center", color: glow > 0.5 ? C.ink : C.white }}>MEMORY CHIP<br />NEXT TO IT</span>
        </div>
      </div>
      <div style={{ position: "absolute", top: 1050, left: 0, right: 0, textAlign: "center", fontFamily: F.head, fontSize: 76, color: C.white, opacity: ease(frame, codexAt - 2, codexAt + 8) }}>
        <span style={{ color: C.yellow }}>CODEX</span> WROTE THE CODE
      </div>
    </AbsoluteFill>
  );
};

const S5: React.FC = () => {
  const frame = useCurrentFrame();
  const passAt = cue("s5", "passed");
  const mechAt = cue("s5", "mechanic");
  const freeAt = cue("s5", "free");
  return (
    <AbsoluteFill>
      <Sheet top={270} height={760} rot={-1}>
        <Masthead />
        <PrintLine at={passAt - 6} size={150}>
          THE JEEP
        </PrintLine>
        <PrintLine at={passAt} size={150} color="#1E7A3E">
          PASSED
        </PrintLine>
        <div style={{ height: 3, background: INK, margin: "20px 0" }} />
        <PrintLine at={mechAt} size={56} font={SERIF}>
          <i>No mechanic needed</i>
        </PrintLine>
      </Sheet>
      <div style={{ position: "absolute", top: 560, right: 110 }}>
        <Stamp at={passAt + 4} text="PASS" color="#1E9E55" size={110} rot={12} />
      </div>
      <div style={{ position: "absolute", top: 1080, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: ease(frame, freeAt - 4, freeAt + 6) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, background: C.panel, border: `2px solid ${C.line}`, borderRadius: 999, padding: "16px 36px" }}>
          <GithubLogo size={56} weight="fill" color={C.yellow} />
          <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 46, color: C.white }}>Whole project shared free</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const S6: React.FC = () => {
  const frame = useCurrentFrame();
  const at = cue("s6", "jeep");
  const typed = "JEEP".slice(0, Math.max(0, Math.floor((frame - at + 4) / 3)));
  const box = usePop(2, 12);
  const link = usePop(cue("s6", "project"), 10);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 290, left: 0, right: 0, textAlign: "center", fontFamily: F.head, fontSize: 104, color: C.white }}>COMMENT</div>
      <div style={{ position: "absolute", top: 450, left: 110, right: 110, display: "flex", alignItems: "center", gap: 24, background: PAPER, borderRadius: 12, padding: "30px 36px", transform: `scale(${box}) rotate(-1deg)` }}>
        <ChatCircleDots size={76} weight="fill" color={INK} />
        <span style={{ fontFamily: F.head, fontSize: 120, color: INK, letterSpacing: 6 }}>
          {typed}
          <span style={{ opacity: frame % 20 < 10 ? 1 : 0, color: "#B3261E" }}>|</span>
        </span>
      </div>
      <div style={{ position: "absolute", top: 760, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 20, transform: `scale(${link})` }}>
        <Link size={70} weight="bold" color={C.yellow} />
        <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 56, color: C.white }}>I'll DM you the project</span>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- captions: typewriter text on a paper strip ---------- */

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
  // reveal characters in step with the words
  let text = "";
  line.forEach((w, k) => {
    const word = w.text.replace(/[,.:?!]$/, "");
    const frac = interpolate(t, [w.start - 0.03, Math.max(w.start + 0.04, w.end - 0.05)], [0, 1], clamp);
    text += (k ? " " : "") + word.slice(0, Math.ceil(word.length * frac));
  });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1360, display: "flex", justifyContent: "center" }}>
      <div style={{ background: PAPER, padding: "12px 30px", transform: "rotate(-1deg)", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
        <span style={{ fontFamily: "'Courier New', Courier, monospace", fontWeight: 700, fontSize: 56, color: INK, whiteSpace: "nowrap" }}>{text}</span>
      </div>
    </div>
  );
};

/* ---------- sound ---------- */

const SOUND: { at: number; src: string; volume?: number }[] = [
  { at: 2, src: "whoosh", volume: 0.4 },
  { at: cueAbs("s1", "32"), src: "click", volume: 0.4 },
  { at: cueAbs("s1", "smog"), src: "click", volume: 0.4 },
  ...SPANS.slice(1).map((s) => ({ at: s.from - 2, src: "whoosh", volume: 0.25 })),
  { at: cueAbs("s2", "100"), src: "ding", volume: 0.35 },
  { at: cueAbs("s2", "worse") - 2, src: "impact", volume: 0.45 },
  { at: cueAbs("s3", "arduino"), src: "pop", volume: 0.3 },
  { at: cueAbs("s3", "data"), src: "click", volume: 0.35 },
  { at: cueAbs("s4", "reprogram"), src: "click", volume: 0.4 },
  { at: cueAbs("s4", "chip"), src: "ding", volume: 0.35 },
  { at: cueAbs("s5", "passed") + 4, src: "impact", volume: 0.5 },
  { at: cueAbs("s6", "jeep"), src: "click", volume: 0.4 },
  { at: END_FROM + 4, src: "impact", volume: 0.35 },
];

/* ---------- composition ---------- */

const SCENES: Record<string, React.FC> = { s1: S1, s2: S2, s3: S3, s4: S4, s5: S5, s6: S6 };

export const JeepSmog: React.FC = () => (
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
      <Audio src={staticFile("vo/jeep/vo.mp3")} />
    </Sequence>
    {SOUND.map((s, i) => (
      <Sfx key={i} {...s} />
    ))}
  </AbsoluteFill>
);

/* ---------- cover (profile grid keeps only the middle 1080 x 1440, y 240-1680) ---------- */

export const JeepSmogCover: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Sheet top={330} height={1000} rot={-2}>
      <Masthead />
      <div style={{ fontFamily: F.head, fontSize: 132, lineHeight: 1.02, color: INK }}>CLAUDE FIXED</div>
      <div style={{ fontFamily: F.head, fontSize: 132, lineHeight: 1.02, color: INK }}>A 32-YEAR-OLD</div>
      <div style={{ fontFamily: F.head, fontSize: 132, lineHeight: 1.02, color: "#B3261E" }}>JEEP</div>
      <div style={{ height: 3, background: INK, margin: "24px 0" }} />
      <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 54, color: INK }}>It finally passed its smog test</div>
    </Sheet>
    <div style={{ position: "absolute", top: 1050, right: 120, transform: "rotate(12deg)", border: "12px solid #1E9E55", borderRadius: 18, padding: "4px 34px 0", fontFamily: F.head, fontSize: 130, lineHeight: 1.1, color: "#1E9E55", letterSpacing: 5 }}>
      PASS
    </div>
  </AbsoluteFill>
);
