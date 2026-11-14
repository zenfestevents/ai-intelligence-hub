import { Composition } from "remotion";
import { AITOOLS_TOTAL, FiveFreeTools } from "./reels/aitools/FiveFreeTools";
import { ChatGPTWallet, WALLET_TOTAL } from "./reels/wallet/ChatGPTWallet";

// One <Composition> line per reel. Add a new line here for every new reel.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="AiToolsFiveFree" component={FiveFreeTools} durationInFrames={AITOOLS_TOTAL} fps={30} width={1080} height={1920} />
      <Composition id="ChatGPTWallet" component={ChatGPTWallet} durationInFrames={WALLET_TOTAL} fps={30} width={1080} height={1920} />
    </>
  );
};
