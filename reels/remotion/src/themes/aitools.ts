// AI tools page theme: yellow + ink black, from the page's speech-bubble "AI" logo.
// Use only for this page's reels. Never mix with the Zenfest or 64 Sqft themes.
import { Easing } from "remotion";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

export const C = {
  yellow: "#FFD400",
  ink: "#141518",
  bg: "#0D0E11",
  panel: "#1A1C21",
  panel2: "#24272E",
  line: "rgba(255,255,255,0.09)",
  white: "#FFFFFF",
  grey: "#A3A8B3",
  dim: "#5D626D",
  red: "#FF4D4D",
  green: "#3DDC84",
};

export const F = {
  head: loadAnton("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily,
  body: loadInter("normal", { weights: ["500", "600", "700", "800", "900"], subsets: ["latin"] }).fontFamily,
  mono: "Consolas, 'Courier New', monospace",
};

// Instagram safe zones on 1080 x 1920.
export const SAFE = { top: 220, bottom: 420, left: 90, right: 120 };

export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN = Easing.bezier(0.7, 0, 0.84, 0);
