import { Composition } from "remotion";
import { HookReel } from "./compositions/HookReel";
import { QuoteReel } from "./compositions/QuoteReel";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HookReel"
        component={HookReel}
        durationInFrames={30 * 5}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          hook: "Você sabia que...",
          body: "87% dos devs usam IA no trabalho",
          cta: "Siga para mais",
          brandColor: "#d97757",
          fontFamily: "Poppins",
        }}
      />
      <Composition
        id="QuoteReel"
        component={QuoteReel}
        durationInFrames={30 * 4}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          quote: "Há uma diferença entre conhecer o caminho e trilhar o caminho.",
          author: "Morpheus",
          brandColor: "#141413",
          accentColor: "#d97757",
        }}
      />
    </>
  );
};
