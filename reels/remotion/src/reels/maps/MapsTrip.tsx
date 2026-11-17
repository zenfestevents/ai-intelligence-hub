import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { AndroidLogo, AppleLogo, ChatCircleText, Clock, ForkKnife, MapPin, NavigationArrow, ShareFat, Storefront, TrafficSignal } from "@phosphor-icons/react";
import timing from "../maps-timing.json";
import { C, F } from "../../themes/aitools";
import { clamp, EndCard, ease, makeTimeline, Sfx, Timing, usePop } from "../common";

// Reel: Google Maps' Ask Maps now builds trip itineraries. Facts: strategy/posts_2026-11-17.md, Post 2
// (Google blog, 16 Nov 2026). Style: "route map" — our own drawn map (not Google's UI), a route line that draws
// itself, numbered pins that drop, a chat box that types the prompt, captions as a road-sign plate.
const T = makeTimeline(timing as Timing);
export const MAPS_TOTAL = timing.total;
const { span, cue, cueAbs, END_FROM, SPANS, WORDS, FPS } = T;

const LAND = "#16181D";
const ROAD = "#2A2E36";
const WATER = "#0F2230";

/* ---------- the map that lives behind every scene ---------- */

// Stops along the route (map space 1080 x 1920).
const STOPS = [
  { x: 250, y: 640, label: "Beach", day: 1 },
  { x: 610, y: 550, label: "Cafe", day: 1 },
  { x: 820, y: 840, label: "Viewpoint", day: 2 },
  { x: 470, y: 980, label: "Seafood", day: 2 },
  { x: 300, y: 1210, label: "Fort", day: 3 },
  { x: 760, y: 1260, label: "Market", day: 3 },
];
const ROUTE = `M ${STOPS[0].x} ${STOPS[0].y} C 380 500, 520 510, ${STOPS[1].x} ${STOPS[1].y} S 900 720, ${STOPS[2].x} ${STOPS[2].y} S 560 940, ${STOPS[3].x} ${STOPS[3].y} S 220 1100, ${STOPS[4].x} ${STOPS[4].y} S 640 1340, ${STOPS[5].x} ${STOPS[5].y}`;
const ROUTE_LEN = 2600;

const MapBase: React.FC<{ dim?: number }> = ({ dim = 0 }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 10;
  return (
    <AbsoluteFill style={{ transform: `translate(${drift}px, ${-drift}px) scale(1.04)` }}>
      <svg width={1080} height={1920}>
        <rect width={1080} height={1920} fill={LAND} />
        <path d="M 0 0 L 300 0 C 200 160, 120 300, 0 380 Z" fill={WATER} />
        <path d="M 1080 1500 C 900 1560, 760 1700, 720 1920 L 1080 1920 Z" fill={WATER} />
        {/* blocks */}
        {Array.from({ length: 70 }).map((_, i) => {
          const x = (i * 157) % 1080;
          const y = 300 + ((i * 263) % 1300);
          return <rect key={i} x={x} y={y} width={60 + (i % 4) * 22} height={44 + (i % 3) * 18} rx={8} fill="#1C1F25" />;
        })}
        {/* roads */}
        {[260, 640, 1010, 1380].map((y) => (
          <path key={y} d={`M -20 ${y} C 300 ${y - 60}, 700 ${y + 60}, 1100 ${y - 20}`} stroke={ROAD} strokeWidth={22} fill="none" />
        ))}
        {[180, 540, 900].map((x) => (
          <path key={x} d={`M ${x} 200 C ${x + 60} 700, ${x - 60} 1100, ${x + 30} 1700`} stroke={ROAD} strokeWidth={18} fill="none" />
        ))}
      </svg>
      <AbsoluteFill style={{ background: `rgba(13,14,17,${0.35 + dim * 0.5})` }} />
    </AbsoluteFill>
  );
};

const Route: React.FC<{ progress: number }> = ({ progress }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
    <path d={ROUTE} stroke="rgba(255,212,0,0.25)" strokeWidth={30} fill="none" strokeLinecap="round" strokeDasharray={`${ROUTE_LEN}`} strokeDashoffset={ROUTE_LEN * (1 - progress)} />
    <path d={ROUTE} stroke={C.yellow} strokeWidth={12} fill="none" strokeLinecap="round" strokeDasharray={`${ROUTE_LEN}`} strokeDashoffset={ROUTE_LEN * (1 - progress)} />
  </svg>
);

const Pin: React.FC<{ x: number; y: number; n: number; at: number; label?: string }> = ({ x, y, n, at, label }) => {
  const frame = useCurrentFrame();
  const p = usePop(at, 9);
  if (frame < at) return null;
  return (
    <div style={{ position: "absolute", left: x - 50, top: y - 120, width: 100, transform: `translateY(${(1 - p) * -160}px)`, opacity: Math.min(1, p * 2) }}>
      <div style={{ width: 100, height: 100, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", background: C.yellow, boxShadow: "0 12px 24px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ transform: "rotate(45deg)", fontFamily: F.head, fontSize: 58, color: C.ink }}>{n}</span>
      </div>
      {label ? (
        <div style={{ position: "absolute", top: 18, ...(x > 700 ? { right: 116 } : { left: 116 }), whiteSpace: "nowrap", fontFamily: F.body, fontWeight: 800, fontSize: 36, color: C.white, background: "rgba(13,14,17,0.85)", padding: "6px 16px", borderRadius: 10 }}>{label}</div>
      ) : null}
    </div>
  );
};

const Layer: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const enter = ease(frame, 0, 12);
  const exit = ease(frame, dur - 6, dur + 6);
  return <AbsoluteFill style={{ opacity: enter * (1 - exit), transform: `translateY(${(1 - enter) * 60 - exit * 60}px)` }}>{children}</AbsoluteFill>;
};

/* ---------- scenes ---------- */

const S1: React.FC = () => {
  const frame = useCurrentFrame();
  const t = usePop(2, 12);
  const trip = cue("s1", "trip");
  const r = ease(frame, 4, span("s1").dur);
  return (
    <AbsoluteFill>
      <Route progress={r} />
      {STOPS.map((s, i) => (
        <Pin key={i} x={s.x} y={s.y} n={i + 1} at={6 + i * 9} />
      ))}
      <div style={{ position: "absolute", top: 250, left: 40, right: 40, textAlign: "center", transform: `scale(${t})` }}>
        <div style={{ display: "inline-block", background: C.yellow, padding: "14px 34px 4px", borderRadius: 20, fontFamily: F.head, fontSize: 72, lineHeight: 1.05, color: C.ink, transform: "rotate(-2deg)", whiteSpace: "nowrap" }}>
          MAPS PLANS YOUR <span style={{ color: frame >= trip ? "#B00020" : C.ink }}>WHOLE TRIP</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const PROMPT = "Plan a 3-day road trip with beach stops and good food";

const S2: React.FC = () => {
  const frame = useCurrentFrame();
  const t = usePop(2, 12);
  const a = cue("s2", "plan");
  const b = cue("s2", "food") + 6;
  const n = Math.round(interpolate(frame, [a, b], [0, PROMPT.length], clamp));
  const caret = Math.floor(frame / 8) % 2 === 0;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center", fontFamily: F.head, fontSize: 96, color: C.white, opacity: t }}>
        OPEN <span style={{ color: C.yellow }}>ASK MAPS</span>
      </div>
      <div style={{ position: "absolute", top: 470, left: 80, right: 80, transform: `translateY(${(1 - t) * 200}px)` }}>
        <div style={{ background: C.panel, border: `3px solid ${C.yellow}`, borderRadius: 40, padding: "40px 44px", boxShadow: "0 30px 60px rgba(0,0,0,0.6)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: F.body, fontWeight: 800, fontSize: 38, color: C.grey, marginBottom: 24 }}>
            <ChatCircleText size={48} weight="fill" color={C.yellow} /> You type:
          </div>
          <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 64, lineHeight: 1.25, color: C.white, minHeight: 320 }}>
            “{PROMPT.slice(0, n)}
            {n < PROMPT.length ? <span style={{ color: C.yellow, opacity: caret ? 1 : 0 }}>|</span> : "”"}
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 1030, left: 0, right: 0, textAlign: "center", fontFamily: F.body, fontWeight: 700, fontSize: 42, color: C.grey, opacity: ease(frame, b, b + 10) }}>
        Plain words. No forms.
      </div>
    </AbsoluteFill>
  );
};

const DAYS = [
  { d: 1, items: "Beach · Cafe" },
  { d: 2, items: "Viewpoint · Seafood" },
  { d: 3, items: "Fort · Market" },
];

const S3: React.FC = () => {
  const frame = useCurrentFrame();
  const pinsAt = cue("s3", "numbered");
  const r = ease(frame, pinsAt - 4, span("s3").dur - 4);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 250, left: 70, right: 70, display: "flex", gap: 18 }}>
        {DAYS.map((d, i) => {
          const at = cue("s3", "day") + i * 5;
          const p = usePop(at, 12);
          return (
            <div key={i} style={{ flex: 1, background: C.panel, border: `2px solid ${C.line}`, borderRadius: 22, padding: "18px 20px", transform: `translateY(${(1 - p) * -120}px)`, opacity: Math.min(1, p * 1.5) }}>
              <div style={{ fontFamily: F.head, fontSize: 52, color: C.yellow }}>DAY {d.d}</div>
              <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 30, color: C.white, marginTop: 4, whiteSpace: "nowrap" }}>{d.items}</div>
            </div>
          );
        })}
      </div>
      <Route progress={r} />
      {STOPS.map((s, i) => (
        <Pin key={i} x={s.x} y={s.y} n={i + 1} at={pinsAt + i * 6} label={s.label} />
      ))}
    </AbsoluteFill>
  );
};

const LIVE = [
  { key: "traffic", icon: TrafficSignal, title: "Live traffic", value: "Light · 22 min", color: C.green },
  { key: "open", icon: Storefront, title: "Next stop", value: "OPEN now", color: C.green },
];

const S4: React.FC = () => {
  const frame = useCurrentFrame();
  const go = cue("s4", "head");
  const carT = ease(frame, go, span("s4").dur);
  return (
    <AbsoluteFill>
      {STOPS.slice(0, 2).map((s, i) => (
        <Pin key={i} x={s.x} y={s.y} n={i + 1} at={-20} label={s.label} />
      ))}
      {/* car arrow moving between stop 1 and 2 */}
      <div style={{ position: "absolute", left: interpolate(carT, [0, 1], [STOPS[0].x, STOPS[1].x]) - 45, top: interpolate(carT, [0, 1], [STOPS[0].y, STOPS[1].y]) - 45 - Math.sin(carT * Math.PI) * 90, width: 90, height: 90, borderRadius: 45, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 10px rgba(255,212,0,0.35)" }}>
        <NavigationArrow size={56} weight="fill" color={C.ink} style={{ transform: "rotate(80deg)" }} />
      </div>
      <div style={{ position: "absolute", top: 860, left: 90, right: 90, display: "flex", flexDirection: "column", gap: 22 }}>
        {LIVE.map((l, i) => {
          const at = cue("s4", l.key);
          const p = ease(frame, at - 4, at + 8);
          const Icon = l.icon;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 26, background: "rgba(26,28,33,0.95)", border: `2px solid ${C.line}`, borderRadius: 26, padding: "24px 32px", opacity: p, transform: `translateX(${(1 - p) * 400}px)` }}>
              <Icon size={70} weight="fill" color={l.color} />
              <div>
                <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 36, color: C.grey }}>{l.title}</div>
                <div style={{ fontFamily: F.head, fontSize: 70, color: C.white, lineHeight: 1.05 }}>{l.value}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const S5: React.FC = () => {
  const frame = useCurrentFrame();
  const lunch = cue("s5", "lunch");
  const l = usePop(lunch, 10);
  const share = cue("s5", "share");
  const s = usePop(share, 11);
  const fam = cue("s5", "family");
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 280, left: 80, right: 80, display: "flex", justifyContent: "flex-end" }}>
        <div style={{ background: C.yellow, color: C.ink, fontFamily: F.body, fontWeight: 800, fontSize: 50, padding: "22px 34px", borderRadius: "34px 34px 6px 34px", opacity: ease(frame, 4, 14) }}>
          “Add a lunch stop”
        </div>
      </div>
      <div style={{ position: "absolute", top: 480, left: 80, right: 80 }}>
        {["Beach", "Lunch", "Cafe"].map((name, i) => {
          const isNew = i === 1;
          const h = isNew ? l : 1;
          return (
            <div key={name} style={{ height: 130 * h, overflow: "hidden", marginBottom: 18 * h }}>
              <div style={{ display: "flex", alignItems: "center", gap: 24, background: isNew ? "rgba(255,212,0,0.14)" : C.panel, border: `2px solid ${isNew ? C.yellow : C.line}`, borderRadius: 24, padding: "22px 30px", height: 130, boxSizing: "border-box" }}>
                {isNew ? <ForkKnife size={60} weight="fill" color={C.yellow} /> : <MapPin size={60} weight="fill" color={C.grey} />}
                <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 52, color: C.white }}>{name}</span>
                {isNew ? <span style={{ marginLeft: "auto", fontFamily: F.body, fontWeight: 800, fontSize: 36, color: C.yellow }}>NEW</span> : null}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 960, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 22, transform: `scale(${s})` }}>
        <ShareFat size={84} weight="fill" color={C.yellow} />
        <span style={{ fontFamily: F.head, fontSize: 92, color: C.white }}>
          SHARE WITH <span style={{ color: frame >= fam ? C.yellow : C.white }}>FAMILY</span>
        </span>
      </div>
    </AbsoluteFill>
  );
};

const S6: React.FC = () => {
  const frame = useCurrentFrame();
  const a = usePop(cue("s6", "android"), 11);
  const i = usePop(cue("s6", "iphone"), 11);
  const c = usePop(cue("s6", "comment"), 10);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 290, left: 0, right: 0, textAlign: "center", fontFamily: F.head, fontSize: 88, color: C.white }}>ROLLING OUT NOW</div>
      <div style={{ position: "absolute", top: 420, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 40 }}>
        {[
          { p: a, Icon: AndroidLogo, t: "Android" },
          { p: i, Icon: AppleLogo, t: "iPhone" },
        ].map(({ p, Icon, t }) => (
          <div key={t} style={{ width: 330, height: 260, borderRadius: 34, background: C.panel, border: `2px solid ${C.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, transform: `scale(${p})` }}>
            <Icon size={110} weight="fill" color={C.white} />
            <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 46, color: C.white }}>{t}</span>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", top: 820, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${c}) rotate(${(1 - c) * 10 - 2}deg)` }}>
        <div style={{ background: C.yellow, borderRadius: 30, padding: "26px 48px 14px", textAlign: "center" }}>
          <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 44, color: C.ink }}>Comment</div>
          <div style={{ fontFamily: F.head, fontSize: 170, color: C.ink, lineHeight: 1 }}>TRIP</div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 1170, left: 0, right: 0, textAlign: "center", fontFamily: F.body, fontWeight: 800, fontSize: 46, color: C.grey, opacity: ease(frame, cue("s6", "prompts"), cue("s6", "prompts") + 10) }}>
        I'll DM you my best trip prompts
      </div>
    </AbsoluteFill>
  );
};

/* ---------- captions: a road-sign plate, two lines max, current word underlined ---------- */

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (frame >= END_FROM - 4) return null;
  let idx = -1;
  for (let i = 0; i < WORDS.length; i++) if (WORDS[i].start - 0.04 <= t) idx = i;
  if (idx < 0) return null;
  const group = Math.floor(idx / 3);
  const words = WORDS.slice(group * 3, group * 3 + 3);
  const last = words[words.length - 1];
  if (t > last.end + 0.6) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 1360, display: "flex", justifyContent: "center" }}>
      <div style={{ background: "#0B5D3B", border: "6px solid #fff", borderRadius: 18, padding: "10px 30px", display: "flex", gap: 18, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
        {words.map((w, i) => {
          const on = group * 3 + i <= idx;
          return (
            <span key={i} style={{ fontFamily: F.body, fontWeight: 900, fontSize: 60, color: on ? C.white : "rgba(255,255,255,0.4)", whiteSpace: "nowrap", borderBottom: group * 3 + i === idx ? `6px solid ${C.yellow}` : "6px solid transparent" }}>
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
  ...STOPS.map((_, i) => ({ at: 6 + i * 9, src: "pop", volume: 0.22 })),
  { at: cueAbs("s1", "trip"), src: "ding", volume: 0.35 },
  ...SPANS.slice(1).map((s) => ({ at: s.from - 2, src: "whoosh", volume: 0.25 })),
  ...Array.from({ length: 10 }).map((_, i) => ({ at: cueAbs("s2", "plan") + i * 8, src: "click", volume: 0.18 })),
  ...STOPS.map((_, i) => ({ at: cueAbs("s3", "numbered") + i * 6, src: "pop", volume: 0.25 })),
  { at: cueAbs("s4", "traffic"), src: "pop", volume: 0.3 },
  { at: cueAbs("s4", "open"), src: "ding", volume: 0.3 },
  { at: cueAbs("s5", "lunch"), src: "pop", volume: 0.35 },
  { at: cueAbs("s5", "share"), src: "whoosh", volume: 0.3 },
  { at: cueAbs("s6", "comment"), src: "impact", volume: 0.4 },
  { at: END_FROM + 4, src: "impact", volume: 0.35 },
];

/* ---------- composition ---------- */

const SCENES: Record<string, React.FC> = { s1: S1, s2: S2, s3: S3, s4: S4, s5: S5, s6: S6 };
const DIM: Record<string, number> = { s1: 0, s2: 0.8, s3: 0, s4: 0.1, s5: 0.8, s6: 0.8 };

const MapLayer: React.FC = () => {
  const frame = useCurrentFrame();
  let dim = 0.8;
  for (const s of SPANS) if (frame >= s.from) dim = DIM[s.id];
  if (frame >= END_FROM) dim = 1;
  return <MapBase dim={dim} />;
};

export const MapsTrip: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <MapLayer />
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
      <Audio src={staticFile("vo/maps/vo.mp3")} />
    </Sequence>
    {SOUND.map((s, i) => (
      <Sfx key={i} {...s} />
    ))}
  </AbsoluteFill>
);

/* ---------- cover (grid keeps y 240-1680) ---------- */

export const MapsTripCover: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <MapBase dim={0.1} />
    <Route progress={1} />
    {STOPS.map((s, i) => (
      <Pin key={i} x={s.x} y={s.y} n={i + 1} at={-30} />
    ))}
    <div style={{ position: "absolute", top: 1345, left: 60, right: 60, textAlign: "center" }}>
      <div style={{ display: "inline-block", background: C.yellow, padding: "14px 40px 4px", borderRadius: 22, fontFamily: F.head, fontSize: 104, lineHeight: 1.04, color: C.ink, transform: "rotate(-2deg)", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
        GOOGLE MAPS NOW
        <br />
        PLANS YOUR TRIP
      </div>
    </div>
    <div style={{ position: "absolute", top: 290, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(13,14,17,0.9)", border: `2px solid ${C.line}`, borderRadius: 999, padding: "14px 30px", fontFamily: F.body, fontWeight: 800, fontSize: 44, color: C.white }}>
        <Clock size={48} weight="fill" color={C.yellow} /> Day-by-day, in seconds
      </div>
    </div>
  </AbsoluteFill>
);
