// A fine-line sneaker in profile. Generic on purpose: no brand marks.
export function SneakerArt({ className = '', strokeWidth = 2.2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 240 120" fill="none" className={className} aria-hidden>
      <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {/* outsole and midsole */}
        <path d="M16 90c-2 9 4 14 14 14h186c10 0 15-6 13-15l-3-5H19z" />
        <path d="M22 96h196" opacity=".55" />
        {/* upper */}
        <path d="M19 84c-3-13 3-27 18-31l33-7c10-2 18-10 22-20l3-8c2-4 8-6 13-4l19 8c8 4 12 11 18 18 10 10 30 15 50 19 17 3 29 12 28 25" />
        {/* collar and heel tab */}
        <path d="M95 18c6 8 18 12 30 10" opacity=".7" />
        <path d="M24 60c-4-6-3-12 2-15" />
        {/* toe cap */}
        <path d="M186 60c-4 8-4 16 0 24" opacity=".7" />
        {/* side stripe */}
        <path d="M58 78c30-4 62-16 92-36" opacity=".8" />
        {/* laces */}
        <path d="M112 30l10 8M122 36l10 8M132 42l10 8M142 48l10 7" />
        {/* stitching */}
        <path d="M40 72c40 2 90-2 140-10" strokeDasharray="2 5" opacity=".5" />
      </g>
    </svg>
  );
}
