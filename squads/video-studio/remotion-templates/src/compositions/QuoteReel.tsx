import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

type QuoteReelProps = {
  quote: string;
  author: string;
  brandColor: string;
  accentColor: string;
};

export const QuoteReel: React.FC<QuoteReelProps> = ({
  quote,
  author,
  brandColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Quote fades in with typewriter effect simulation
  const quoteOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: "clamp" });
  const quoteY = interpolate(frame, [10, 40], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Author appears after quote
  const authorOpacity = interpolate(frame, [fps * 2, fps * 2 + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Accent line grows
  const lineWidth = interpolate(frame, [5, 50], [0, 200], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: brandColor,
        justifyContent: "center",
        alignItems: "center",
        padding: 100,
      }}
    >
      {/* Accent line */}
      <div
        style={{
          width: lineWidth,
          height: 4,
          backgroundColor: accentColor,
          marginBottom: 60,
        }}
      />

      {/* Quote */}
      <div
        style={{
          opacity: quoteOpacity,
          transform: `translateY(${quoteY}px)`,
          color: "#faf9f5",
          fontSize: 52,
          fontWeight: 300,
          textAlign: "center",
          lineHeight: 1.5,
          fontStyle: "italic",
          maxWidth: 900,
        }}
      >
        "{quote}"
      </div>

      {/* Author */}
      <div
        style={{
          opacity: authorOpacity,
          color: accentColor,
          fontSize: 32,
          fontWeight: 700,
          textAlign: "center",
          marginTop: 40,
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        — {author}
      </div>
    </AbsoluteFill>
  );
};
