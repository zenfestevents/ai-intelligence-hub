import { AbsoluteFill } from "remotion";
import { C, F } from "../themes/aitools";
import { AiLogo } from "../themes/AiToolsBrand";

// YouTube channel art for "AI in Plain English". Rendered as stills:
//   npx remotion still src/index.ts ChannelLogo   ../output/brand/channel_logo.png
//   npx remotion still src/index.ts ChannelBanner ../output/brand/channel_banner.png

// Profile picture: the page logo filling the frame (YouTube crops it to a circle).
export const ChannelLogo: React.FC = () => (
  <AbsoluteFill>
    <AiLogo size={800} />
  </AbsoluteFill>
);

// Banner, 2560 x 1440. Everything that matters sits in YouTube's "safe on all devices"
// box (1546 x 423, centred); outside it is only background texture, cropped on phones.
const W = 2560;
const H = 1440;
const SAFE_W = 1546;
const SAFE_H = 423;
const SX = (W - SAFE_W) / 2; // 507
const SY = (H - SAFE_H) / 2; // 508.5

// Faint speech bubbles scattered in the outer area (TV / desktop only).
const BUBBLES: { x: number; y: number; s: number; r: number }[] = [
  { x: 140, y: 170, s: 220, r: -10 },
  { x: 2230, y: 140, s: 180, r: 12 },
  { x: 90, y: 1080, s: 260, r: 8 },
  { x: 2150, y: 1060, s: 300, r: -8 },
  { x: 700, y: 110, s: 120, r: 6 },
  { x: 1700, y: 1210, s: 140, r: -6 },
  { x: 1500, y: 90, s: 100, r: -14 },
  { x: 560, y: 1230, s: 110, r: 14 },
];

const Bubble: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size * 0.8} viewBox="0 0 200 160">
    <path
      d="M10 30 a20 20 0 0 1 20 -20 H170 a20 20 0 0 1 20 20 V100 a20 20 0 0 1 -20 20 H75 L35 152 L42 120 H30 a20 20 0 0 1 -20 -20 Z"
      fill="none"
      stroke={C.yellow}
      strokeWidth={6}
    />
  </svg>
);

export const ChannelBanner: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
    {/* dot grid */}
    <AbsoluteFill
      style={{
        backgroundImage: `radial-gradient(${C.line} 2px, transparent 2.5px)`,
        backgroundSize: "44px 44px",
      }}
    />
    {/* soft yellow glow behind the logo */}
    <div
      style={{
        position: "absolute",
        left: SX - 260,
        top: H / 2 - 520,
        width: 1040,
        height: 1040,
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(255,212,0,0.16) 0%, rgba(255,212,0,0) 62%)`,
      }}
    />
    {BUBBLES.map((b, i) => (
      <div key={i} style={{ position: "absolute", left: b.x, top: b.y, opacity: 0.1, transform: `rotate(${b.r}deg)` }}>
        <Bubble size={b.s} />
      </div>
    ))}

    {/* safe area content */}
    <div
      style={{
        position: "absolute",
        left: SX,
        top: SY,
        width: SAFE_W,
        height: SAFE_H,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 60,
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <AiLogo size={330} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontFamily: F.head, fontSize: 140, lineHeight: 1, color: C.white, letterSpacing: 1, whiteSpace: "nowrap" }}>
          AI IN <span style={{ color: C.yellow }}>PLAIN</span> ENGLISH
        </div>
        <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 44, color: C.grey, whiteSpace: "nowrap" }}>
          AI news, tools and how-tos, explained simply.
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 14 }}>
          {["New Shorts daily", "Free tools", "No jargon"].map((t) => (
            <div
              key={t}
              style={{
                fontFamily: F.body,
                fontWeight: 800,
                fontSize: 34,
                color: C.ink,
                background: C.yellow,
                padding: "10px 26px",
                borderRadius: 999,
                whiteSpace: "nowrap",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  </AbsoluteFill>
);

// Debug overlay: the banner with YouTube's safe box outlined, to check nothing important falls outside.
export const ChannelBannerGuides: React.FC = () => (
  <AbsoluteFill>
    <ChannelBanner />
    <div style={{ position: "absolute", left: SX, top: SY, width: SAFE_W, height: SAFE_H, outline: "4px dashed #FF4D4D" }} />
    <div style={{ position: "absolute", left: 0, top: (H - 1152) / 2 - 0, width: W, height: 1152, outline: "4px dashed #3DDC84" }} />
  </AbsoluteFill>
);
