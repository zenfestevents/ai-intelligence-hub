import { C, F } from "./aitools";

// The page logo: yellow circle, black speech bubble with "AI", tail at bottom-left touching the edge.
export const AiLogo: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" style={{ display: "block" }}>
    <circle cx="100" cy="100" r="100" fill={C.yellow} />
    <path
      d="M20 56 a19.6 19.6 0 0 1 19.6 -19.6 H164 a19.6 19.6 0 0 1 19.6 19.6 V129.2 a19.6 19.6 0 0 1 -19.6 19.6 H84.3 L43.4 181.4 L51 148.8 H39.6 a19.6 19.6 0 0 1 -19.6 -19.6 Z"
      fill={C.ink}
    />
    <text x="101" y="119" textAnchor="middle" fontFamily={F.body} fontWeight={700} fontSize="74" fill={C.yellow}>
      AI
    </text>
  </svg>
);
