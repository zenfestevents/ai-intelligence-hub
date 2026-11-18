import { Composition } from "remotion";
import { AITOOLS_TOTAL, FiveFreeTools } from "./reels/aitools/FiveFreeTools";
import { ChatGPTWallet, ChatGPTWalletCover, WALLET_TOTAL } from "./reels/wallet/ChatGPTWallet";
import { JIO_TOTAL, JioAiPro, JioAiProCover } from "./reels/jio/JioAiPro";
import { MAPS_TOTAL, MapsTrip, MapsTripCover } from "./reels/maps/MapsTrip";
import { ABYSS_TOTAL, AbyssWorld, AbyssWorldCover } from "./reels/abyss/AbyssWorld";
import { PHOTO3D_TOTAL, PhotoTo3D, PhotoTo3DCover } from "./reels/photo3d/PhotoTo3D";
import { ChannelBanner, ChannelBannerGuides, ChannelLogo } from "./brand/ChannelArt";
import { FASTFRAMES_TOTAL, FastFrames, FastFramesCover } from "./reels/fastframes/FastFrames";
import { LONGCAT_TOTAL, LongCatAvatar, LongCatAvatarCover } from "./reels/longcat/LongCatAvatar";
import { CLAUDEINDIA_TOTAL, ClaudeIndia, ClaudeIndiaCover } from "./reels/claudeindia/ClaudeIndia";
import { GROKBOT_TOTAL, GrokBot, GrokBotCover } from "./reels/grokbot/GrokBot";
import { GEMINI_TOTAL, GeminiPrivacy, GeminiPrivacyCover } from "./reels/gemini/GeminiPrivacy";

// One <Composition> line per reel. Add a new line here for every new reel.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="AiToolsFiveFree" component={FiveFreeTools} durationInFrames={AITOOLS_TOTAL} fps={30} width={1080} height={1920} />
      <Composition id="ChatGPTWallet" component={ChatGPTWallet} durationInFrames={WALLET_TOTAL} fps={30} width={1080} height={1920} />
      <Composition id="ChatGPTWalletCover" component={ChatGPTWalletCover} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="PhotoTo3D" component={PhotoTo3D} durationInFrames={PHOTO3D_TOTAL} fps={30} width={1080} height={1920} />
      <Composition id="PhotoTo3DCover" component={PhotoTo3DCover} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="JioAiPro" component={JioAiPro} durationInFrames={JIO_TOTAL} fps={30} width={1080} height={1920} />
      <Composition id="JioAiProCover" component={JioAiProCover} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="MapsTrip" component={MapsTrip} durationInFrames={MAPS_TOTAL} fps={30} width={1080} height={1920} />
      <Composition id="MapsTripCover" component={MapsTripCover} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="AbyssWorld" component={AbyssWorld} durationInFrames={ABYSS_TOTAL} fps={30} width={1080} height={1920} />
      <Composition id="AbyssWorldCover" component={AbyssWorldCover} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="GeminiPrivacy" component={GeminiPrivacy} durationInFrames={GEMINI_TOTAL} fps={30} width={1080} height={1920} />
      <Composition id="GeminiPrivacyCover" component={GeminiPrivacyCover} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="FastFrames" component={FastFrames} durationInFrames={FASTFRAMES_TOTAL} fps={30} width={1080} height={1920} />
      <Composition id="FastFramesCover" component={FastFramesCover} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="LongCatAvatar" component={LongCatAvatar} durationInFrames={LONGCAT_TOTAL} fps={30} width={1080} height={1920} />
      <Composition id="LongCatAvatarCover" component={LongCatAvatarCover} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="ClaudeIndia" component={ClaudeIndia} durationInFrames={CLAUDEINDIA_TOTAL} fps={30} width={1080} height={1920} />
      <Composition id="ClaudeIndiaCover" component={ClaudeIndiaCover} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="GrokBot" component={GrokBot} durationInFrames={GROKBOT_TOTAL} fps={30} width={1080} height={1920} />
      <Composition id="GrokBotCover" component={GrokBotCover} durationInFrames={1} fps={30} width={1080} height={1920} />
      {/* YouTube channel art (stills) */}
      <Composition id="ChannelLogo" component={ChannelLogo} durationInFrames={1} fps={30} width={800} height={800} />
      <Composition id="ChannelBanner" component={ChannelBanner} durationInFrames={1} fps={30} width={2560} height={1440} />
      <Composition id="ChannelBannerGuides" component={ChannelBannerGuides} durationInFrames={1} fps={30} width={2560} height={1440} />
    </>
  );
};
