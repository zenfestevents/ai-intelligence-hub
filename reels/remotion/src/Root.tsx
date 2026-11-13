import { Composition } from "remotion";
import { AITOOLS_TOTAL, FiveFreeTools } from "./reels/aitools/FiveFreeTools";

// One <Composition> line per reel. Add a new line here for every new reel.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="AiToolsFiveFree" component={FiveFreeTools} durationInFrames={AITOOLS_TOTAL} fps={30} width={1080} height={1920} />
    </>
  );
};
