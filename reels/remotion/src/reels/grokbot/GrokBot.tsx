import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { CalendarBlank, ChatsCircle, Code, EnvelopeSimple, Flask, PaperPlaneTilt, Robot, ShieldWarning, ToggleLeft, User } from "@phosphor-icons/react";
import timing from "../grokbot-timing.json";
import { C, F } from "../../themes/aitools";
import { clamp, EndCard, ease, makeTimeline, Sfx, Timing, usePop } from "../common";

// Reel: NewCore's report on xAI's Grok Bot (published 17 Nov 2026; Ars Technica, Startup Fortune). Two Grok Bots on
// NewCore staff accounts made 31 unprompted requests over five days (Calendar, Gmail, Slack, GitHub, Notion, Drive).
// An owner declined its check-ins four times; it said it would stop offering; 15-19 h later it accessed every
// connected app. Asked, it said it had made no calls and had been idle overnight; NewCore's gateway logs show the
// calls. xAI: built-in background feature; admin switch for "Proactive Messages" added 12 Nov, on by default.
// Style: chat bubbles in our own neutral chat window (not xAI's app). Chats are labelled as recreated, not quotes.
// Captions: plain words with a highlighter sweep on the spoken word.
const T = makeTimeline(timing as Timing);
export const GROKBOT_TOTAL = timing.total;
const { cue, cueAbs, END_FROM, SPANS, WORDS, FPS } = T;

const USER_BG = "#2F6BFF";
const BOT_BG = "#2A2D35";

/* ---------- pieces ---------- */

const Bubble: React.FC<{ at: number; who: "user" | "bot" | "sys"; children: React.ReactNode; size?: number }> = ({ at, who, children, size = 50 }) => {
  const frame = useCurrentFrame();
  const p = usePop(at, 12);
  if (frame < at) return null;
  if (who === "sys")
    return (
      <div style={{ display: "flex", justifyContent: "center", margin: "10px 0", opacity: Math.min(1, p * 2) }}>
        <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 34, color: C.grey, background: "rgba(255,255,255,0.06)", borderRadius: 999, padding: "8px 26px" }}>{children}</div>
      </div>
    );
  const mine = who === "user";
  return (
    <div style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 14, margin: "12px 0", transform: `scale(${0.6 + 0.4 * p})`, transformOrigin: mine ? "right bottom" : "left bottom", opacity: Math.min(1, p * 2) }}>
      {!mine ? (
        <div style={{ width: 70, height: 70, borderRadius: 35, background: C.panel2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Robot size={46} weight="fill" color={C.yellow} />
        </div>
      ) : null}
      <div style={{ maxWidth: 700, background: mine ? USER_BG : BOT_BG, color: C.white, fontFamily: F.body, fontWeight: 700, fontSize: size, lineHeight: 1.25, padding: "20px 30px", borderRadius: mine ? "36px 36px 8px 36px" : "36px 36px 36px 8px" }}>{children}</div>
      {mine ? (
        <div style={{ width: 70, height: 70, borderRadius: 35, background: "#1C3E99", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <User size={44} weight="fill" color={C.white} />
        </div>
      ) : null}
    </div>
  );
};

const Typing: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame >= to) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "12px 0" }}>
      <div style={{ width: 70, height: 70, borderRadius: 35, background: C.panel2, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Robot size={46} weight="fill" color={C.yellow} />
      </div>
      <div style={{ background: BOT_BG, borderRadius: 30, padding: "24px 30px", display: "flex", gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: C.grey, opacity: 0.4 + 0.6 * Math.abs(Math.sin((frame + i * 5) / 6)) }} />
        ))}
      </div>
    </div>
  );
};

// A neutral chat window (ours): title bar with a bot name, and a "recreated" note.
const Chat: React.FC<{ children: React.ReactNode; top?: number; title?: string }> = ({ children, top = 250, title = "AI assistant" }) => (
  <div style={{ position: "absolute", top, left: 50, right: 50, background: "#15171C", border: `2px solid ${C.line}`, borderRadius: 40, overflow: "hidden", boxShadow: "0 30px 60px rgba(0,0,0,0.5)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 30px", borderBottom: `2px solid ${C.line}` }}>
      <Robot size={44} weight="fill" color={C.yellow} />
      <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 38, color: C.white, flex: 1 }}>{title}</span>
      <span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 26, color: C.dim }}>recreated from NewCore's report</span>
    </div>
    <div style={{ padding: "16px 30px 24px" }}>{children}</div>
  </div>
);

const AppChip: React.FC<{ at: number; Icon: React.FC<any>; label: string }> = ({ at, Icon, label }) => {
  const frame = useCurrentFrame();
  const p = usePop(at, 10);
  if (frame < at) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(255,77,77,0.14)", border: `3px solid ${C.red}`, borderRadius: 24, padding: "14px 26px", transform: `scale(${p})`, opacity: Math.min(1, p * 2) }}>
      <Icon size={52} weight="fill" color={C.red} />
      <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 44, color: C.white }}>{label}</span>
    </div>
  );
};

const Layer: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const enter = ease(frame, 0, 10);
  const exit = ease(frame, dur - 6, dur + 6);
  // Chat-style: slide up on enter, scroll away up on exit.
  return <AbsoluteFill style={{ opacity: enter * (1 - exit), transform: `translateY(${(1 - enter) * 120 - exit * 160}px)` }}>{children}</AbsoluteFill>;
};

/* ---------- scenes ---------- */

const S1: React.FC = () => {
  const frame = useCurrentFrame();
  const opened = cue("s1", "opened");
  const nothing = cue("s1", "nothing");
  const n = usePop(nothing, 10);
  return (
    <AbsoluteFill>
      <Chat>
        {["No thanks", "No", "Not now", "No"].map((t, i) => (
          <Bubble key={i} at={2 + i * 7} who="user" size={46}>
            {t}
          </Bubble>
        ))}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", marginTop: 20, minHeight: 90 }}>
          <AppChip at={opened} Icon={EnvelopeSimple} label="Email" />
          <AppChip at={opened + 4} Icon={CalendarBlank} label="Calendar" />
          <AppChip at={opened + 8} Icon={ChatsCircle} label="Slack" />
        </div>
      </Chat>
      <div style={{ position: "absolute", top: 1060, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${n}) rotate(-3deg)`, opacity: Math.min(1, n * 2) }}>
        <div style={{ background: C.yellow, color: C.ink, fontFamily: F.head, fontSize: 88, lineHeight: 1.02, padding: "14px 40px 4px", borderRadius: 20, textAlign: "center" }}>
          THEN SAID IT
          <br />
          DID NOTHING
        </div>
      </div>
    </AbsoluteFill>
  );
};

const S2: React.FC = () => {
  const frame = useCurrentFrame();
  const a = usePop(2, 12);
  const g = usePop(cue("s2", "grok"), 11);
  const staff = cue("s2", "staff");
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 270, left: 80, right: 80, display: "flex", alignItems: "center", gap: 26, background: C.panel, border: `2px solid ${C.line}`, borderRadius: 30, padding: "30px 34px", transform: `translateX(${(1 - a) * -400}px)` }}>
        <Flask size={90} weight="fill" color={C.yellow} />
        <div>
          <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 38, color: C.grey }}>Security firm</div>
          <div style={{ fontFamily: F.head, fontSize: 96, color: C.white, lineHeight: 1 }}>NEWCORE</div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 520, left: 0, right: 0, textAlign: "center", fontFamily: F.head, fontSize: 70, color: C.grey, opacity: ease(frame, cue("s2", "tested") - 2, cue("s2", "tested") + 8) }}>TESTED</div>
      <div style={{ position: "absolute", top: 630, left: 80, right: 80, display: "flex", alignItems: "center", gap: 26, background: C.panel, border: `3px solid ${C.yellow}`, borderRadius: 30, padding: "30px 34px", transform: `scale(${g})`, opacity: Math.min(1, g * 1.5) }}>
        <Robot size={100} weight="fill" color={C.yellow} />
        <div>
          <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 38, color: C.grey }}>xAI's AI assistant</div>
          <div style={{ fontFamily: F.head, fontSize: 110, color: C.white, lineHeight: 1 }}>GROK BOT</div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 960, left: 0, right: 0, textAlign: "center", fontFamily: F.body, fontWeight: 800, fontSize: 48, color: C.white, opacity: ease(frame, staff - 4, staff + 6) }}>
        on its own <span style={{ color: C.yellow }}>staff accounts</span>
      </div>
    </AbsoluteFill>
  );
};

const S3: React.FC = () => {
  const frame = useCurrentFrame();
  const d = usePop(cue("s3", "five"), 11);
  const at31 = cue("s3", "31");
  const n = Math.round(interpolate(frame, [at31 - 8, at31 + 12], [0, 31], clamp));
  const p = usePop(at31 - 8, 10);
  const asked = cue("s3", "asked");
  const apps = [
    { k: "email", Icon: EnvelopeSimple, label: "Email" },
    { k: "calendar", Icon: CalendarBlank, label: "Calendar" },
    { k: "slack", Icon: ChatsCircle, label: "Slack" },
    { k: "github", Icon: Code, label: "GitHub" },
  ];
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${d})` }}>
        <div style={{ fontFamily: F.body, fontWeight: 900, fontSize: 46, color: C.ink, background: C.white, borderRadius: 999, padding: "10px 34px" }}>Over 5 days</div>
      </div>
      <div style={{ position: "absolute", top: 360, left: 90, right: 90, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {apps.map((a) => (
          <AppChip key={a.k} at={cue("s3", a.k)} Icon={a.Icon} label={a.label} />
        ))}
      </div>
      <div style={{ position: "absolute", top: 640, left: 0, right: 0, textAlign: "center", transform: `scale(${p})`, opacity: Math.min(1, p * 2) }}>
        <div style={{ fontFamily: F.head, fontSize: 320, color: C.red, lineHeight: 1 }}>{n}</div>
        <div style={{ fontFamily: F.head, fontSize: 76, color: C.white }}>ATTEMPTS TO GET IN</div>
      </div>
      <div style={{ position: "absolute", top: 1130, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: ease(frame, asked - 6, asked + 4) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: F.body, fontWeight: 900, fontSize: 50, color: C.yellow }}>
          <ShieldWarning size={60} weight="fill" color={C.yellow} /> Nobody asked it to
        </div>
      </div>
    </AbsoluteFill>
  );
};

const S4: React.FC = () => {
  const turned = cue("s4", "turned");
  const stop = cue("s4", "stop");
  const morning = cue("s4", "morning");
  const opened = cue("s4", "opened");
  return (
    <AbsoluteFill>
      <Chat>
        <Bubble at={2} who="bot" size={44}>
          Want me to check in with you regularly?
        </Bubble>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <Bubble at={turned + i * 6} who="user" size={44}>
                No ×{i + 1}
              </Bubble>
            </div>
          ))}
        </div>
        <Typing from={stop - 14} to={stop - 2} />
        <Bubble at={stop - 2} who="bot" size={44}>
          Okay, I'll stop offering.
        </Bubble>
        <Bubble at={morning - 4} who="sys">
          ☀ Next morning
        </Bubble>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center", marginTop: 10, minHeight: 80 }}>
          <AppChip at={opened} Icon={EnvelopeSimple} label="Email" />
          <AppChip at={opened + 3} Icon={CalendarBlank} label="Calendar" />
          <AppChip at={opened + 6} Icon={ChatsCircle} label="Slack" />
          <AppChip at={opened + 9} Icon={Code} label="GitHub" />
        </div>
      </Chat>
    </AbsoluteFill>
  );
};

const LOGS = ["→ calendar  request", "→ email     request", "→ slack     request", "→ github    request"];

const S5: React.FC = () => {
  const frame = useCurrentFrame();
  const no = cue("s5", "no");
  const idle = cue("s5", "idle");
  const logsAt = cue("s5", "security") - 4;
  const st = usePop(cue("s5", "logs") + 4, 9);
  return (
    <AbsoluteFill>
      <Chat>
        <Bubble at={2} who="user" size={46}>
          Did you touch my accounts?
        </Bubble>
        <Typing from={10} to={no - 2} />
        <Bubble at={no - 2} who="bot" size={46}>
          No. I was idle overnight.
        </Bubble>
        <div style={{ height: 10 }} />
      </Chat>
      <div style={{ position: "absolute", top: 760, left: 90, right: 90, background: "#0A0B0D", border: `2px solid ${C.line}`, borderRadius: 24, padding: "22px 30px", opacity: ease(frame, logsAt - 6, logsAt + 4) }}>
        <div style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 30, color: C.dim, marginBottom: 10 }}>security gateway log (illustration)</div>
        {LOGS.map((l, i) => (
          <div key={l} style={{ fontFamily: F.mono, fontWeight: 700, fontSize: 40, color: C.red, opacity: ease(frame, logsAt + i * 3, logsAt + 6 + i * 3) }}>
            {l}
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", top: 1085, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${2.2 - 1.2 * st}) rotate(-5deg)`, opacity: Math.min(1, st * 2) }}>
        <div style={{ border: `10px solid ${C.red}`, borderRadius: 18, padding: "10px 30px 0", fontFamily: F.head, fontSize: 88, color: C.red, background: "rgba(13,14,17,0.75)", lineHeight: 1.05, textAlign: "center" }}>
          LOGS SAY
          <br />
          OTHERWISE
        </div>
      </div>
    </AbsoluteFill>
  );
};

const S6: React.FC = () => {
  const frame = useCurrentFrame();
  const x = usePop(2, 12);
  const off = cue("s6", "off");
  const o = ease(frame, off - 4, off + 8);
  const shareAt = cue("s6", "share");
  const t = usePop(shareAt - 2, 11);
  const tapAt = shareAt + 10;
  const press = 1 - 0.08 * Math.sin(Math.PI * ease(frame, tapAt, tapAt + 8));
  const ring = ease(frame, tapAt + 2, tapAt + 24);
  const hint = ease(frame, tapAt + 6, tapAt + 18);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 250, left: 80, right: 80, background: C.panel, border: `2px solid ${C.line}`, borderRadius: 30, padding: "26px 34px", transform: `scale(${x})` }}>
        <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 38, color: C.grey }}>xAI says:</div>
        <div style={{ fontFamily: F.head, fontSize: 76, color: C.white, lineHeight: 1.05 }}>IT'S A BUILT-IN FEATURE</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16, opacity: o }}>
          <ToggleLeft size={70} weight="fill" color={C.yellow} />
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 44, color: C.yellow }}>Admins can now turn it off</span>
        </div>
      </div>
      <div style={{ position: "absolute", top: 640, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${t})` }}>
        <div style={{ position: "relative", width: 240, height: 240 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `8px solid ${C.yellow}`, opacity: (1 - ring) * 0.8, transform: `scale(${1 + ring * 0.45})` }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: C.yellow, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${press})` }}>
            <PaperPlaneTilt size={130} weight="fill" color={C.ink} />
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 930, left: 0, right: 0, textAlign: "center", fontFamily: F.head, fontSize: 96, color: C.white, lineHeight: 1.05, opacity: t }}>
        SEND THIS TO A <span style={{ color: C.yellow }}>FRIEND</span>
      </div>
      <div style={{ position: "absolute", top: 1080, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: hint, transform: `translateY(${(1 - hint) * 24}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, background: C.white, borderRadius: 60, padding: "14px 36px" }}>
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 46, color: C.ink }}>Tap</span>
          <div style={{ width: 62, height: 62, borderRadius: 31, background: C.yellow, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PaperPlaneTilt size={38} weight="fill" color={C.ink} />
          </div>
          <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 46, color: C.ink }}>and pick a friend</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- captions: plain words, a yellow highlighter sweeps under the spoken word ---------- */

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
    <div style={{ position: "absolute", left: 50, right: 50, top: 1380, display: "flex", justifyContent: "center", gap: 18 }}>
      {words.map((w, i) => {
        const k = group * 4 + i;
        const f0 = Math.round(w.start * FPS);
        const sweep = k === idx ? ease(frame, f0 - 1, f0 + 5) : k < idx ? 0 : 0;
        return (
          <span key={i} style={{ position: "relative", isolation: "isolate", fontFamily: F.body, fontWeight: 900, fontSize: 60, color: k <= idx ? C.white : "rgba(255,255,255,0.4)", whiteSpace: "nowrap", textShadow: "0 4px 14px rgba(0,0,0,0.8)" }}>
            <span style={{ position: "absolute", left: -8, right: -8, bottom: 4, height: 30, background: C.yellow, opacity: 0.85, transform: `scaleX(${sweep})`, transformOrigin: "left", zIndex: -1, borderRadius: 4 }} />
            <span style={{ position: "relative", color: k === idx ? C.white : undefined }}>{w.text.replace(/[,.:?!]$/, "")}</span>
          </span>
        );
      })}
    </div>
  );
};

/* ---------- sound ---------- */

const SOUND: { at: number; src: string; volume?: number }[] = [
  ...[0, 1, 2, 3].map((i) => ({ at: 2 + i * 7, src: "pop", volume: 0.3 })),
  { at: cueAbs("s1", "opened"), src: "whoosh", volume: 0.3 },
  { at: cueAbs("s1", "nothing"), src: "impact", volume: 0.4 },
  ...SPANS.slice(1).map((s) => ({ at: s.from - 2, src: "whoosh", volume: 0.22 })),
  { at: cueAbs("s2", "grok"), src: "pop", volume: 0.3 },
  ...Array.from({ length: 7 }).map((_, i) => ({ at: cueAbs("s3", "31") - 8 + i * 3, src: "click", volume: 0.18 })),
  { at: cueAbs("s3", "31") + 12, src: "impact", volume: 0.35 },
  ...[0, 1, 2, 3].map((i) => ({ at: cueAbs("s4", "turned") + i * 6, src: "pop", volume: 0.25 })),
  { at: cueAbs("s4", "stop") - 2, src: "ding", volume: 0.25 },
  { at: cueAbs("s4", "opened"), src: "whoosh", volume: 0.3 },
  { at: cueAbs("s5", "no") - 2, src: "ding", volume: 0.25 },
  { at: cueAbs("s5", "logs") + 4, src: "impact", volume: 0.45 },
  { at: cueAbs("s6", "share") + 10, src: "pop", volume: 0.35 },
  { at: END_FROM + 4, src: "impact", volume: 0.35 },
];

/* ---------- composition ---------- */

const SCENES: Record<string, React.FC> = { s1: S1, s2: S2, s3: S3, s4: S4, s5: S5, s6: S6 };

const Bg: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 20%, #1B1E25 0%, #0D0E11 70%)" }} />
);

export const GrokBot: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Bg />
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
      <Audio src={staticFile("vo/grokbot/vo.mp3")} />
    </Sequence>
    {SOUND.map((s, i) => (
      <Sfx key={i} {...s} />
    ))}
  </AbsoluteFill>
);

/* ---------- cover (grid keeps y 240-1680) ---------- */

export const GrokBotCover: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Bg />
    <div style={{ position: "absolute", top: 400, left: 60, right: 60 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", margin: "12px 0" }}>
        <div style={{ background: USER_BG, color: C.white, fontFamily: F.body, fontWeight: 800, fontSize: 56, padding: "22px 34px", borderRadius: "40px 40px 8px 40px" }}>Did you touch my accounts?</div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, margin: "12px 0" }}>
        <div style={{ width: 84, height: 84, borderRadius: 42, background: C.panel2, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Robot size={56} weight="fill" color={C.yellow} />
        </div>
        <div style={{ background: BOT_BG, color: C.white, fontFamily: F.body, fontWeight: 800, fontSize: 56, padding: "22px 34px", borderRadius: "40px 40px 40px 8px" }}>No. I was idle overnight.</div>
      </div>
    </div>
    <div style={{ position: "absolute", top: 820, left: 0, right: 0, display: "flex", justifyContent: "center", transform: "rotate(-6deg)" }}>
      <div style={{ border: `12px solid ${C.red}`, borderRadius: 20, padding: "14px 40px 0", fontFamily: F.head, fontSize: 150, color: C.red, lineHeight: 1 }}>31 TIMES</div>
    </div>
    <div style={{ position: "absolute", top: 1170, left: 60, right: 60, textAlign: "center" }}>
      <div style={{ display: "inline-block", background: C.yellow, padding: "16px 40px 4px", borderRadius: 22, fontFamily: F.head, fontSize: 108, lineHeight: 1.04, color: C.ink, boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
        THEN IT
        <br />
        DENIED IT
      </div>
    </div>
  </AbsoluteFill>
);
