import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { ChatCircleDots, CheckFat, Microphone, MusicNotes, Play, PushPin } from "@phosphor-icons/react";
import timing from "../longcat-timing.json";
import { C, F } from "../../themes/aitools";
import { EndCard, ease, makeTimeline, Sfx, Timing, usePop } from "../common";

// Reel: Meituan's LongCat-Video-Avatar 1.6, open model that animates a person from an image + speech.
// Facts: Hugging Face card meituan-longcat/LongCat-Video-Avatar-1.6 (speech-image-to-video, single and multi-person,
// singing shown on the project page, videos "exceeding 10 minutes", 1.6 = more natural lips and stable long videos,
// human eval 33,051 votes: 2nd behind OmniHuman-2.0, ahead of HeyGen and Kling Avatar 2.0). 18 Nov 2026.
// Style: corkboard — pinned polaroids, sticky notes, red string, masking-tape captions. The face is our own drawing.
const T = makeTimeline(timing as Timing);
export const LONGCAT_TOTAL = timing.total;
const { cue, cueAbs, END_FROM, SPANS, WORDS, FPS } = T;

const CORK = "#B98A57";
const NOTE_Y = "#FFE680";
const NOTE_P = "#FF9EC4";
const NOTE_B = "#9ED8FF";
const INK = "#1E1E22";
const STRING = "#D7263D";

/* ---------- pieces ---------- */

const Cork: React.FC = () => (
  <AbsoluteFill style={{ background: CORK }}>
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 0.35 }}>
      {Array.from({ length: 900 }).map((_, i) => (
        <circle key={i} cx={(i * 197) % 1080} cy={(i * 331) % 1920} r={1.5 + (i % 4)} fill={i % 3 ? "#8A6238" : "#D9AE7A"} />
      ))}
    </svg>
    <AbsoluteFill style={{ boxShadow: "inset 0 0 0 26px #6B4A2B, inset 0 0 120px rgba(0,0,0,0.45)" }} />
  </AbsoluteFill>
);

const Pin: React.FC<{ color?: string }> = ({ color = STRING }) => (
  <div style={{ position: "absolute", top: -26, left: "50%", marginLeft: -24 }}>
    <PushPin size={52} weight="fill" color={color} style={{ filter: "drop-shadow(0 4px 3px rgba(0,0,0,0.4))" }} />
  </div>
);

// "Pinned on" entrance: drops from above with a little swing.
const Pinned: React.FC<{ at: number; x: number; y: number; rot?: number; children: React.ReactNode; w?: number }> = ({ at, x, y, rot = 0, children, w }) => {
  const frame = useCurrentFrame();
  const p = usePop(at, 10);
  if (frame < at) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, transform: `translateY(${(1 - p) * -120}px) rotate(${rot + (1 - p) * 12}deg) scale(${0.85 + 0.15 * p})`, opacity: Math.min(1, p * 2) }}>
      {children}
    </div>
  );
};

const Note: React.FC<{ color: string; children: React.ReactNode; pad?: string; pin?: boolean }> = ({ color, children, pad = "34px 30px 26px", pin = true }) => (
  <div style={{ position: "relative", background: color, padding: pad, boxShadow: "0 14px 24px rgba(0,0,0,0.35)", borderRadius: 4 }}>
    {pin ? <Pin /> : null}
    {children}
  </div>
);

// Our own drawn face. `talk` 0..1 opens the mouth.
const Face: React.FC<{ size: number; talk?: number; sing?: boolean }> = ({ size, talk = 0, sing }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" style={{ display: "block" }}>
    <rect width={200} height={200} fill="#2F3A4F" />
    <circle cx={100} cy={250} r={95} fill="#5A6E8C" />
    <ellipse cx={100} cy={100} rx={52} ry={60} fill="#E8B48A" />
    <path d="M 46 92 C 44 40, 156 36, 154 92 C 140 60, 70 56, 46 92 Z" fill="#2A1C14" />
    <circle cx={80} cy={100} r={6} fill={INK} />
    <circle cx={120} cy={100} r={6} fill={INK} />
    <path d={`M 72 ${sing ? 86 : 88} q 8 -6 16 0 M 112 ${sing ? 86 : 88} q 8 -6 16 0`} stroke={INK} strokeWidth={3} fill="none" />
    <ellipse cx={100} cy={132} rx={14 + talk * 4} ry={3 + talk * 13} fill="#7A2430" />
  </svg>
);

const Polaroid: React.FC<{ children: React.ReactNode; label: string; w: number }> = ({ children, label, w }) => (
  <div style={{ position: "relative", background: "#FAFAF5", padding: "18px 18px 10px", width: w, boxShadow: "0 16px 30px rgba(0,0,0,0.4)" }}>
    <Pin />
    {children}
    <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 38, color: INK, textAlign: "center", marginTop: 8 }}>{label}</div>
  </div>
);

const Wave: React.FC<{ w: number; h: number; t: number; color?: string }> = ({ w, h, t, color = INK }) => (
  <svg width={w} height={h} style={{ display: "block" }}>
    {Array.from({ length: 22 }).map((_, i) => {
      const a = 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7 + t * 0.35));
      return <rect key={i} x={i * (w / 22) + 2} y={(h - h * a) / 2} width={w / 22 - 6} height={h * a} rx={4} fill={color} />;
    })}
  </svg>
);

const talkAt = (frame: number) => Math.abs(Math.sin(frame * 0.55)) * (0.4 + 0.6 * Math.abs(Math.sin(frame * 0.17)));

const Layer: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const exit = ease(frame, dur - 6, dur + 6);
  // Notes get "unpinned": drift down and fade.
  return <AbsoluteFill style={{ opacity: 1 - exit, transform: `translateY(${exit * 80}px) rotate(${exit * 2}deg)` }}>{children}</AbsoluteFill>;
};

/* ---------- scenes ---------- */

const S1: React.FC = () => {
  const frame = useCurrentFrame();
  const photo = cue("s1", "photo");
  const voice = cue("s1", "voice");
  const vid = cue("s1", "talking");
  const str = ease(frame, vid - 6, vid + 6);
  return (
    <AbsoluteFill>
      <Pinned at={2} x={110} y={250} rot={-2} w={860}>
        <Note color={NOTE_Y} pad="30px 30px 18px">
          <div style={{ fontFamily: F.head, fontSize: 84, lineHeight: 1.05, color: INK, textAlign: "center" }}>1 PHOTO + VOICE<br />= TALKING VIDEO</div>
        </Note>
      </Pinned>
      <Pinned at={photo} x={80} y={540} rot={-5}>
        <Polaroid label="1 photo" w={330}>
          <Face size={294} />
        </Polaroid>
      </Pinned>
      <Pinned at={voice} x={630} y={560} rot={4} w={370}>
        <Note color={NOTE_B}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: F.body, fontWeight: 800, fontSize: 40, color: INK, marginBottom: 18 }}>
            <Microphone size={48} weight="fill" color={INK} /> voice clip
          </div>
          <Wave w={320} h={110} t={frame} />
        </Note>
      </Pinned>
      {/* red string from both to the result */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: str }}>
        <path d="M 250 960 Q 330 1000 400 960" stroke={STRING} strokeWidth={6} fill="none" />
        <path d="M 810 830 Q 780 920 690 960" stroke={STRING} strokeWidth={6} fill="none" />
      </svg>
      <Pinned at={vid} x={385} y={930} rot={-1}>
        <div style={{ position: "relative", background: INK, padding: 14, boxShadow: "0 18px 30px rgba(0,0,0,0.45)" }}>
          <Pin />
          <Face size={340} talk={talkAt(frame)} />
          <div style={{ position: "absolute", left: 30, bottom: 30, display: "flex", alignItems: "center", gap: 8, background: C.yellow, borderRadius: 999, padding: "6px 18px", fontFamily: F.body, fontWeight: 900, fontSize: 30, color: INK }}>
            <Play size={28} weight="fill" color={INK} /> TALKING
          </div>
        </div>
      </Pinned>
    </AbsoluteFill>
  );
};

const S2: React.FC = () => (
  <AbsoluteFill>
    <Pinned at={2} x={90} y={300} rot={-2} w={900}>
      <Note color="#FAFAF5" pad="44px 44px 34px">
        <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 40, color: "#6B6B70" }}>It's called</div>
        <div style={{ fontFamily: F.head, fontSize: 118, lineHeight: 1, color: INK, marginTop: 8 }}>LONGCAT</div>
        <div style={{ fontFamily: F.head, fontSize: 92, lineHeight: 1.05, color: STRING }}>VIDEO AVATAR</div>
        <div style={{ height: 4, background: "rgba(0,0,0,0.12)", margin: "26px 0" }} />
        <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 46, color: INK }}>by Meituan</div>
      </Note>
    </Pinned>
    <Pinned at={cue("s2", "biggest")} x={500} y={860} rot={5} w={470}>
      <Note color={NOTE_P}>
        <div style={{ fontFamily: F.body, fontWeight: 900, fontSize: 44, lineHeight: 1.2, color: INK }}>One of China's biggest tech companies</div>
      </Note>
    </Pinned>
    <Pinned at={cue("s2", "called") + 10} x={110} y={900} rot={-6} w={320}>
      <Note color={NOTE_Y}>
        <div style={{ fontFamily: F.head, fontSize: 86, lineHeight: 1, color: INK, textAlign: "center" }}>FREE</div>
        <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 36, color: INK, textAlign: "center" }}>open model</div>
      </Note>
    </Pinned>
  </AbsoluteFill>
);

const S3: React.FC = () => {
  const frame = useCurrentFrame();
  const sing = frame >= cue("s3", "sings");
  const notes = [
    { key: "talks", text: "TALKS", color: NOTE_Y, x: 640, y: 330, rot: 4 },
    { key: "moves", text: "MOVES", color: NOTE_B, x: 660, y: 560, rot: -3 },
    { key: "sings", text: "SINGS", color: NOTE_P, x: 640, y: 790, rot: 5 },
  ];
  const match = cue("s3", "match");
  const m = usePop(match, 10);
  return (
    <AbsoluteFill>
      <Pinned at={2} x={70} y={320} rot={-3}>
        <div style={{ position: "relative", background: INK, padding: 14, boxShadow: "0 18px 30px rgba(0,0,0,0.45)" }}>
          <Pin />
          <div style={{ transform: `translateX(${Math.sin(frame / 14) * (frame >= cue("s3", "moves") ? 8 : 0)}px) rotate(${Math.sin(frame / 20) * (frame >= cue("s3", "moves") ? 2 : 0)}deg)` }}>
            <Face size={500} talk={talkAt(frame)} sing={sing} />
          </div>
          {sing ? (
            <div style={{ position: "absolute", right: -30, top: -10, transform: `translateY(${Math.sin(frame / 6) * 8}px)` }}>
              <MusicNotes size={96} weight="fill" color={C.yellow} />
            </div>
          ) : null}
        </div>
      </Pinned>
      {notes.map((n) => (
        <Pinned key={n.key} at={cue("s3", n.key)} x={n.x} y={n.y} rot={n.rot} w={330}>
          <Note color={n.color} pad="30px 20px 18px">
            <div style={{ fontFamily: F.head, fontSize: 96, color: INK, textAlign: "center", lineHeight: 1 }}>{n.text}</div>
          </Note>
        </Pinned>
      ))}
      <div style={{ position: "absolute", top: 1060, left: 70, width: 528, opacity: Math.min(1, m * 1.5), transform: `scale(${m})` }}>
        <div style={{ background: "#FAFAF5", padding: "20px 24px", boxShadow: "0 12px 22px rgba(0,0,0,0.35)" }}>
          <Wave w={480} h={70} t={frame} color={STRING} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: F.body, fontWeight: 900, fontSize: 40, color: INK, marginTop: 10 }}>
            <CheckFat size={40} weight="fill" color="#1E9E52" /> Lips match the voice
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const S4: React.FC = () => {
  const items = [
    { key: "mouths", text: "More natural mouths" },
    { key: "stable", text: "Long videos stay stable" },
    { key: "10", text: "Even past 10 minutes" },
  ];
  return (
    <AbsoluteFill>
      <Pinned at={2} x={330} y={270} rot={-4} w={420}>
        <Note color={STRING}>
          <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 40, color: "#fff", textAlign: "center" }}>NEW VERSION</div>
          <div style={{ fontFamily: F.head, fontSize: 170, color: "#fff", lineHeight: 1, textAlign: "center" }}>1.6</div>
        </Note>
      </Pinned>
      {items.map((it, i) => (
        <Pinned key={it.key} at={cue("s4", it.key)} x={90 + (i % 2) * 40} y={720 + i * 180} rot={i % 2 ? 2 : -2} w={860}>
          <Note color={[NOTE_Y, NOTE_B, NOTE_P][i]} pad="26px 30px 22px" pin={false}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <CheckFat size={64} weight="fill" color={INK} />
              <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 56, color: INK }}>{it.text}</span>
            </div>
          </Note>
        </Pinned>
      ))}
    </AbsoluteFill>
  );
};

const S5: React.FC = () => {
  const frame = useCurrentFrame();
  const votes = cue("s5", "33000");
  const second = cue("s5", "second");
  const ahead = cue("s5", "ahead");
  const n = Math.round(33000 * ease(frame, votes - 4, votes + 14));
  return (
    <AbsoluteFill>
      <Pinned at={2} x={110} y={260} rot={-2} w={860}>
        <Note color={NOTE_Y} pad="28px 30px 20px">
          <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 42, color: INK, textAlign: "center" }}>Blind test · people voted</div>
          <div style={{ fontFamily: F.head, fontSize: 140, color: INK, textAlign: "center", lineHeight: 1 }}>{n.toLocaleString("en-US")}+</div>
        </Note>
      </Pinned>
      <Pinned at={second - 4} x={110} y={640} rot={1} w={860}>
        <Note color="#FAFAF5" pad="30px 34px 26px">
          <div style={{ display: "flex", alignItems: "center", gap: 24, fontFamily: F.body, fontWeight: 800, fontSize: 48, color: "#6B6B70" }}>
            <span style={{ fontFamily: F.head, fontSize: 70, width: 100 }}>#1</span> OmniHuman 2.0
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 18, background: C.yellow, borderRadius: 12, padding: "10px 16px", marginLeft: -16, marginRight: -16 }}>
            <span style={{ fontFamily: F.head, fontSize: 84, width: 100, color: INK }}>#2</span>
            <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 56, color: INK }}>LongCat 1.6</span>
          </div>
        </Note>
      </Pinned>
      <Pinned at={ahead} x={180} y={1010} rot={-3} w={720}>
        <Note color={NOTE_B} pad="26px 30px 20px">
          <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 40, color: INK, textAlign: "center" }}>Ranked ahead of</div>
          <div style={{ fontFamily: F.head, fontSize: 84, color: INK, textAlign: "center", lineHeight: 1.1 }}>HEYGEN · KLING</div>
        </Note>
      </Pinned>
    </AbsoluteFill>
  );
};

const S6: React.FC = () => {
  const frame = useCurrentFrame();
  const c = cue("s6", "comment");
  const link = cue("s6", "link");
  return (
    <AbsoluteFill>
      <Pinned at={c} x={170} y={300} rot={-3} w={740}>
        <Note color={NOTE_Y} pad="40px 40px 26px">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, fontFamily: F.body, fontWeight: 800, fontSize: 48, color: INK }}>
            <ChatCircleDots size={58} weight="fill" color={INK} /> Comment
          </div>
          <div style={{ fontFamily: F.head, fontSize: 190, color: STRING, textAlign: "center", lineHeight: 1 }}>AVATAR</div>
        </Note>
      </Pinned>
      <div style={{ position: "absolute", top: 820, left: 0, right: 0, textAlign: "center", opacity: ease(frame, link - 6, link + 6) }}>
        <span style={{ display: "inline-block", background: "#FAFAF5", padding: "16px 34px", fontFamily: F.body, fontWeight: 900, fontSize: 50, color: INK, boxShadow: "0 10px 20px rgba(0,0,0,0.3)", transform: "rotate(1deg)" }}>
          I'll send you the free link
        </span>
      </div>
      <div style={{ position: "absolute", top: 990, left: 0, right: 0, textAlign: "center", opacity: ease(frame, link + 4, link + 14) }}>
        <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 36, color: "#FAFAF5", background: "rgba(30,30,34,0.7)", padding: "8px 22px", borderRadius: 10 }}>Only use photos you have permission to use</span>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- captions: a strip of masking tape, words rise in, the spoken word circled in red marker ---------- */

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
    <div style={{ position: "absolute", left: 0, right: 0, top: 1370, display: "flex", justifyContent: "center" }}>
      <div style={{ background: "rgba(240,228,196,0.96)", padding: "12px 34px", transform: "rotate(-1.5deg)", boxShadow: "0 8px 18px rgba(0,0,0,0.35)", display: "flex", gap: 20, clipPath: "polygon(1% 0, 99% 4%, 100% 50%, 98% 100%, 2% 96%, 0 50%)" }}>
        {words.map((w, i) => {
          const k = group * 3 + i;
          if (k > idx) return null;
          const rise = ease(frame, Math.round(w.start * FPS) - 2, Math.round(w.start * FPS) + 4);
          const cur = k === idx;
          return (
            <span key={i} style={{ position: "relative", fontFamily: F.body, fontWeight: 900, fontSize: 60, color: INK, whiteSpace: "nowrap", transform: `translateY(${(1 - rise) * 20}px)`, opacity: rise }}>
              {w.text.replace(/[,.:?!]$/, "")}
              {cur ? <span style={{ position: "absolute", inset: "-6px -14px", border: `5px solid ${STRING}`, borderRadius: "50%", transform: "rotate(-3deg)" }} /> : null}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/* ---------- sound ---------- */

const SOUND: { at: number; src: string; volume?: number }[] = [
  { at: 2, src: "pop", volume: 0.35 },
  { at: cueAbs("s1", "photo"), src: "pop", volume: 0.3 },
  { at: cueAbs("s1", "voice"), src: "pop", volume: 0.3 },
  { at: cueAbs("s1", "talking"), src: "impact", volume: 0.35 },
  ...SPANS.slice(1).map((s) => ({ at: s.from - 2, src: "whoosh", volume: 0.22 })),
  { at: cueAbs("s2", "biggest"), src: "pop", volume: 0.3 },
  { at: cueAbs("s3", "talks"), src: "pop", volume: 0.3 },
  { at: cueAbs("s3", "moves"), src: "pop", volume: 0.3 },
  { at: cueAbs("s3", "sings"), src: "pop", volume: 0.3 },
  { at: cueAbs("s3", "match"), src: "ding", volume: 0.3 },
  { at: cueAbs("s4", "mouths"), src: "pop", volume: 0.25 },
  { at: cueAbs("s4", "stable"), src: "pop", volume: 0.25 },
  { at: cueAbs("s4", "10"), src: "pop", volume: 0.25 },
  { at: cueAbs("s5", "second"), src: "ding", volume: 0.35 },
  { at: cueAbs("s5", "ahead"), src: "pop", volume: 0.3 },
  { at: cueAbs("s6", "comment"), src: "impact", volume: 0.4 },
  { at: END_FROM + 4, src: "impact", volume: 0.35 },
];

/* ---------- composition ---------- */

const SCENES: Record<string, React.FC> = { s1: S1, s2: S2, s3: S3, s4: S4, s5: S5, s6: S6 };

export const LongCatAvatar: React.FC = () => (
  <AbsoluteFill style={{ background: CORK }}>
    <Cork />
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
      <AbsoluteFill style={{ background: C.bg }}>
        <EndCard />
      </AbsoluteFill>
    </Sequence>
    <Captions />
    <Sequence from={timing.lead_in} layout="none">
      <Audio src={staticFile("vo/longcat/vo.mp3")} />
    </Sequence>
    {SOUND.map((s, i) => (
      <Sfx key={i} {...s} />
    ))}
  </AbsoluteFill>
);

/* ---------- cover (grid keeps y 240-1680) ---------- */

export const LongCatAvatarCover: React.FC = () => (
  <AbsoluteFill style={{ background: CORK }}>
    <Cork />
    <div style={{ position: "absolute", left: 80, top: 420, transform: "rotate(-5deg)" }}>
      <Polaroid label="1 photo" w={420}>
        <Face size={384} />
      </Polaroid>
    </div>
    <div style={{ position: "absolute", left: 560, top: 470, transform: "rotate(4deg)" }}>
      <div style={{ position: "relative", background: INK, padding: 14, boxShadow: "0 18px 30px rgba(0,0,0,0.45)" }}>
        <Pin />
        <Face size={420} talk={0.8} />
        <div style={{ position: "absolute", left: 26, bottom: 26, display: "flex", alignItems: "center", gap: 8, background: C.yellow, borderRadius: 999, padding: "6px 18px", fontFamily: F.body, fontWeight: 900, fontSize: 32, color: INK }}>
          <Play size={30} weight="fill" color={INK} /> TALKING
        </div>
      </div>
    </div>
    <div style={{ position: "absolute", left: 110, right: 110, top: 1080, transform: "rotate(-2deg)" }}>
      <Note color={NOTE_Y} pad="36px 34px 20px">
        <div style={{ fontFamily: F.head, fontSize: 124, lineHeight: 1.02, color: INK, textAlign: "center" }}>
          YOUR PHOTO
          <br />
          <span style={{ color: STRING }}>NOW TALKS</span>
        </div>
      </Note>
    </div>
  </AbsoluteFill>
);
