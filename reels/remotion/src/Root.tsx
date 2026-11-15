import { Composition } from "remotion";
import { AITOOLS_TOTAL, FiveFreeTools } from "./reels/aitools/FiveFreeTools";
import { ChatGPTWallet, ChatGPTWalletCover, WALLET_TOTAL } from "./reels/wallet/ChatGPTWallet";
import { PHOTO3D_TOTAL, PhotoTo3D, PhotoTo3DCover } from "./reels/photo3d/PhotoTo3D";

// One <Composition> line per reel. Add a new line here for every new reel.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="AiToolsFiveFree" component={FiveFreeTools} durationInFrames={AITOOLS_TOTAL} fps={30} width={1080} height={1920} />
      <Composition id="ChatGPTWallet" component={ChatGPTWallet} durationInFrames={WALLET_TOTAL} fps={30} width={1080} height={1920} />
      <Composition id="ChatGPTWalletCover" component={ChatGPTWalletCover} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="PhotoTo3D" component={PhotoTo3D} durationInFrames={PHOTO3D_TOTAL} fps={30} width={1080} height={1920} />
      <Composition id="PhotoTo3DCover" component={PhotoTo3DCover} durationInFrames={1} fps={30} width={1080} height={1920} />
    </>
  );
};
