import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import {
  ArrowLeft,
  BookmarkSimple,
  CheckCircle,
  DotsThree,
  Fingerprint,
  Gift,
  Car,
  Key,
  Lock,
  Robot,
  SealCheck,
  ShieldCheck,
  ShoppingCart,
  Sneaker,
  Storefront,
  UserFocus,
  Wallet,
  Warning,
} from "@phosphor-icons/react";
import timing from "../wallet-timing.json";
import { C, EASE_OUT, F } from "../../themes/aitools";
import { AiLogo } from "../../themes/AiToolsBrand";

// Reel: "ChatGPT can now shop and pay for you" (ChatGPT Wallet). Facts: strategy/posts_2026-11-14.md.
// Style: "phone demo". The story plays inside one generic phone; a camera zooms and pans between
// screens, headlines are tilted stickers. Company names are plain text only: no logos, no card colours.
export const WALLET_TOTAL = timing.total;
const FPS = timing.fps;
type Seg = (typeof timing.segments)[number];
const SEG: Record<string, Seg> = Object.fromEntries(timing.segments.map((s) => [s.id, s]));
const IDS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7"];
const END_FROM = timing.speech_end + 8;

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9']/g, "");
const cueAbs = (id: string, key: string, nth = 0) => {
  const hits = SEG[id].words.filter((w) => norm(w.text).startsWith(key));
  const w = hits[nth] ?? hits[0];
  if (!w) throw new Error(`no word "${key}" in ${id}`);
  return Math.round(w.start * FPS);
};
const SPANS = IDS.map((id, i) => {
  const from = i === 0 ? 0 : SEG[id].from - 4;
  const to = i < IDS.length - 1 ? SEG[IDS[i + 1]].from - 4 : END_FROM;
  return { id, from, dur: to - from };
});
const span = (id: string) => SPANS.find((s) => s.id === id)!;
const cue = (id: string, key: string, nth = 0) => cueAbs(id, key, nth) - span(id).from;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (f: number, a: number, b: number, from = 0, to = 1) => interpolate(f, [a, b], [from, to], { ...clamp, easing: EASE_OUT });
const usePop = (at: number, damping = 11) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping, stiffness: 170, mass: 0.7 } });
};

/* ---------- phone + camera ---------- */

const PHONE = { w: 560, h: 980, left: 260, top: 410, bezel: 16 };
const SW = PHONE.w - PHONE.bezel * 2; // screen width 528
const SH = PHONE.h - PHONE.bezel * 2; // screen height 1028
const PHONE_CX = PHONE.left + PHONE.w / 2;
const PHONE_CY = PHONE.top + PHONE.h / 2;

type Cam = { s: number; x: number; y: number; r: number };
// Camera keyframes: from frame f the camera eases to cam over d frames.
const CAM_KEYS: { f: number; cam: Cam; d?: number }[] = [
  { f: 0, cam: { s: 0.55, x: 0, y: 700, r: -14 }, d: 1 },
  { f: 2, cam: { s: 1, x: 0, y: 0, r: 0 }, d: 18 },
  { f: span("s2").from, cam: { s: 1.04, x: 0, y: 30, r: 1.5 } },
  { f: span("s3").from, cam: { s: 1, x: 0, y: 0, r: -1 } },
  { f: cueAbs("s3", "then") - 4, cam: { s: 1.22, x: 0, y: -200, r: 0 }, d: 20 },
  { f: span("s4").from, cam: { s: 0.78, x: -200, y: 40, r: -4 }, d: 18 },
  { f: span("s5").from, cam: { s: 1, x: 0, y: 0, r: 2 }, d: 18 },
  { f: span("s6").from, cam: { s: 0.94, x: 0, y: 40, r: -2 } },
  { f: span("s7").from, cam: { s: 1, x: 0, y: 0, r: 0 } },
  { f: cueAbs("s7", "send") - 4, cam: { s: 1.08, x: 0, y: 30, r: 0 }, d: 20 },
  { f: END_FROM - 2, cam: { s: 0.5, x: 0, y: 1400, r: 10 }, d: 16 },
];
const camAt = (t: number): Cam => {
  let cur = CAM_KEYS[0].cam;
  for (const k of CAM_KEYS) {
    if (t < k.f) break;
    const p = ease(t, k.f, k.f + (k.d ?? 14));
    if (p < 1) {
      return { s: cur.s + (k.cam.s - cur.s) * p, x: cur.x + (k.cam.x - cur.x) * p, y: cur.y + (k.cam.y - cur.y) * p, r: cur.r + (k.cam.r - cur.r) * p };
    }
    cur = k.cam;
  }
  return cur;
};
// Canvas position of a point given in phone-screen coordinates (for things that fly out of the phone).
const screenToCanvas = (sx: number, sy: number, cam: Cam) => {
  const px = PHONE.left + PHONE.bezel + sx - PHONE_CX;
  const py = PHONE.top + PHONE.bezel + sy - PHONE_CY;
  const a = (cam.r * Math.PI) / 180;
  const rx = (px * Math.cos(a) - py * Math.sin(a)) * cam.s;
  const ry = (px * Math.sin(a) + py * Math.cos(a)) * cam.s;
  return { x: PHONE_CX + cam.x + rx, y: PHONE_CY + cam.y + ry };
};

const Phone: React.FC<{ children: React.ReactNode; shake?: number }> = ({ children, shake = 0 }) => {
  const frame = useCurrentFrame();
  const cam = camAt(frame);
  const sx = Math.sin(frame * 9.1) * shake;
  const sy = Math.cos(frame * 7.3) * shake;
  return (
    <div
      style={{
        position: "absolute",
        left: PHONE.left,
        top: PHONE.top,
        width: PHONE.w,
        height: PHONE.h,
        transform: `translate(${cam.x + sx}px, ${cam.y + sy}px) rotate(${cam.r}deg) scale(${cam.s})`,
        transformOrigin: "50% 50%",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 78,
          background: "#050506",
          border: "3px solid #3A3D45",
          boxShadow: "0 60px 120px -30px rgba(0,0,0,0.9), 0 0 0 10px rgba(255,212,0,0.06), 0 0 120px rgba(255,212,0,0.12)",
        }}
      />
      <div style={{ position: "absolute", left: PHONE.bezel, top: PHONE.bezel, width: SW, height: SH, borderRadius: 64, overflow: "hidden", background: "#17191E" }}>
        {children}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 44px",
            fontFamily: F.body,
            fontWeight: 700,
            fontSize: 22,
            color: C.white,
          }}
        >
          <span>9:41</span>
          <div style={{ width: 120, height: 32, borderRadius: 16, background: "#000" }} />
          <span style={{ letterSpacing: 2 }}>●●●</span>
        </div>
      </div>
    </div>
  );
};

// Each screen slides in from the right like app navigation, over the previous one.
const Screen: React.FC<{ title: string; back?: boolean; children: React.ReactNode }> = ({ title, back = true, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, 0, 12);
  return (
    <div style={{ position: "absolute", inset: 0, background: "#17191E", transform: `translateX(${(1 - p) * SW}px)`, boxShadow: "-30px 0 60px rgba(0,0,0,0.6)" }}>
      <div style={{ position: "absolute", top: 70, left: 30, right: 30, height: 70, display: "flex", alignItems: "center", gap: 14, fontFamily: F.body, fontWeight: 800, fontSize: 34, color: C.white }}>
        {back ? <ArrowLeft size={34} weight="bold" color={C.grey} /> : null}
        {title}
        <div style={{ flex: 1 }} />
        <DotsThree size={40} weight="bold" color={C.grey} />
      </div>
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, height: 2, background: C.line }} />
      {children}
    </div>
  );
};

/* ---------- shared bits ---------- */

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = camAt(frame);
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundImage: "repeating-linear-gradient(-35deg, rgba(255,212,0,0.045) 0 2px, transparent 2px 46px)",
          transform: `translate(${-cam.x * 0.25}px, ${-cam.y * 0.25 - frame * 0.6}px) scale(1.4)`,
        }}
      />
      <AbsoluteFill style={{ background: `radial-gradient(circle 560px at ${PHONE_CX + cam.x * 0.6}px ${PHONE_CY + cam.y * 0.4}px, rgba(255,212,0,0.20), transparent 72%)` }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.65))" }} />
    </AbsoluteFill>
  );
};

// Tilted yellow sticker headline that slaps on over the top of the phone.
const Sticker: React.FC<{ lines: React.ReactNode[]; small?: string; at?: number; tilt?: number; top?: number; outAt?: number }> = ({ lines, small, at = 2, tilt = -3, top = 205, outAt = 99999 }) => {
  const frame = useCurrentFrame();
  const p = usePop(at, 9);
  const out = ease(frame, outAt, outAt + 10);
  return (
    <div style={{ position: "absolute", top: top - out * 420, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          padding: "14px 34px 18px",
          background: C.yellow,
          borderRadius: 22,
          boxShadow: "0 24px 60px -20px rgba(0,0,0,0.9)",
          transform: `rotate(${tilt}deg) scale(${interpolate(p, [0, 1], [1.9, 1])})`,
          opacity: Math.min(1, p * 3),
          textAlign: "center",
          maxWidth: 940,
        }}
      >
        {small ? <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 30, color: C.ink, opacity: 0.7, marginBottom: 2 }}>{small}</div> : null}
        {lines.map((l, i) => (
          <div key={i} style={{ fontFamily: F.head, fontSize: 70, lineHeight: 1.14, color: C.ink, textTransform: "uppercase" }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
};

// Generic payment card: black with a yellow stripe. No network logo or colours.
const PayCard: React.FC<{ number: React.ReactNode; label?: string; width?: number; tone?: "dark" | "yellow"; style?: React.CSSProperties }> = ({
  number,
  label = "MY CARD",
  width = 420,
  tone = "dark",
  style,
}) => {
  const h = width * 0.63;
  const dark = tone === "dark";
  return (
    <div
      style={{
        width,
        height: h,
        borderRadius: width * 0.06,
        background: dark ? "linear-gradient(135deg, #2B2E36, #15171B)" : C.yellow,
        border: dark ? "2px solid rgba(255,212,0,0.45)" : "none",
        boxShadow: "0 24px 60px -24px rgba(0,0,0,0.9)",
        position: "relative",
        overflow: "hidden",
        color: dark ? C.white : C.ink,
        fontFamily: F.body,
        flexShrink: 0,
        ...style,
      }}
    >
      <div style={{ position: "absolute", left: 0, right: 0, top: h * 0.2, height: h * 0.1, background: dark ? C.yellow : C.ink, opacity: 0.9 }} />
      <div style={{ position: "absolute", left: width * 0.07, top: h * 0.06, fontWeight: 800, fontSize: width * 0.055, letterSpacing: 2 }}>{label}</div>
      <div style={{ position: "absolute", left: width * 0.07, top: h * 0.42, width: width * 0.13, height: h * 0.16, borderRadius: 6, background: dark ? "#C9B26A" : C.ink, opacity: 0.85 }} />
      <div style={{ position: "absolute", left: width * 0.07, bottom: h * 0.12, fontFamily: F.mono, fontWeight: 700, fontSize: width * 0.068, letterSpacing: 2, whiteSpace: "nowrap" }}>{number}</div>
    </div>
  );
};

const Bubble: React.FC<{ at: number; me?: boolean; children: React.ReactNode; top: number }> = ({ at, me, children, top }) => {
  const p = usePop(at, 12);
  return (
    <div
      style={{
        position: "absolute",
        top,
        [me ? "right" : "left"]: 28,
        maxWidth: 440,
        padding: "20px 26px",
        borderRadius: me ? "26px 26px 6px 26px" : "26px 26px 26px 6px",
        background: me ? C.yellow : C.panel2,
        color: me ? C.ink : C.white,
        fontFamily: F.body,
        fontWeight: 700,
        fontSize: 34,
        lineHeight: 1.22,
        opacity: Math.min(1, p * 2),
        transform: `translateY(${(1 - p) * 40}px) scale(${0.85 + p * 0.15})`,
        transformOrigin: me ? "right bottom" : "left bottom",
      }}
    >
      {children}
    </div>
  );
};

const Row: React.FC<{ at: number; icon: React.ReactNode; text: React.ReactNode; right?: React.ReactNode; top: number; big?: boolean; hot?: boolean }> = ({
  at,
  icon,
  text,
  right,
  top,
  big,
  hot,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, at + 9);
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 28,
        right: 28,
        height: big ? 110 : 84,
        borderRadius: 22,
        background: hot ? C.yellow : C.panel2,
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "0 24px",
        fontFamily: F.body,
        fontWeight: 800,
        fontSize: big ? 36 : 30,
        color: hot ? C.ink : C.white,
        opacity: p,
        transform: `translateX(${(1 - p) * 80}px)`,
      }}
    >
      {icon}
      <span style={{ flex: 1, whiteSpace: "nowrap" }}>{text}</span>
      {right}
    </div>
  );
};

/* ---------- screens ---------- */

const REAL = "4821 7730 1956 4821";
const MASK = "•••• •••• •••• 4821";

const ChatScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const neverAt = cue("s1", "never");
  const scr = interpolate(frame, [neverAt, neverAt + 14], [0, 1], clamp);
  const shown = REAL.split("")
    .map((ch, i) => (MASK[i] === ch || ch === " " ? ch : scr >= 1 || scr > i / REAL.length ? MASK[i] : scr > 0 ? String((i * 3 + frame) % 10) : ch))
    .join("");
  const card = usePop(cue("s1", "and") - 2, 12);
  const lock = usePop(neverAt + 12, 9);
  return (
    <Screen title="ChatGPT" back={false}>
      <Bubble at={4} me top={190}>
        Buy me running shoes under $100
      </Bubble>
      <Bubble at={cue("s1", "buy")} top={335}>
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ShoppingCart size={34} weight="fill" color={C.yellow} /> Found a pair for $89. Approve?
        </span>
      </Bubble>
      <div style={{ position: "absolute", top: 485, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", opacity: Math.min(1, card * 2), transform: `translateY(${(1 - card) * 80}px)` }}>
        <PayCard number={shown} width={440} style={{ transform: "rotate(-3deg)" }} />
        <div style={{ marginTop: 36, display: "flex", alignItems: "center", gap: 14, padding: "18px 28px", borderRadius: 44, background: C.yellow, transform: `scale(${lock}) rotate(-2deg)` }}>
          <Lock size={46} weight="bold" color={C.ink} />
          <span style={{ fontFamily: F.body, fontWeight: 900, fontSize: 28, color: C.ink, whiteSpace: "nowrap" }}>AI never sees this number</span>
        </div>
      </div>
    </Screen>
  );
};

const WalletScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const addAt = cue("s2", "add");
  const findAt = cue("s2", "find");
  const buyAt = cue("s2", "buy");
  const card = usePop(addAt, 12);
  const saved = usePop(addAt + 14, 10);
  const items = [
    { n: "Trail shoes", p: "$129", ok: false },
    { n: "Running shoes", p: "$89", ok: true },
    { n: "Light shoes", p: "$95", ok: false },
  ];
  const rowY = (i: number) => 540 + i * 110;
  // Robot hops down the list and lands on the $89 pair.
  const ry = interpolate(frame, [findAt, findAt + 8, Math.max(findAt + 9, buyAt)], [rowY(0), rowY(2), rowY(1)], clamp);
  const chosen = frame >= buyAt;
  return (
    <Screen title="Wallet">
      <div style={{ position: "absolute", top: 190, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ transform: `translateY(${(1 - card) * -360}px) rotate(${(1 - card) * 10}deg)`, opacity: Math.min(1, card * 2) }}>
          <PayCard number="•••• •••• •••• 4821" width={400} />
        </div>
        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 10, transform: `scale(${saved})`, fontFamily: F.body, fontWeight: 800, fontSize: 30, color: C.white }}>
          <Wallet size={40} weight="fill" color={C.yellow} /> Card added once <CheckCircle size={36} weight="fill" color={C.green} />
        </div>
      </div>
      {items.map((it, i) => {
        const hot = chosen && it.ok;
        return (
          <Row
            key={it.n}
            at={findAt + i * 3}
            top={rowY(i)}
            hot={hot}
            icon={<Sneaker size={44} weight="fill" color={hot ? C.ink : C.yellow} />}
            text={it.n}
            right={<span style={{ color: hot ? C.ink : C.grey, marginRight: 40, whiteSpace: "nowrap" }}>{hot ? "✓ " : ""}{it.p}</span>}
          />
        );
      })}
      {frame >= findAt ? (
        <div style={{ position: "absolute", top: ry + 10, right: 6, width: 64, height: 64, borderRadius: 32, background: C.yellow, border: `4px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Robot size={40} weight="fill" color={C.ink} />
        </div>
      ) : null}
    </Screen>
  );
};

const CheckoutScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const faceAt = cue("s3", "face");
  const fpAt = cue("s3", "fingerprint");
  const okAt = cue("s3", "every");
  const ok = frame >= okAt;
  const scanOn = frame >= faceAt - 6;
  const scanP = usePop(faceAt - 6, 12);
  const line = (((frame - faceAt) % 24) + 24) % 24 / 24;
  const burst = ease(frame, okAt, okAt + 16);
  const okP = usePop(okAt, 9);
  return (
    <Screen title="Checkout">
      <Row at={cue("s3", "items")} top={180} icon={<Sneaker size={44} weight="fill" color={C.yellow} />} text="Running shoes" right="$89.00" />
      <Row at={cue("s3", "total")} top={280} icon={<ShoppingCart size={44} weight="fill" color={C.yellow} />} text="Total" right={<span style={{ fontSize: 36 }}>$89.00</span>} />
      <Row at={cue("s3", "card")} top={380} icon={<Wallet size={44} weight="fill" color={C.yellow} />} text="Card" right={<span style={{ fontFamily: F.mono }}>•••• 4821</span>} />
      {scanOn ? (
        <div style={{ position: "absolute", top: 500, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 30, transform: `scale(${scanP})` }}>
          {[
            { at: faceAt, Icon: UserFocus },
            { at: fpAt, Icon: Fingerprint },
          ].map(({ at, Icon }, i) => {
            const active = frame >= at;
            return (
              <div key={i} style={{ position: "relative", width: 200, height: 220, borderRadius: 30, background: C.panel2, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", opacity: active ? 1 : 0.35 }}>
                <Icon size={130} weight="bold" color={ok ? C.green : C.yellow} />
                {active && !ok ? <div style={{ position: "absolute", left: 10, right: 10, top: 10 + line * 190, height: 6, borderRadius: 3, background: C.yellow, boxShadow: "0 0 20px rgba(255,212,0,0.9)" }} /> : null}
                {[0, 1, 2, 3].map((c) => (
                  <div
                    key={c}
                    style={{
                      position: "absolute",
                      width: 40,
                      height: 40,
                      [c < 2 ? "top" : "bottom"]: 12,
                      [c % 2 ? "right" : "left"]: 12,
                      borderColor: ok ? C.green : C.yellow,
                      borderStyle: "solid",
                      borderWidth: `${c < 2 ? 6 : 0}px ${c % 2 ? 6 : 0}px ${c < 2 ? 0 : 6}px ${c % 2 ? 0 : 6}px`,
                      borderRadius: 8,
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          top: 790,
          left: 28,
          right: 28,
          height: 120,
          borderRadius: 60,
          background: ok ? C.green : "rgba(255,255,255,0.10)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          fontFamily: F.body,
          fontWeight: 900,
          fontSize: 44,
          color: ok ? C.ink : C.dim,
          transform: `scale(${ok ? 0.9 + okP * 0.1 : 1})`,
        }}
      >
        {ok ? <SealCheck size={54} weight="fill" /> : null}
        {ok ? "Approved" : "Approve to pay"}
      </div>
      {ok
        ? [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: SW / 2 + Math.cos(a) * (60 + burst * 220) - 8,
                  top: 850 + Math.sin(a) * (40 + burst * 120) - 8,
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  background: i % 2 ? C.yellow : C.green,
                  opacity: 1 - burst,
                }}
              />
            );
          })
        : null}
    </Screen>
  );
};

const RING_R = 130;
const RING_TOP = 230;
const spareAngle = -Math.PI / 2 + (2 * Math.PI) / 5;

const TokenScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const tokenAt = cue("s4", "token");
  const realAt = cue("s4", "real");
  const valetAt = cue("s4", "valet");
  const lock = usePop(realAt, 10);
  const tok = usePop(tokenAt - 8, 11);
  const flying = frame >= tokenAt + 4;
  const kp = ease(frame, valetAt - 6, valetAt + 4);
  const spareOut = frame >= cue("s4", "spare") + 2;
  return (
    <Screen title="Paying the shop">
      <div style={{ position: "absolute", inset: 0, opacity: 1 - kp }}>
        <div style={{ position: "absolute", top: 190, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <PayCard number="•••• •••• •••• 4821" width={420} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 120, height: 120, borderRadius: 60, background: C.yellow, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${lock})`, boxShadow: "0 10px 40px rgba(0,0,0,0.6)" }}>
                <Lock size={70} weight="bold" color={C.ink} />
              </div>
            </div>
          </div>
          <div style={{ marginTop: 18, fontFamily: F.body, fontWeight: 800, fontSize: 30, color: C.grey, opacity: lock }}>Your real card stays private</div>
        </div>
        <div style={{ position: "absolute", top: 560, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", opacity: Math.min(1, tok * 2) }}>
          <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 24, color: C.yellow, marginBottom: 14 }}>Stand-in number from your card network</div>
          <div style={{ transform: `scale(${tok})`, opacity: flying ? 0 : 1 }}>
            <PayCard number="5307 •••• •••• 9912" label="PAYMENT TOKEN" width={360} tone="yellow" />
          </div>
        </div>
      </div>
      {kp > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: kp }}>
          <div style={{ position: "absolute", top: RING_TOP, left: SW / 2 - 180, width: 360, height: 360 }}>
            <svg width={360} height={360} style={{ position: "absolute", left: 0, top: 0 }}>
              {[0, 1, 2, 3, 4].map((i) => {
                if (i === 1 && spareOut) return null;
                const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
                return <line key={i} x1={180 + Math.cos(a) * 52} y1={180 + Math.sin(a) * 52} x2={180 + Math.cos(a) * 92} y2={180 + Math.sin(a) * 92} stroke={C.grey} strokeWidth={9} strokeLinecap="round" />;
              })}
            </svg>
            <div style={{ position: "absolute", left: 120, top: 120, width: 120, height: 120, borderRadius: 60, border: `12px solid ${C.grey}`, boxSizing: "border-box" }} />
            {[0, 1, 2, 3, 4].map((i) => {
              const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
              if (i === 1 && spareOut) return null;
              return (
                <div key={i} style={{ position: "absolute", left: 180 + Math.cos(a) * RING_R - 55, top: 180 + Math.sin(a) * RING_R - 55, transform: `rotate(${(a * 180) / Math.PI + 90}deg)` }}>
                  <Key size={110} weight="fill" color={i === 1 ? C.yellow : C.white} />
                </div>
              );
            })}
          </div>
          <div style={{ position: "absolute", top: 640, left: 0, right: 0, textAlign: "center", fontFamily: F.body, fontWeight: 800, fontSize: 32, color: C.grey, opacity: ease(frame, cue("s4", "ring"), cue("s4", "ring") + 10) }}>
            Your key ring stays with you
          </div>
        </div>
      ) : null}
    </Screen>
  );
};

// Pieces outside the phone in scene 4: the shop, the flying token, the valet and the spare key.
const TokenOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const base = span("s4").from;
  const tokenAt = cue("s4", "token");
  const realAt = cue("s4", "real");
  const valetAt = cue("s4", "valet");
  const spareAt = cue("s4", "spare");
  const cam = camAt(base + frame);
  const shop = usePop(10, 12);
  const shopOut = ease(frame, valetAt - 8, valetAt);
  const fly = ease(frame, tokenAt + 4, realAt + 2);
  const start = screenToCanvas(SW / 2, 720, cam);
  const shopPos = { x: 840, y: 780 };
  const got = usePop(realAt + 2, 9);
  const valet = usePop(valetAt, 9);
  const kf = ease(frame, spareAt + 2, spareAt + 18);
  const kStart = screenToCanvas(SW / 2 + Math.cos(spareAngle) * RING_R, RING_TOP + 180 + Math.sin(spareAngle) * RING_R, cam);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: shopPos.x - 130, top: shopPos.y - 150, width: 260, display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${shop * (1 - shopOut)})` }}>
        <Storefront size={190} weight="fill" color={C.white} />
        <div style={{ fontFamily: F.head, fontSize: 52, color: C.white }}>THE SHOP</div>
        <div style={{ marginTop: 8, padding: "8px 18px", borderRadius: 14, background: C.green, color: C.ink, fontFamily: F.body, fontWeight: 900, fontSize: 26, transform: `scale(${got})`, whiteSpace: "nowrap" }}>
          Gets the token only
        </div>
      </div>
      {frame >= tokenAt + 4 && fly < 1 ? (
        <div
          style={{
            position: "absolute",
            left: interpolate(fly, [0, 1], [start.x, shopPos.x]) - 110,
            top: interpolate(fly, [0, 1], [start.y, shopPos.y + 20]) - 70 - Math.sin(fly * Math.PI) * 160,
            transform: `rotate(${-10 + fly * 370}deg) scale(${0.8 - fly * 0.35})`,
          }}
        >
          <PayCard number="5307 •••• 9912" label="TOKEN" width={220} tone="yellow" />
        </div>
      ) : null}
      <div style={{ position: "absolute", left: shopPos.x - 150, top: shopPos.y - 190, width: 300, display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${valet})` }}>
        <Car size={130} weight="fill" color={C.white} />
        <div style={{ marginTop: 6, padding: "10px 30px", borderRadius: 18, background: C.yellow, fontFamily: F.head, fontSize: 68, color: C.ink, transform: "rotate(-4deg)" }}>VALET</div>
        <div style={{ marginTop: 14, fontFamily: F.body, fontWeight: 800, fontSize: 32, color: C.white, textAlign: "center", lineHeight: 1.2 }}>
          parks your car
          <br />
          <span style={{ color: C.grey, fontSize: 26 }}>gets a spare key only</span>
        </div>
      </div>
      {frame >= spareAt + 2 ? (
        <div
          style={{
            position: "absolute",
            left: interpolate(kf, [0, 1], [kStart.x, shopPos.x + 150]) - 50,
            top: interpolate(kf, [0, 1], [kStart.y, shopPos.y - 20]) - 50 - Math.sin(kf * Math.PI) * 120,
            transform: `rotate(${kf * 300}deg)`,
          }}
        >
          <Key size={100} weight="fill" color={C.yellow} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const KeepScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const builtAt = cue("s5", "built");
  const names = ["Visa", "Mastercard", "American Express"];
  const nameAt = [cue("s5", "visa"), cue("s5", "mastercard"), cue("s5", "american")];
  return (
    <Screen title="Your card">
      <div style={{ position: "absolute", top: 180, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <PayCard number="•••• •••• •••• 4821" width={380} />
      </div>
      <Row at={cue("s5", "rewards")} top={460} big icon={<Gift size={56} weight="fill" color={C.yellow} />} text="Card rewards" right={<CheckCircle size={52} weight="fill" color={C.green} />} />
      <Row
        at={cue("s5", "dispute")}
        top={590}
        big
        icon={<ShieldCheck size={56} weight="fill" color={C.yellow} />}
        text={
          <span style={{ lineHeight: 1.1, fontSize: 31, whiteSpace: "normal", display: "inline-block" }}>
            Dispute protection
            <br />
            <span style={{ fontSize: 22, color: C.grey, fontWeight: 600 }}>for eligible disputes</span>
          </span>
        }
        right={<CheckCircle size={52} weight="fill" color={C.green} />}
      />
      <div style={{ position: "absolute", top: 750, left: 28, right: 28, textAlign: "center" }}>
        <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 24, color: C.dim, letterSpacing: 2, opacity: ease(frame, builtAt, builtAt + 8) }}>BUILT WITH</div>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4, fontFamily: F.body, fontWeight: 800, fontSize: 34, color: C.white }}>
          {names.map((n, i) => {
            const p = ease(frame, nameAt[i], nameAt[i] + 8);
            return (
              <span key={n} style={{ opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}>
                {n}
              </span>
            );
          })}
        </div>
      </div>
    </Screen>
  );
};

const CatchScreen: React.FC = () => {
  const chips = [
    { t: "ChatGPT Pro", at: cue("s6", "pro") },
    { t: "US only", at: cue("s6", "us", 1) },
    { t: "18+", at: cue("s6", "18") },
    { t: "US-issued card", at: cue("s6", "usissued") },
  ];
  return (
    <Screen title="For now, only for">
      {chips.map((c, i) => (
        <Row key={c.t} at={c.at} top={210 + i * 125} big icon={<Warning size={50} weight="fill" color={C.red} />} text={c.t} />
      ))}
    </Screen>
  );
};

const CatchTape: React.FC = () => {
  const frame = useCurrentFrame();
  const at = cue("s6", "catch");
  const p = ease(frame, at - 2, at + 8);
  return (
    <div
      style={{
        position: "absolute",
        left: -120,
        right: -120,
        top: 250,
        height: 170,
        background: C.red,
        transform: `rotate(-6deg) translateX(${(1 - p) * -1500}px)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        boxShadow: "0 30px 60px -20px rgba(0,0,0,0.8)",
        fontFamily: F.head,
        fontSize: 110,
        color: C.white,
        letterSpacing: 2,
      }}
    >
      <Warning size={100} weight="fill" /> THE CATCH
    </div>
  );
};

const WORD = "WALLET";
const CommentScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const typeAt = cue("s7", "wallet") + 2;
  const typed = Math.floor(interpolate(frame, [typeAt, typeAt + WORD.length * 3], [0, WORD.length], clamp));
  const sendAt = cue("s7", "send");
  const posted = frame >= sendAt;
  const postP = usePop(sendAt, 10);
  const dm = usePop(cue("s7", "change"), 12);
  return (
    <Screen title="Comments">
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: "absolute", top: 200 + i * 120, left: 28, right: 28, display: "flex", gap: 18, alignItems: "center" }}>
          <div style={{ width: 70, height: 70, borderRadius: 35, background: "#2E3139" }} />
          <div style={{ flex: 1 }}>
            <div style={{ width: 140, height: 18, borderRadius: 9, background: "#3A3D45" }} />
            <div style={{ width: [300, 240, 330][i], height: 22, borderRadius: 11, background: "#2A2D34", marginTop: 12 }} />
          </div>
        </div>
      ))}
      {posted ? (
        <div style={{ position: "absolute", top: 560, left: 28, right: 28, display: "flex", gap: 18, alignItems: "center", opacity: Math.min(1, postP * 2), transform: `translateY(${(1 - postP) * 40}px)` }}>
          <div style={{ width: 70, height: 70, borderRadius: 35, background: C.yellow, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.body, fontWeight: 900, fontSize: 26, color: C.ink }}>you</div>
          <div style={{ padding: "12px 24px", borderRadius: 20, background: C.panel2, fontFamily: F.head, fontSize: 56, color: C.yellow }}>WALLET</div>
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 22, right: 22, bottom: 40, height: 100, borderRadius: 50, background: C.panel2, display: "flex", alignItems: "center", padding: "0 30px", gap: 16 }}>
        <div style={{ flex: 1, fontFamily: F.body, fontWeight: 800, fontSize: 34, whiteSpace: "nowrap", color: typed && !posted ? C.white : C.dim }}>
          {!posted && typed ? WORD.slice(0, typed) : "Add a comment..."}
          {!posted && typed && typed < WORD.length ? <span style={{ color: C.yellow }}>|</span> : null}
        </div>
        <div style={{ fontFamily: F.body, fontWeight: 900, fontSize: 34, color: typed >= WORD.length && !posted ? C.yellow : C.dim }}>Post</div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 64,
          left: 18,
          right: 18,
          height: 120,
          borderRadius: 30,
          background: "rgba(245,245,245,0.97)",
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "0 22px",
          transform: `translateY(${(1 - dm) * -240}px)`,
          boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
        }}
      >
        <AiLogo size={76} />
        <div style={{ fontFamily: F.body, color: C.ink }}>
          <div style={{ fontWeight: 900, fontSize: 26 }}>New message</div>
          <div style={{ fontWeight: 700, fontSize: 24, opacity: 0.75 }}>Your shop-owner checklist</div>
        </div>
      </div>
    </Screen>
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
        Follow for <span style={{ color: C.yellow }}>daily AI updates</span>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- captions: Anton, word highlighted as a yellow block, under the phone ---------- */

type Word = { text: string; start: number; end: number };
const CHUNKS: Word[][] = (() => {
  const all: Word[] = timing.segments.flatMap((s) => s.words);
  const out: Word[][] = [];
  let cur: Word[] = [];
  for (const w of all) {
    cur.push(w);
    if (cur.length >= 3 || /[.,?!:]$/.test(w.text)) {
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
  const idx = CHUNKS.findIndex((c, i) => {
    const next = CHUNKS[i + 1];
    const until = next ? Math.min(next[0].start, c[c.length - 1].end + 0.6) : c[c.length - 1].end + 0.5;
    return t >= c[0].start - 0.05 && t < until;
  });
  if (idx < 0) return null;
  const chunk = CHUNKS[idx];
  const inP = ease(frame, Math.round(chunk[0].start * FPS) - 2, Math.round(chunk[0].start * FPS) + 4);
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: 1415, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 12px", opacity: inP, transform: `translateY(${(1 - inP) * 14}px)` }}>
      {chunk.map((w, i) => {
        const active = t >= w.start - 0.03 && (i === chunk.length - 1 || t < chunk[i + 1].start - 0.03);
        return (
          <span
            key={i}
            style={{
              fontFamily: F.head,
              fontSize: 64,
              lineHeight: 1.18,
              padding: "0 12px",
              borderRadius: 10,
              textTransform: "uppercase",
              color: active ? C.ink : C.white,
              background: active ? C.yellow : "transparent",
              textShadow: active ? "none" : "0 4px 0 #000, 0 0 18px rgba(0,0,0,0.9)",
              transform: `rotate(${active ? -2 : 0}deg)`,
              display: "inline-block",
            }}
          >
            {w.text.replace(/[,.:]$/, "")}
          </span>
        );
      })}
    </div>
  );
};

/* ---------- sound ---------- */

const Sfx: React.FC<{ at: number; src: string; volume?: number }> = ({ at, src, volume = 0.35 }) => (
  <Sequence from={Math.max(0, at)} durationInFrames={30} layout="none">
    <Audio src={staticFile(`sfx/${src}.wav`)} volume={volume} />
  </Sequence>
);

const SOUND: { at: number; src: string; volume?: number }[] = [
  { at: 2, src: "whoosh", volume: 0.4 },
  { at: 8, src: "impact", volume: 0.45 },
  { at: cueAbs("s1", "buy"), src: "pop", volume: 0.3 },
  { at: cueAbs("s1", "never") + 12, src: "click", volume: 0.5 },
  ...SPANS.slice(1).map((s) => ({ at: s.from - 2, src: "whoosh", volume: 0.22 })),
  ...SPANS.slice(1, 7).filter((s) => s.id !== "s6").map((s) => ({ at: s.from + 2, src: "pop", volume: 0.3 })),
  { at: cueAbs("s2", "add") + 14, src: "ding", volume: 0.3 },
  { at: cueAbs("s2", "buy"), src: "click", volume: 0.55 },
  { at: cueAbs("s3", "then") - 4, src: "whoosh", volume: 0.2 },
  { at: cueAbs("s3", "every"), src: "ding", volume: 0.4 },
  { at: cueAbs("s4", "token") + 4, src: "whoosh", volume: 0.25 },
  { at: cueAbs("s4", "real") + 2, src: "click", volume: 0.5 },
  { at: cueAbs("s4", "spare") + 2, src: "whoosh", volume: 0.22 },
  { at: cueAbs("s5", "rewards"), src: "pop", volume: 0.35 },
  { at: cueAbs("s5", "dispute"), src: "pop", volume: 0.35 },
  { at: cueAbs("s6", "catch"), src: "impact", volume: 0.45 },
  ...[cueAbs("s6", "us", 1), cueAbs("s6", "pro"), cueAbs("s6", "18"), cueAbs("s6", "usissued")].map((at) => ({ at, src: "pop", volume: 0.3 })),
  ...[0, 1, 2, 3, 4, 5].map((i) => ({ at: cueAbs("s7", "wallet") + 2 + i * 3, src: "click", volume: 0.45 })),
  { at: cueAbs("s7", "send"), src: "pop", volume: 0.35 },
  { at: cueAbs("s7", "change"), src: "ding", volume: 0.4 },
  { at: END_FROM + 4, src: "impact", volume: 0.35 },
];

/* ---------- composition ---------- */

export const ChatGPTWallet: React.FC = () => {
  const frame = useCurrentFrame();
  // Each screen stays a little past its scene so the next one slides over it.
  const At = (id: string, node: React.ReactNode, key: string, pad = 0) => (
    <Sequence key={key} from={span(id).from} durationInFrames={span(id).dur + pad} layout="none">
      {node}
    </Sequence>
  );
  const catchAt = cueAbs("s6", "catch");
  const shake = frame >= catchAt && frame < catchAt + 12 ? (catchAt + 12 - frame) * 1.4 : 0;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Background />
      {frame < END_FROM + 18 ? (
        <Phone shake={shake}>
          {At("s1", <ChatScreen />, "p1", 14)}
          {At("s2", <WalletScreen />, "p2", 14)}
          {At("s3", <CheckoutScreen />, "p3", 14)}
          {At("s4", <TokenScreen />, "p4", 14)}
          {At("s5", <KeepScreen />, "p5", 14)}
          {At("s6", <CatchScreen />, "p6", 14)}
          {At("s7", <CommentScreen />, "p7", 30)}
        </Phone>
      ) : null}
      {At("s4", <TokenOverlay />, "o4")}
      {At("s6", <CatchTape />, "o6")}
      {At("s1", <Sticker lines={["ChatGPT can now", <>shop &amp; <span style={{ display: "inline-block", background: C.ink, color: C.yellow, padding: "3px 12px 5px", lineHeight: 0.95, borderRadius: 10, verticalAlign: "baseline" }}>pay</span> for you</>]} at={8} />, "t1")}
      {At("s2", <Sticker small="OpenAI · just launched" lines={["ChatGPT Wallet"]} tilt={2} />, "t2")}
      {At("s3", <Sticker lines={["You approve", "every purchase"]} tilt={-2} outAt={cue("s3", "then") - 6} />, "t3")}
      {At("s4", <Sticker lines={["The shop never gets", "your real card"]} tilt={2} top={190} />, "t4")}
      {At("s5", <Sticker lines={["What you keep"]} tilt={-3} />, "t5")}
      {At("s7", <Sticker small="Own an online shop?" lines={[<>Comment &ldquo;WALLET&rdquo;</>]} tilt={-2} />, "t7")}
      <Sequence from={END_FROM} layout="none">
        <EndCard />
      </Sequence>
      <Captions />
      <Sequence from={timing.lead_in} layout="none">
        <Audio src={staticFile("vo/wallet/vo.mp3")} />
      </Sequence>
      {SOUND.map((s, i) => (
        <Sfx key={i} {...s} />
      ))}
    </AbsoluteFill>
  );
};
