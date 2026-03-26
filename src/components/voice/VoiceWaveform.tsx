"use client";

export function VoiceWaveform() {
  const bars = 5;
  const delays = [0, 0.15, 0.3, 0.15, 0];

  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="w-1 bg-clara-coral rounded-full wave-bar"
          style={{
            height: "100%",
            animationDelay: `${delays[i]}s`,
            animationDuration: `${0.6 + Math.random() * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}
