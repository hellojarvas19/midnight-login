/* ─── Animated Logo Mark ─── */
const LogoMark = () => (
  <div className="flex justify-center mb-7">
    <div
      className="relative flex items-center justify-center"
      style={{ width: 72, height: 72 }}
    >
      {/* Outer pulse rings */}
      <div
        className="absolute rounded-full"
        style={{
          inset: -12,
          border: "1px solid hsla(315, 95%, 58%, 0.25)",
          animation: "logo-ring-pulse 3s ease-in-out infinite",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          inset: -24,
          border: "1px solid hsla(315, 90%, 55%, 0.12)",
          animation: "logo-ring-pulse 3s ease-in-out infinite 0.4s",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          inset: -38,
          border: "1px solid hsla(315, 85%, 52%, 0.06)",
          animation: "logo-ring-pulse 3s ease-in-out infinite 0.8s",
        }}
      />

      {/* Glow backdrop */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle, hsla(315, 95%, 55%, 0.35) 0%, transparent 70%)",
          filter: "blur(12px)",
          animation: "logo-glow-breathe 3s ease-in-out infinite",
        }}
      />

      {/* SVG crystal mark */}
      <svg
        width="72"
        height="72"
        viewBox="0 0 72 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "relative", zIndex: 1, animation: "logo-float 4s ease-in-out infinite" }}
      >
        <defs>
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(315, 95%, 72%)" />
            <stop offset="50%" stopColor="hsl(315, 90%, 55%)" />
            <stop offset="100%" stopColor="hsl(335, 85%, 42%)" />
          </linearGradient>
          <linearGradient id="logoGradInner" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(315, 100%, 88%)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(315, 95%, 60%)" stopOpacity="0.5" />
          </linearGradient>
          <filter id="logoGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="logoGlowStrong">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer hexagon ring */}
        <polygon
          points="36,4 62,20 62,52 36,68 10,52 10,20"
          fill="none"
          stroke="url(#logoGrad)"
          strokeWidth="1.5"
          strokeOpacity="0.5"
          filter="url(#logoGlow)"
        />

        {/* Main diamond body */}
        <polygon
          points="36,10 56,36 36,62 16,36"
          fill="hsla(315, 95%, 55%, 0.12)"
          stroke="url(#logoGrad)"
          strokeWidth="1.8"
          filter="url(#logoGlowStrong)"
        />

        {/* Inner upper facet */}
        <polygon
          points="36,10 56,36 36,36"
          fill="url(#logoGradInner)"
          fillOpacity="0.25"
          stroke="url(#logoGrad)"
          strokeWidth="0.8"
          strokeOpacity="0.7"
        />

        {/* Inner left facet */}
        <polygon
          points="36,10 16,36 36,36"
          fill="url(#logoGradInner)"
          fillOpacity="0.12"
          stroke="url(#logoGrad)"
          strokeWidth="0.8"
          strokeOpacity="0.4"
        />

        {/* Centre star cross */}
        <line x1="36" y1="22" x2="36" y2="50" stroke="url(#logoGrad)" strokeWidth="0.8" strokeOpacity="0.6" />
        <line x1="22" y1="36" x2="50" y2="36" stroke="url(#logoGrad)" strokeWidth="0.8" strokeOpacity="0.6" />

        {/* Centre bright dot */}
        <circle cx="36" cy="36" r="3.5" fill="hsl(315, 100%, 85%)" filter="url(#logoGlowStrong)" />
        <circle cx="36" cy="36" r="1.8" fill="white" />

        {/* Corner accent diamonds */}
        <polygon points="36,6 38,10 36,14 34,10" fill="url(#logoGrad)" opacity="0.7" />
        <polygon points="36,58 38,62 36,66 34,62" fill="url(#logoGrad)" opacity="0.5" />
        <polygon points="12,34 16,36 12,38 8,36" fill="url(#logoGrad)" opacity="0.4" />
        <polygon points="60,34 64,36 60,38 56,36" fill="url(#logoGrad)" opacity="0.4" />
      </svg>
    </div>
  </div>
);

export { LogoMark };
