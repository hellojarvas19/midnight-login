import logoCharacter from "@/assets/logo-character.jpg";

/* ─── Animated Magenta Character Logo ─── */
const LogoMark = () => (
  <div className="flex justify-center mb-7">
    <div
      className="relative flex items-center justify-center"
      style={{ width: 100, height: 100 }}
    >
      {/* Outer pulse rings */}
      <div
        className="absolute rounded-full"
        style={{
          inset: -10,
          border: "1px solid hsla(315, 95%, 58%, 0.3)",
          animation: "logo-ring-pulse 3s ease-in-out infinite",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          inset: -22,
          border: "1px solid hsla(315, 90%, 55%, 0.15)",
          animation: "logo-ring-pulse 3s ease-in-out infinite 0.45s",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          inset: -36,
          border: "1px solid hsla(315, 85%, 52%, 0.07)",
          animation: "logo-ring-pulse 3s ease-in-out infinite 0.9s",
        }}
      />

      {/* Glow backdrop bloom */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle, hsla(315, 95%, 52%, 0.45) 0%, transparent 70%)",
          filter: "blur(18px)",
          animation: "logo-glow-breathe 3s ease-in-out infinite",
        }}
      />

      {/* Character image — circular crop with magenta filter */}
      <div
        className="relative rounded-full overflow-hidden"
        style={{
          width: 100,
          height: 100,
          animation: "logo-float 4s ease-in-out infinite",
          boxShadow:
            "0 0 0 2px hsla(315, 95%, 58%, 0.5), 0 0 24px hsla(315, 90%, 52%, 0.6), 0 0 60px hsla(315, 80%, 45%, 0.3)",
        }}
      >
        {/* Magenta color overlay using mix-blend-mode */}
        <img
          src={logoCharacter}
          alt="Logo"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
            /* CSS filter chain: grayscale → sepia → hue-rotate to magenta → saturate */
            filter:
              "grayscale(1) sepia(1) saturate(6) hue-rotate(272deg) brightness(1.1) contrast(1.15)",
          }}
        />
        {/* Magenta vignette overlay */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 60%, transparent 40%, hsla(315, 60%, 10%, 0.55) 100%)",
            mixBlendMode: "multiply",
          }}
        />
        {/* Rim light */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "transparent",
            boxShadow: "inset 0 0 0 2px hsla(315, 95%, 65%, 0.35)",
          }}
        />
      </div>
    </div>
  </div>
);

export { LogoMark };
