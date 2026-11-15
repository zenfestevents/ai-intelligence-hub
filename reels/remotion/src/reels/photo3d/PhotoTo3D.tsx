import React from "react";
import { AbsoluteFill, Audio, interpolate, random, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ArrowRight, BookmarkSimple, GraphicsCard, Hammer, Memory, PushPin, Timer } from "@phosphor-icons/react";
import timing from "../photo3d-timing.json";
import { C, EASE_OUT, F } from "../../themes/aitools";
import { AiLogo } from "../../themes/AiToolsBrand";

// Reel: "One photo → a full 3D model" (Idol). Facts: strategy/posts_2026-11-14.md, Post 2 (re-checked 15 Nov 2026).
// Style: "3D depth". The star is a cloud of glowing dots in real 3D perspective (our own drawing of what a
// Gaussian splat looks like, not real Idol output). Dots burst and re-form between scenes; headlines sit on
// tilted glass sheets; captions flip up one word at a time. Brand names are plain text only, no logos.
export const PHOTO3D_TOTAL = timing.total;
const FPS = timing.fps;
type Seg = (typeof timing.segments)[number];
const SEG: Record<string, Seg> = Object.fromEntries(timing.segments.map((s) => [s.id, s]));
const IDS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7"];
const END_FROM = timing.speech_end + 8;

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9']/g, "");
const cueAbs = (id: string, key: string, nth = 0) => {
  const words = SEG[id].words;
  let hits = words.filter((w) => norm(w.text) === key);
  if (!hits.length) hits = words.filter((w) => norm(w.text).startsWith(key));
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
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const usePop = (at: number, damping = 11) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping, stiffness: 170, mass: 0.7 } });
};

/* ---------- geometry: every shape is N points in object space (y up, +z away from camera) ---------- */

const N = 1500;
type Box = [number, number, number, number, number, number]; // x0 x1 y0 y1 z0 z1

const CHAIR_PARTS: { b: Box; c: string; top: string }[] = [
  ...[-1, 1].flatMap((sx) =>
    [-1, 1].map((sz) => ({ b: [sx < 0 ? -0.5 : 0.42, sx < 0 ? -0.42 : 0.5, -0.9, -0.02, sz < 0 ? -0.5 : 0.42, sz < 0 ? -0.42 : 0.5] as Box, c: "#8E5A2E", top: "#A86C3A" })),
  ),
  { b: [-0.5, 0.5, -0.02, 0.08, -0.5, 0.5], c: "#B97B43", top: "#E2AA6C" },
  { b: [-0.5, -0.42, 0.08, 1.0, 0.42, 0.5], c: "#9E6535", top: "#C48A52" },
  { b: [0.42, 0.5, 0.08, 1.0, 0.42, 0.5], c: "#9E6535", top: "#C48A52" },
  { b: [-0.5, 0.5, 0.8, 1.0, 0.42, 0.5], c: "#B07240", top: "#D9A066" },
  ...[-0.2, 0, 0.2].map((x) => ({ b: [x - 0.04, x + 0.04, 0.08, 0.8, 0.44, 0.48] as Box, c: "#A66B39", top: "#C48A52" })),
];

const sampleBoxes = (boxes: Box[], n: number, seed: string) => {
  const out = new Float32Array(n * 3);
  const areas = boxes.map(([x0, x1, y0, y1, z0, z1]) => {
    const a = x1 - x0, b = y1 - y0, c = z1 - z0;
    return [b * c, b * c, a * c, a * c, a * b, a * b];
  });
  const total = areas.flat().reduce((s, v) => s + v, 0);
  for (let i = 0; i < n; i++) {
    let r = random(`${seed}-pick-${i}`) * total;
    let bi = 0, fi = 0;
    outer: for (bi = 0; bi < boxes.length; bi++) {
      for (fi = 0; fi < 6; fi++) {
        r -= areas[bi][fi];
        if (r <= 0) break outer;
      }
    }
    bi = Math.min(bi, boxes.length - 1);
    fi = Math.min(fi, 5);
    const [x0, x1, y0, y1, z0, z1] = boxes[bi];
    const u = random(`${seed}-u-${i}`), v = random(`${seed}-v-${i}`);
    let x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * v, z = z0 + (z1 - z0) * random(`${seed}-w-${i}`);
    if (fi === 0) x = x0;
    else if (fi === 1) x = x1;
    else if (fi === 2) { y = y0; z = z0 + (z1 - z0) * v; }
    else if (fi === 3) { y = y1; z = z0 + (z1 - z0) * v; }
    else if (fi === 4) { z = z0; }
    else z = z1;
    if (fi <= 1) { y = y0 + (y1 - y0) * u; z = z0 + (z1 - z0) * v; }
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
  return out;
};

const MUG_X = -0.2; // shifts the mug so body + handle sit centred
const MUG_R = 0.45;
const HANDLE = { cx: 0.5 + MUG_X, R: 0.25, r: 0.07, a: (100 * Math.PI) / 180 };
const sampleMug = (n: number) => {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const k = random(`mug-k-${i}`), u = random(`mug-u-${i}`), v = random(`mug-v-${i}`);
    let x = 0, y = 0, z = 0;
    if (k < 0.6) {
      const t = u * Math.PI * 2;
      x = Math.cos(t) * MUG_R; z = Math.sin(t) * MUG_R; y = -0.5 + v;
    } else if (k < 0.7) {
      const t = u * Math.PI * 2;
      x = Math.cos(t) * (MUG_R - 0.05); z = Math.sin(t) * (MUG_R - 0.05); y = -0.4 + v * 0.9;
    } else if (k < 0.78) {
      const t = u * Math.PI * 2, rr = Math.sqrt(v) * MUG_R;
      x = Math.cos(t) * rr; z = Math.sin(t) * rr; y = -0.5;
    } else {
      const t = -HANDLE.a + u * 2 * HANDLE.a, p = v * Math.PI * 2;
      const rr = HANDLE.R + Math.cos(p) * HANDLE.r;
      x = HANDLE.cx - MUG_X + Math.cos(t) * rr; y = Math.sin(t) * rr; z = Math.sin(p) * HANDLE.r;
    }
    out[i * 3] = x + MUG_X;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
  return out;
};

const GLYPH: Record<string, string[]> = {
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
};
const CELL = 1.9 / 7;
const textCols = (word: string) => word.length * 6 - 1;
const sampleText = (word: string, n: number) => {
  const cells: [number, number][] = [];
  word.split("").forEach((ch, li) => GLYPH[ch].forEach((row, r) => row.split("").forEach((c, col) => c === "#" && cells.push([li * 6 + col, r]))));
  const W = textCols(word);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const [col, row] = cells[Math.floor(random(`txt-${word}-c-${i}`) * cells.length)];
    out[i * 3] = (col + 0.06 + 0.88 * random(`txt-${word}-u-${i}`) - W / 2) * CELL;
    out[i * 3 + 1] = (3.5 - row - 0.06 - 0.88 * random(`txt-${word}-v-${i}`)) * CELL;
    out[i * 3 + 2] = (random(`txt-${word}-w-${i}`) - 0.5) * 0.22;
  }
  return out;
};

type Rot = { ry: number; tilt: number };
// rotate about Y, then tilt about X (positive tilt = looking down from above)
const rotate = (x: number, y: number, z: number, r: Rot) => {
  const x1 = x * Math.cos(r.ry) + z * Math.sin(r.ry);
  const z1 = -x * Math.sin(r.ry) + z * Math.cos(r.ry);
  return { x: x1, y: y * Math.cos(r.tilt) + z1 * Math.sin(r.tilt), z: -y * Math.sin(r.tilt) + z1 * Math.cos(r.tilt) };
};
const unrotate = (x: number, y: number, z: number, r: Rot) => {
  const y1 = y * Math.cos(r.tilt) - z * Math.sin(r.tilt);
  const z1 = y * Math.sin(r.tilt) + z * Math.cos(r.tilt);
  return { x: x * Math.cos(r.ry) - z1 * Math.sin(r.ry), y: y1, z: x * Math.sin(r.ry) + z1 * Math.cos(r.ry) };
};
// The same points squashed onto the view plane: seen at rotation r, they look exactly like a flat photo.
const flatten = (pts: Float32Array, r: Rot) => {
  const out = new Float32Array(pts.length);
  for (let i = 0; i < pts.length; i += 3) {
    const p = rotate(pts[i], pts[i + 1], pts[i + 2], r);
    const q = unrotate(p.x, p.y, 0, r);
    out[i] = q.x; out[i + 1] = q.y; out[i + 2] = q.z;
  }
  return out;
};

const CHAIR_ROT: Rot = { ry: 0.7, tilt: 0.3 };
const MUG_ROT: Rot = { ry: 0, tilt: 0.22 };
const CHAIR = sampleBoxes(CHAIR_PARTS.map((p) => p.b), N, "chair");
const FLAT_CHAIR = flatten(CHAIR, CHAIR_ROT);
const MUG = sampleMug(N);
const FLAT_MUG = flatten(MUG, MUG_ROT);
const IDOL = sampleText("IDOL", N);
const THREE_D = sampleText("3D", N);
const BLOCK_N = 900;
const BLOCK = sampleBoxes([[-0.58, 0.58, -0.95, 1.05, -0.58, 0.58]], BLOCK_N, "block");

const BURST = new Float32Array(N * 3);
const SIZE = new Float32Array(N);
const PHASE = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const th = random(`b-th-${i}`) * Math.PI * 2, ph = Math.acos(2 * random(`b-ph-${i}`) - 1), m = 0.6 + random(`b-m-${i}`);
  BURST[i * 3] = Math.sin(ph) * Math.cos(th) * m;
  BURST[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * m;
  BURST[i * 3 + 2] = Math.cos(ph) * m;
  SIZE[i] = 0.7 + random(`b-s-${i}`) * 0.6;
  PHASE[i] = random(`b-p-${i}`) * Math.PI * 2;
}
const MUG_BACK = Array.from({ length: N }, (_, i) => MUG[i * 3 + 2] > 0.04);
const CHAIR_YN = Array.from({ length: N }, (_, i) => (CHAIR[i * 3 + 1] + 0.9) / 1.9);

/* ---------- dot-cloud renderer ---------- */

const DEPTH = 4;
type View = { cx: number; cy: number; s: number; op: number };

const Cloud: React.FC<{ pts: Float32Array; view: View; rot: Rot; alpha?: (i: number) => number; hot?: (i: number) => number; dot?: number }> = ({ pts, view, rot, alpha, hot, dot = 3.6 }) => {
  const frame = useCurrentFrame();
  if (view.op <= 0.01) return null;
  const n = pts.length / 3;
  const items: { x: number; y: number; z: number; r: number; a: number; fill: string }[] = [];
  const sizeK = Math.sqrt(view.s / 300);
  for (let i = 0; i < n; i++) {
    const a0 = view.op * (alpha ? alpha(i) : 1);
    if (a0 < 0.02) continue;
    const p = rotate(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2], rot);
    const k = DEPTH / (DEPTH + p.z);
    const h = hot ? hot(i) : 0;
    const near = clamp01((0.9 - p.z) / 1.8);
    const g = Math.round(185 + 70 * near - 30 * h * (1 - near));
    const b = Math.round((40 + 200 * near * near) * (1 - h));
    const tw = 0.78 + 0.22 * Math.sin(frame * 0.22 + PHASE[i % N]);
    items.push({
      x: view.cx + view.s * p.x * k,
      y: view.cy - view.s * p.y * k,
      z: p.z,
      r: dot * SIZE[i % N] * k * sizeK * (1 + 0.3 * h),
      a: a0 * tw * (0.55 + 0.45 * near),
      fill: `rgb(255,${g},${b})`,
    });
  }
  items.sort((p, q) => q.z - p.z);
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, filter: "drop-shadow(0 0 7px rgba(255,212,0,0.55))" }}>
      {items.map((d, i) => (
        <circle key={i} cx={d.x.toFixed(1)} cy={d.y.toFixed(1)} r={d.r.toFixed(2)} fill={d.fill} opacity={d.a.toFixed(3)} />
      ))}
    </svg>
  );
};

/* ---------- main cloud timeline ---------- */

const M1 = cueAbs("s1", "3d");
const MUG_ON = cueAbs("s3", "3d");
const S4 = span("s4").from;
const S5 = span("s5").from;
const S6 = span("s6").from;
const S7 = span("s7").from;
const CARVE_A = cueAbs("s4", "carves") - 4;
const CARVE_B = cueAbs("s4", "correctly");
const CHAIR_CY = 900;
const MUG_CY = 870;

type Key = { f: number; d: number; shape?: Float32Array; burst?: number; cx?: number; cy?: number; s?: number; op?: number };
type Full = Required<Key>;
const resolveKeys = (keys: Key[]): Full[] => {
  const out: Full[] = [];
  for (const k of keys) {
    const prev = out[out.length - 1];
    out.push({ ...(prev ?? {}), burst: 0, ...k } as Full);
  }
  return out;
};
const MAIN: Full[] = resolveKeys([
  { f: 0, d: 1, shape: FLAT_CHAIR, cx: 540, cy: CHAIR_CY, s: 300, op: 0 },
  { f: M1 - 2, d: 8, op: 1 },
  { f: M1 + 4, d: 22, shape: CHAIR, burst: 0.25 },
  { f: span("s2").from, d: 24, shape: IDOL, cx: 540, cy: 760, s: 880 / (textCols("IDOL") * CELL), burst: 1.2 },
  { f: span("s3").from, d: 18, shape: FLAT_MUG, cx: 540, cy: MUG_CY, s: 380, op: 0, burst: 2.5 },
  { f: MUG_ON - 2, d: 6, op: 1 },
  { f: MUG_ON + 4, d: 18, shape: MUG, burst: 0.2 },
  { f: S4, d: 14, shape: CHAIR, cx: 620, cy: 920, s: 280, op: 0, burst: 1.5 },
  { f: CARVE_A, d: 1, op: 1 },
  { f: S5, d: 22, cx: 540, cy: 860, s: 330, op: 0.28 },
  { f: S6, d: 20, cx: 290, cy: 830, s: 190, op: 1 },
  { f: S7, d: 24, shape: THREE_D, cx: 540, cy: 720, s: 770 / (textCols("3D") * CELL), burst: 1.3 },
  { f: END_FROM - 6, d: 14, op: 0, burst: 3 },
]);
const mainAt = (t: number) => {
  let cur = MAIN[0];
  for (let j = 1; j < MAIN.length; j++) {
    const k = MAIN[j];
    if (t < k.f) break;
    const p = ease(t, k.f, k.f + k.d);
    if (p < 1) {
      const pts = new Float32Array(N * 3);
      const b = k.burst * Math.sin(Math.PI * p);
      for (let i = 0; i < N * 3; i++) pts[i] = cur.shape[i] + (k.shape[i] - cur.shape[i]) * p + BURST[i] * b;
      const l = (a: number, z: number) => a + (z - a) * p;
      return { pts, view: { cx: l(cur.cx, k.cx), cy: l(cur.cy, k.cy), s: l(cur.s, k.s), op: l(cur.op, k.op) } };
    }
    cur = k;
  }
  return { pts: cur.shape, view: { cx: cur.cx, cy: cur.cy, s: cur.s, op: cur.op } };
};

const sway = (t: number): Rot => ({ ry: 0.24 * Math.sin(t * 0.06), tilt: 0.12 });
const ROT_KEYS: { f: number; d: number; fn: (t: number) => Rot }[] = [
  { f: 0, d: 1, fn: () => CHAIR_ROT },
  { f: M1 + 4, d: 24, fn: (t) => ({ ry: CHAIR_ROT.ry + 0.03 * (t - M1 - 4), tilt: CHAIR_ROT.tilt }) },
  { f: span("s2").from, d: 22, fn: sway },
  { f: span("s3").from, d: 10, fn: () => MUG_ROT },
  { f: cueAbs("s3", "even") - 4, d: 34, fn: () => ({ ry: Math.PI * 0.92, tilt: MUG_ROT.tilt }) },
  { f: S4, d: 16, fn: (t) => ({ ry: 0.6 + 0.045 * (t - S4), tilt: 0.28 }) },
  { f: S5, d: 20, fn: (t) => ({ ry: 0.5 + 0.012 * (t - S5), tilt: 0.25 }) },
  { f: S6, d: 20, fn: (t) => ({ ry: 0.6 + 0.02 * (t - S6), tilt: 0.25 }) },
  { f: S7, d: 22, fn: sway },
];
const lerpAngle = (a: number, b: number, p: number) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * p;
};
const rotAt = (t: number): Rot => {
  let cur = ROT_KEYS[0];
  for (let j = 1; j < ROT_KEYS.length; j++) {
    const k = ROT_KEYS[j];
    if (t < k.f) break;
    const p = ease(t, k.f, k.f + k.d);
    if (p < 1) {
      const a = cur.fn(t), b = k.fn(t);
      return { ry: lerpAngle(a.ry, b.ry, p), tilt: a.tilt + (b.tilt - a.tilt) * p };
    }
    cur = k;
  }
  return cur.fn(t);
};

const carveC = (t: number) => interpolate(t, [CARVE_A, CARVE_B], [0, 1], clamp);

const MainCloud: React.FC = () => {
  const frame = useCurrentFrame();
  const { pts, view } = mainAt(frame);
  const rot = rotAt(frame);
  let alpha: ((i: number) => number) | undefined;
  let hot: ((i: number) => number) | undefined;
  if (frame >= MUG_ON - 2 && frame < S4 + 4) {
    // The back of the mug is missing until Idol "fills it in", then lights up yellow.
    const fill = ease(frame, cueAbs("s3", "back"), cueAbs("s3", "never") + 8);
    alpha = (i) => (MUG_BACK[i] ? fill : 1);
    hot = (i) => (MUG_BACK[i] ? fill : 0);
  } else if (frame >= S4 + 4 && frame < S5) {
    const c = carveC(frame);
    alpha = (i) => clamp01((c * 1.3 - (1 - CHAIR_YN[i])) / 0.3);
  }
  return <Cloud pts={pts} view={view} rot={rot} alpha={alpha} hot={hot} />;
};

// Scene 4: a block of dots that falls away, top to bottom, as the chair is carved out of it.
const BlockCloud: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < S4 || frame >= S5) return null;
  const c = carveC(frame);
  const appear = ease(frame, S4 + 2, S4 + 18);
  const pts = new Float32Array(BLOCK_N * 3);
  const al = new Float32Array(BLOCK_N);
  for (let i = 0; i < BLOCK_N; i++) {
    const yn = (BLOCK[i * 3 + 1] + 0.95) / 2;
    const passAt = CARVE_A + ((1.15 - yn) / 1.3) * (CARVE_B - CARVE_A);
    const dt = Math.max(0, frame - passAt);
    const spread = 1 + dt * 0.02;
    pts[i * 3] = BLOCK[i * 3] * spread + BURST[i * 3] * (1 - appear) * 2;
    pts[i * 3 + 1] = BLOCK[i * 3 + 1] - 0.0016 * dt * dt + BURST[i * 3 + 1] * (1 - appear) * 2;
    pts[i * 3 + 2] = BLOCK[i * 3 + 2] * spread + BURST[i * 3 + 2] * (1 - appear) * 2;
    al[i] = c > 0 || frame > CARVE_A ? clamp01(1 - dt / 16) : 1;
  }
  const out = ease(frame, S5 - 8, S5);
  return <Cloud pts={pts} view={{ cx: 620, cy: 920, s: 280, op: appear * 0.85 * (1 - out) }} rot={rotAt(frame)} alpha={(i) => al[i]} dot={3.2} />;
};

const Chisel: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < CARVE_A - 6 || frame > CARVE_B + 12) return null;
  const c = carveC(frame);
  const ynLine = 1.15 - 1.3 * c;
  const y = 920 - 280 * (-0.9 + 1.9 * clamp01(ynLine)) * Math.cos(0.28);
  const op = ease(frame, CARVE_A - 6, CARVE_A) * (1 - ease(frame, CARVE_B, CARVE_B + 12));
  return (
    <div style={{ position: "absolute", left: 855, top: y - 50, opacity: op, transform: `rotate(${-30 + 25 * Math.sin(frame * 0.9)}deg)`, transformOrigin: "20% 80%" }}>
      <Hammer size={100} weight="fill" color={C.yellow} />
    </div>
  );
};

// Scene 6: the Budget3D chair on the right.
const BudgetCloud: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < S6 || frame > S7 + 14) return null;
  const at = cueAbs("s6", "budget3d");
  const on = ease(frame, at - 2, at + 14);
  const off = ease(frame, S7 - 2, S7 + 12);
  const pts = new Float32Array(N * 3);
  for (let i = 0; i < N * 3; i++) pts[i] = CHAIR[i] + BURST[i] * ((1 - on) * 1.6 + off * 3);
  return <Cloud pts={pts} view={{ cx: 790, cy: 830, s: 190, op: on * (1 - off) }} rot={rotAt(frame)} />;
};

/* ---------- flat "photo" drawings, built from the same geometry so the dots line up exactly ---------- */

const hull = (ps: { x: number; y: number }[]) => {
  const p = [...ps].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: typeof p = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: typeof p = [];
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
};
const poly = (ps: { x: number; y: number }[]) => ps.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ");

const ChairArt: React.FC<{ cx: number; cy: number; s: number }> = ({ cx, cy, s }) => {
  const pr = (x: number, y: number, z: number) => {
    const p = rotate(x, y, z, CHAIR_ROT);
    return { x: cx + s * p.x, y: cy - s * p.y, z: p.z };
  };
  const parts = CHAIR_PARTS.map(({ b: [x0, x1, y0, y1, z0, z1], c, top }) => {
    const corners = [x0, x1].flatMap((x) => [y0, y1].flatMap((y) => [z0, z1].map((z) => pr(x, y, z))));
    const depth = corners.reduce((a, q) => a + q.z, 0) / 8;
    return { depth, c, top, sil: hull(corners), lid: [pr(x0, y1, z0), pr(x1, y1, z0), pr(x1, y1, z1), pr(x0, y1, z1)] };
  }).sort((a, b) => b.depth - a.depth);
  return (
    <>
      <ellipse cx={cx} cy={cy + s * 0.95} rx={s * 0.7} ry={s * 0.12} fill="rgba(60,40,20,0.18)" />
      {parts.map((p, i) => (
        <g key={i}>
          <polygon points={poly(p.sil)} fill={p.c} stroke="#5E3A1C" strokeWidth={2} strokeLinejoin="round" />
          <polygon points={poly(p.lid)} fill={p.top} />
        </g>
      ))}
    </>
  );
};

const MugArt: React.FC<{ cx: number; cy: number; s: number }> = ({ cx, cy, s }) => {
  const a = MUG_ROT.tilt;
  const bx = cx + s * MUG_X;
  const rx = s * MUG_R, ry = s * MUG_R * Math.sin(a);
  const topY = cy - s * 0.5 * Math.cos(a), botY = cy + s * 0.5 * Math.cos(a);
  const handle = Array.from({ length: 25 }, (_, i) => {
    const t = -HANDLE.a + (i / 24) * 2 * HANDLE.a;
    return `${(cx + s * (HANDLE.cx + Math.cos(t) * HANDLE.R)).toFixed(1)},${(cy - s * Math.sin(t) * HANDLE.R * Math.cos(a)).toFixed(1)}`;
  }).join(" ");
  return (
    <>
      <ellipse cx={bx + s * 0.1} cy={botY + ry * 0.6} rx={rx * 1.35} ry={ry * 1.1} fill="rgba(40,30,20,0.2)" />
      <polyline points={handle} fill="none" stroke="#C2421F" strokeWidth={s * HANDLE.r * 2} strokeLinecap="round" />
      <path d={`M ${bx - rx} ${topY} L ${bx - rx} ${botY} A ${rx} ${ry} 0 0 0 ${bx + rx} ${botY} L ${bx + rx} ${topY} Z`} fill="#E4572E" />
      <path d={`M ${bx - rx * 0.62} ${topY + 20} L ${bx - rx * 0.62} ${botY - 6}`} stroke="rgba(255,255,255,0.28)" strokeWidth={s * 0.07} strokeLinecap="round" />
      <ellipse cx={bx} cy={topY} rx={rx} ry={ry} fill="#F07A55" />
      <ellipse cx={bx} cy={topY + 2} rx={rx * 0.89} ry={ry * 0.85} fill="#7A2A14" />
    </>
  );
};

/* ---------- shared bits ---------- */

const STARS = Array.from({ length: 170 }, (_, i) => ({ x: (random(`st-x-${i}`) - 0.5) * 3.4, y: (random(`st-y-${i}`) - 0.5) * 5.6, z: random(`st-z-${i}`) * 4 }));
const travel = (t: number) => t * 0.006 + SPANS.slice(1).reduce((a, s) => a + 0.9 * ease(t, s.from - 6, s.from + 16), 0) + 1.2 * ease(t, END_FROM - 6, END_FROM + 14);

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const tr = travel(frame);
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "radial-gradient(circle 620px at 540px 860px, rgba(255,212,0,0.13), transparent 75%)" }} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {STARS.map((st, i) => {
          const z = ((((st.z - tr) % 4) + 4) % 4) + 0.25;
          const k = 1 / z;
          const x = 540 + st.x * k * 330, y = 960 + st.y * k * 330;
          if (x < -10 || x > 1090 || y < -10 || y > 1930) return null;
          return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={(1.1 * k + 0.4).toFixed(2)} fill={i % 5 === 0 ? C.yellow : C.white} opacity={Math.min(0.55, 0.12 + k * 0.18)} />;
        })}
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.7))" }} />
    </AbsoluteFill>
  );
};

// Each scene's layer: comes from deep in the scene, then flies past the camera as the next scene arrives.
const Layer: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const enter = ease(frame, 0, 14);
  const exit = ease(frame, dur - 8, dur + 8);
  return (
    <AbsoluteFill style={{ transform: `scale(${0.78 + 0.22 * enter + exit * 0.9})`, transformOrigin: "540px 880px", opacity: enter * (1 - exit) }}>
      {children}
    </AbsoluteFill>
  );
};

// A headline printed on a floating sheet of glass that swings in from flat.
const Glass: React.FC<{ at: number; top: number; tilt?: number; width?: number; dx?: number; children: React.ReactNode }> = ({ at, top, tilt = -10, width, dx = 0, children }) => {
  const frame = useCurrentFrame();
  const p = usePop(at, 13);
  if (frame < at - 1) return null;
  const float = Math.sin((frame + top) * 0.05) * 6;
  return (
    <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", justifyContent: "center", perspective: 1400 }}>
      <div
        style={{
          width,
          padding: "22px 42px 26px",
          borderRadius: 28,
          background: "linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04))",
          backdropFilter: "blur(14px)",
          border: "2px solid rgba(255,255,255,0.16)",
          borderLeft: `8px solid ${C.yellow}`,
          boxShadow: `0 40px 80px -30px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(255,212,0,0.25)`,
          transform: `translate(${dx}px, ${float}px) rotateX(${(1 - p) * 80}deg) rotateY(${tilt * p}deg)`,
          opacity: clamp01(p * 2),
          textAlign: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
};
const Head: React.FC<{ size?: number; children: React.ReactNode }> = ({ size = 84, children }) => (
  <div style={{ fontFamily: F.head, fontSize: size, lineHeight: 1.12, color: C.white, textTransform: "uppercase", whiteSpace: "nowrap" }}>{children}</div>
);
const Sub: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = C.grey }) => (
  <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 38, color, marginTop: 6, whiteSpace: "nowrap" }}>{children}</div>
);
const Y: React.FC<{ children: React.ReactNode }> = ({ children }) => <span style={{ color: C.yellow }}>{children}</span>;

const PhotoCard: React.FC<{ left: number; top: number; w: number; h: number; label?: string; children?: React.ReactNode; bg?: string }> = ({ left, top, w, h, label = "photo.jpg", children, bg = "#EFE6D6" }) => (
  <div style={{ position: "absolute", left, top, width: w, height: h, borderRadius: 26, background: "#FAFAF7", boxShadow: "0 50px 90px -30px rgba(0,0,0,0.85)" }}>
    <div style={{ position: "absolute", left: 16, top: 16, right: 16, bottom: 74, borderRadius: 16, background: bg, overflow: "hidden" }}>{children}</div>
    <div style={{ position: "absolute", left: 28, bottom: 20, fontFamily: F.body, fontWeight: 800, fontSize: 30, color: "#55585F" }}>{label}</div>
  </div>
);

/* ---------- scenes ---------- */

const CARD1 = { left: 260, top: 545, w: 560, h: 720 };
const S1Back: React.FC = () => {
  const frame = useCurrentFrame();
  const inP = usePop(2, 13);
  const m1 = cue("s1", "3d");
  const go = ease(frame, m1 - 2, m1 + 16);
  return (
    <AbsoluteFill style={{ perspective: 1600, perspectiveOrigin: "540px 900px" }}>
      <AbsoluteFill
        style={{
          transformOrigin: "540px 1265px",
          transform: `translateY(${(1 - inP) * 500}px) rotateX(${go * 70}deg) rotateZ(${(1 - inP) * -8}deg)`,
          opacity: clamp01(inP * 2) * (1 - go),
        }}
      >
        <PhotoCard {...CARD1} />
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, m1 - 2, m1 + 6) }}>
          <ChairArt cx={540} cy={CHAIR_CY} s={300} />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
const S1Front: React.FC = () => (
  <Glass at={4} top={250} tilt={-8}>
    <Head size={92}>
      1 photo <ArrowRight size={74} weight="bold" color={C.yellow} style={{ verticalAlign: "-6px" }} /> <Y>3D model</Y>
    </Head>
    <Sub>in about 20 seconds</Sub>
  </Glass>
);

const S2Front: React.FC = () => {
  const free = usePop(cue("s2", "free"), 9);
  return (
    <>
      <div style={{ position: "absolute", top: 470, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ padding: "6px 36px 10px", borderRadius: 50, background: C.yellow, fontFamily: F.head, fontSize: 72, color: C.ink, transform: `scale(${free}) rotate(-4deg)`, opacity: clamp01(free * 2) }}>FREE</div>
      </div>
      <Glass at={cue("s2", "top")} top={975} tilt={8}>
        <Head size={78}>
          Top 10 <Y>trending</Y>
        </Head>
        <Sub color={C.white}>on Hugging Face right now</Sub>
      </Glass>
    </>
  );
};

const CARD3 = { left: 240, top: 505, w: 600, h: 735 };
const CLUTTER: { x: number; y: number; w: number; h: number; c: string; r: number; round?: boolean }[] = [
  { x: 24, y: 30, w: 200, h: 150, c: "#9CC9E6", r: 4 },
  { x: 40, y: 50, w: 70, h: 110, c: "#CFE6F4", r: 4 },
  { x: 400, y: 40, w: 120, h: 40, c: "#E9C46A", r: 14 },
  { x: 445, y: 80, w: 30, h: 120, c: "#6B705C", r: 6 },
  { x: 30, y: 430, w: 64, h: 64, c: "#5B9E58", r: 32, round: true },
  { x: 70, y: 400, w: 70, h: 70, c: "#76B56E", r: 35, round: true },
  { x: 45, y: 480, w: 80, h: 90, c: "#A0522D", r: 10 },
  { x: 440, y: 470, w: 110, h: 30, c: "#2A9D8F", r: 4 },
  { x: 430, y: 500, w: 120, h: 32, c: "#E76F51", r: 4 },
  { x: 450, y: 532, w: 100, h: 30, c: "#264653", r: 4 },
  { x: -10, y: 560, w: 600, h: 110, c: "#B58863", r: 0 },
];
const S3Back: React.FC = () => {
  const frame = useCurrentFrame();
  const inP = usePop(2, 13);
  const rem = cue("s3", "removes");
  const on = cue("s3", "3d");
  const go = ease(frame, on - 2, on + 16);
  return (
    <AbsoluteFill style={{ perspective: 1600, perspectiveOrigin: "540px 900px" }}>
      <AbsoluteFill style={{ transformOrigin: "540px 1240px", transform: `translateY(${(1 - inP) * 500}px) rotateX(${go * 70}deg)`, opacity: clamp01(inP * 2) * (1 - go) }}>
        <PhotoCard {...CARD3} bg="#E8E2D6">
          {CLUTTER.map((c, i) => {
            const p = ease(frame, rem + i * 1.5, rem + i * 1.5 + 14);
            const dir = c.x < 250 ? -1 : 1;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: c.x,
                  top: c.y,
                  width: c.w,
                  height: c.h,
                  borderRadius: c.r,
                  background: c.c,
                  transform: `translate(${dir * p * 420}px, ${-p * 160 + p * p * 260}px) rotate(${dir * p * 70}deg)`,
                  opacity: 1 - p,
                }}
              />
            );
          })}
        </PhotoCard>
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, on - 2, on + 6) }}>
          <MugArt cx={540} cy={MUG_CY} s={380} />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
const S3Front: React.FC = () => (
  <Glass at={cue("s3", "even")} top={250} tilt={-8}>
    <Head size={76}>
      It builds <Y>the sides</Y>
    </Head>
    <Head size={76}>the photo never showed</Head>
  </Glass>
);

const S4Back: React.FC = () => {
  const p = usePop(cue("s4", "photo") - 4, 12);
  return (
    <div style={{ position: "absolute", left: 70, top: 540, width: 290, height: 360, transform: `rotate(-6deg) scale(${p})`, opacity: clamp01(p * 2) }}>
      <PhotoCard left={0} top={0} w={290} h={360} label="1 photo" />
      <svg width={290} height={360} style={{ position: "absolute", inset: 0 }}>
        <ChairArt cx={145} cy={138} s={118} />
      </svg>
      <div style={{ position: "absolute", left: 118, top: -40 }}>
        <PushPin size={64} weight="fill" color={C.red} />
      </div>
    </div>
  );
};
const S4Front: React.FC = () => (
  <Glass at={cue("s4", "sculptor")} top={250} tilt={8}>
    <Head size={76}>
      Like a <Y>sculptor</Y>
    </Head>
    <Head size={76}>working from one photo</Head>
  </Glass>
);

const SPEC: { key: string; icon: React.ReactNode; top: string; value: string; label: string; y: number; dx: number; tilt: number }[] = [
  { key: "nvidia", icon: <GraphicsCard size={104} weight="fill" color={C.yellow} />, top: "", value: "NVIDIA", label: "graphics card", y: 320, dx: -40, tilt: -12 },
  { key: "7gb", icon: <Memory size={104} weight="fill" color={C.yellow} />, top: "About", value: "7 GB", label: "of graphics memory", y: 610, dx: 40, tilt: 12 },
  { key: "20", icon: <Timer size={104} weight="fill" color={C.yellow} />, top: "About", value: "20 seconds", label: "on an RTX 4090", y: 900, dx: -40, tilt: -12 },
];
const S5Front: React.FC = () => (
  <>
    {SPEC.map((s) => (
      <Glass key={s.key} at={cue("s5", s.key) - 2} top={s.y} tilt={s.tilt} dx={s.dx} width={800}>
        <div style={{ display: "flex", alignItems: "center", gap: 34, textAlign: "left" }}>
          {s.icon}
          <div>
            {s.top ? <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 34, color: C.grey }}>{s.top}</div> : null}
            <div style={{ fontFamily: F.head, fontSize: 96, lineHeight: 1.05, color: C.white, textTransform: "uppercase", whiteSpace: "nowrap" }}>{s.value}</div>
            <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: 36, color: C.white, opacity: 0.85, whiteSpace: "nowrap" }}>{s.label}</div>
          </div>
        </div>
      </Glass>
    ))}
  </>
);

// Empty space around each chair: fine pieces for Idol, a few merged coarse pieces for Budget3D.
const SpaceGrid: React.FC<{ cx: number; step: number; r: number; at: number }> = ({ cx, step, r, at }) => {
  const frame = useCurrentFrame();
  const box = { x0: cx - 155, x1: cx + 155, y0: 600, y1: 1040 };
  const dots: { x: number; y: number; d: number }[] = [];
  for (let y = box.y0 + step / 2; y < box.y1; y += step) for (let x = box.x0 + step / 2; x < box.x1; x += step) dots.push({ x, y, d: (y - box.y0) / (box.y1 - box.y0) });
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <rect x={box.x0} y={box.y0} width={box.x1 - box.x0} height={box.y1 - box.y0} rx={18} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={2} strokeDasharray="10 10" opacity={ease(frame, at - 4, at + 6)} />
      {dots.map((d, i) => {
        const p = ease(frame, at + d.d * 10, at + d.d * 10 + 8);
        return <circle key={i} cx={d.x} cy={d.y} r={r * p} fill="#8A8F9A" opacity={0.45} />;
      })}
    </svg>
  );
};
const S6Back: React.FC = () => {
  const at = cue("s6", "empty");
  return (
    <>
      <SpaceGrid cx={290} step={20} r={2.6} at={at} />
      <SpaceGrid cx={790} step={78} r={15} at={at + 6} />
    </>
  );
};
const S6Front: React.FC = () => {
  const frame = useCurrentFrame();
  const l1 = ease(frame, 6, 18);
  const l2 = ease(frame, cue("s6", "budget3d"), cue("s6", "budget3d") + 12);
  const fast = usePop(cue("s6", "twice"), 9);
  const label = (x: number, op: number, text: React.ReactNode) => (
    <div style={{ position: "absolute", top: 1062, left: x - 250, width: 500, textAlign: "center", fontFamily: F.head, fontSize: 60, color: C.white, opacity: op, transform: `translateY(${(1 - op) * 30}px)` }}>{text}</div>
  );
  return (
    <>
      <Glass at={cue("s6", "budget3d")} top={250} tilt={-8}>
        <Head size={96}>
          Budget<Y>3D</Y>
        </Head>
        <Sub>unofficial · community · built on Idol</Sub>
      </Glass>
      {label(290, l1, "IDOL")}
      {label(790, l2, <>BUDGET<Y>3D</Y></>)}
      <div style={{ position: "absolute", top: 1170, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ padding: "8px 36px 12px", borderRadius: 24, background: C.yellow, fontFamily: F.head, fontSize: 68, color: C.ink, transform: `scale(${fast}) rotate(-3deg)`, opacity: clamp01(fast * 2), whiteSpace: "nowrap" }}>ABOUT TWICE AS FAST</div>
      </div>
    </>
  );
};

const S7Front: React.FC = () => (
  <Glass at={cue("s7", "comment") - 2} top={1010} tilt={-6}>
    <Head size={110}>
      Comment <Y>&ldquo;3D&rdquo;</Y>
    </Head>
    <Sub color={C.white}>get the links and setup steps</Sub>
  </Glass>
);

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

/* ---------- captions: one big word at a time, flipping up from below ---------- */

type Word = { text: string; start: number; end: number };
const WORDS: Word[] = timing.segments.flatMap((s) => s.words);
const KEY_WORDS = new Set(["photo", "3d", "model", "20", "idol", "free", "trending", "background", "back", "sculptor", "chair", "nvidia", "7gb", "budget3d", "unofficial", "empty", "twice", "comment"]);

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (frame >= END_FROM - 4) return null;
  let idx = -1;
  for (let i = 0; i < WORDS.length; i++) if (WORDS[i].start - 0.04 <= t) idx = i;
  if (idx < 0) return null;
  const w = WORDS[idx];
  const next = WORDS[idx + 1];
  const until = next ? Math.min(next.start - 0.04, w.end + 0.5) : w.end + 0.5;
  if (t >= until) return null;
  const flip = ease(frame, Math.round(w.start * FPS) - 2, Math.round(w.start * FPS) + 4);
  const hot = KEY_WORDS.has(norm(w.text));
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: 1380, height: 140, display: "flex", justifyContent: "center", alignItems: "center", perspective: 700 }}>
      <span
        style={{
          fontFamily: F.head,
          fontSize: 104,
          textTransform: "uppercase",
          color: hot ? C.yellow : C.white,
          textShadow: "0 6px 0 #000, 0 0 24px rgba(0,0,0,0.9)",
          transform: `rotateX(${(1 - flip) * -90}deg) translateY(${(1 - flip) * 30}px)`,
          transformOrigin: "50% 100%",
          display: "inline-block",
          whiteSpace: "nowrap",
        }}
      >
        {w.text.replace(/[,.:?]$/, "")}
      </span>
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
  { at: 6, src: "pop", volume: 0.3 },
  { at: M1, src: "ding", volume: 0.35 },
  ...SPANS.slice(1).map((s) => ({ at: s.from - 2, src: "whoosh", volume: 0.25 })),
  { at: cueAbs("s2", "free"), src: "pop", volume: 0.35 },
  { at: cueAbs("s2", "top"), src: "pop", volume: 0.3 },
  { at: cueAbs("s3", "removes"), src: "whoosh", volume: 0.25 },
  { at: MUG_ON, src: "ding", volume: 0.3 },
  { at: cueAbs("s3", "even"), src: "pop", volume: 0.3 },
  { at: cueAbs("s3", "back"), src: "ding", volume: 0.35 },
  { at: cueAbs("s4", "sculptor"), src: "pop", volume: 0.3 },
  ...[0, 1, 2, 3, 4].map((i) => ({ at: CARVE_A + Math.round(((CARVE_B - CARVE_A) * i) / 4), src: "click", volume: 0.4 })),
  ...SPEC.map((s) => ({ at: cueAbs("s5", s.key) - 2, src: "pop", volume: 0.32 })),
  { at: cueAbs("s6", "budget3d"), src: "ding", volume: 0.3 },
  { at: cueAbs("s6", "empty"), src: "whoosh", volume: 0.2 },
  { at: cueAbs("s6", "twice"), src: "impact", volume: 0.35 },
  { at: S7 + 10, src: "ding", volume: 0.3 },
  { at: cueAbs("s7", "comment") - 2, src: "click", volume: 0.5 },
  { at: END_FROM + 4, src: "impact", volume: 0.35 },
];

/* ---------- composition ---------- */

export const PhotoTo3D: React.FC = () => {
  const L = (id: string, node: React.ReactNode, key: string) => (
    <Sequence key={key} from={span(id).from} durationInFrames={span(id).dur + 10} layout="none">
      <Layer dur={span(id).dur}>{node}</Layer>
    </Sequence>
  );
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Background />
      {L("s1", <S1Back />, "b1")}
      {L("s3", <S3Back />, "b3")}
      {L("s4", <S4Back />, "b4")}
      {L("s6", <S6Back />, "b6")}
      <BlockCloud />
      <MainCloud />
      <BudgetCloud />
      <Chisel />
      {L("s1", <S1Front />, "f1")}
      {L("s2", <S2Front />, "f2")}
      {L("s3", <S3Front />, "f3")}
      {L("s4", <S4Front />, "f4")}
      {L("s5", <S5Front />, "f5")}
      {L("s6", <S6Front />, "f6")}
      {L("s7", <S7Front />, "f7")}
      <Sequence from={END_FROM} layout="none">
        <EndCard />
      </Sequence>
      <Captions />
      <Sequence from={timing.lead_in} layout="none">
        <Audio src={staticFile("vo/photo3d/vo.mp3")} />
      </Sequence>
      {SOUND.map((s, i) => (
        <Sfx key={i} {...s} />
      ))}
    </AbsoluteFill>
  );
};

/* ---------- cover (profile grid keeps only the middle 1080 x 1440, y 240-1680) ---------- */

export const PhotoTo3DCover: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <AbsoluteFill style={{ background: "radial-gradient(circle 560px at 760px 980px, rgba(255,212,0,0.2), transparent 75%)" }} />
    <div style={{ position: "absolute", top: 370, left: 0, right: 0, textAlign: "center" }}>
      <div style={{ fontFamily: F.head, fontSize: 150, lineHeight: 1.05, color: C.white }}>
        1 PHOTO <ArrowRight size={120} weight="bold" color={C.yellow} style={{ verticalAlign: "-10px" }} />
      </div>
      <div style={{ fontFamily: F.head, fontSize: 150, lineHeight: 1.05, color: C.yellow }}>3D MODEL</div>
    </div>
    <div style={{ position: "absolute", left: 70, top: 850, width: 380, height: 470, transform: "rotate(-5deg)" }}>
      <PhotoCard left={0} top={0} w={380} h={470} />
      <svg width={380} height={470} style={{ position: "absolute", inset: 0 }}>
        <ChairArt cx={190} cy={180} s={155} />
      </svg>
    </div>
    <Cloud pts={CHAIR} view={{ cx: 790, cy: 1080, s: 245, op: 1 }} rot={{ ry: 0.95, tilt: 0.3 }} dot={4} />
    <div style={{ position: "absolute", top: 1450, left: 0, right: 0, textAlign: "center", fontFamily: F.body, fontWeight: 800, fontSize: 50, color: C.white }}>
      Free · <span style={{ color: C.yellow }}>top 10</span> on Hugging Face
    </div>
  </AbsoluteFill>
);
