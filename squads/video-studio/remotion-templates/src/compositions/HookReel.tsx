import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

type HookReelProps = {
  hook: string;
  body: string;
  cta: string;
  brandColor: string;
  fontFamily: string;
};

export const HookReel: React.FC<HookReelProps> = ({
  hook,
  body,
  cta,
  brandColor,
  fontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Hook appears in first 3 seconds
  const hookOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const hookScale = spring({ frame, fps, config: { damping: 12 } });

  // Body appears at 2 seconds
  const bodyOpacity = interpolate(frame, [fps * 2, fps * 2 + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bodyY = interpolate(frame, [fps * 2, fps * 2 + 20], [50, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // CTA appears at 3.5 seconds
  const ctaOpacity = interpolate(frame, [fps * 3.5, fps * 3.5 + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
        fontFamily,
      }}
    >
      {/* Hook text */}
      <div
        style={{
          opacity: hookOpacity,
          transform: `scale(${hookScale})`,
          color: brandColor,
          fontSize: 72,
          fontWeight: 900,
          textAlign: "center",
          lineHeight: 1.1,
          marginBottom: 60,
        }}
      >
        {hook}
      </div>

      {/* Body text */}
      <div
        style={{
          opacity: bodyOpacity,
          transform: `translateY(${bodyY}px)`,
          color: "#faf9f5",
          fontSize: 48,
          fontWeight: 400,
          textAlign: "center",
          lineHeight: 1.4,
          marginBottom: 80,
        }}
      >
        {body}
      </div>

      {/* CTA */}
      <div
        style={{
          opacity: ctaOpacity,
          color: brandColor,
          fontSize: 36,
          fontWeight: 700,
          textAlign: "center",
          padding: "16px 40px",
          border: `3px solid ${brandColor}`,
          borderRadius: 12,
        }}
      >
        {cta}
      </div>
    </AbsoluteFill>
  );
};
