import { useEffect, useState } from "react";
import logoCharacter from "@/assets/logo-character.jpg";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    // enter → hold after 800ms
    const t1 = setTimeout(() => setPhase("hold"), 800);
    // hold → exit after 2200ms total
    const t2 = setTimeout(() => setPhase("exit"), 2200);
    // unmount after exit animation (400ms)
    const t3 = setTimeout(() => onComplete(), 2650);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: "hsl(var(--background))",
        opacity: phase === "exit" ? 0 : 1,
        transform: phase === "exit" ? "scale(1.04)" : "scale(1)",
        transition: "opacity 0.45s cubic-bezier(0.4,0,0.2,1), transform 0.45s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {/* Ambient glow blobs */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 400,
          height: 400,
          background: "radial-gradient(circle, hsla(315,95%,52%,0.18) 0%, transparent 70%)",
          filter: "blur(60px)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          animation: "logo-glow-breathe 3s ease-in-out infinite",
        }}
      />

      {/* Logo */}
      <div
        style={{
          opacity: phase === "enter" ? 0 : 1,
          transform: phase === "enter" ? "scale(0.7) translateY(20px)" : "scale(1) translateY(0)",
          transition: "opacity 0.6s cubic-bezier(0.34,1.56,0.64,1), transform 0.6s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* Pulse rings */}
        <div className="relative flex items-center justify-center" style={{ width: 140, height: 140, margin: "0 auto 32px" }}>
          <div
            className="absolute rounded-full"
            style={{
              inset: -14,
              border: "1px solid hsla(315, 95%, 58%, 0.35)",
              animation: "logo-ring-pulse 3s ease-in-out infinite",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              inset: -30,
              border: "1px solid hsla(315, 90%, 55%, 0.18)",
              animation: "logo-ring-pulse 3s ease-in-out infinite 0.45s",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              inset: -48,
              border: "1px solid hsla(315, 85%, 52%, 0.08)",
              animation: "logo-ring-pulse 3s ease-in-out infinite 0.9s",
            }}
          />
          {/* Glow bloom */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, hsla(315, 95%, 52%, 0.5) 0%, transparent 70%)",
              filter: "blur(22px)",
              animation: "logo-glow-breathe 3s ease-in-out infinite",
            }}
          />
          {/* Image */}
          <div
            className="relative rounded-full overflow-hidden"
            style={{
              width: 140,
              height: 140,
              animation: "logo-float 4s ease-in-out infinite",
              boxShadow: "0 0 0 2px hsla(315,95%,58%,0.55), 0 0 32px hsla(315,90%,52%,0.7), 0 0 80px hsla(315,80%,45%,0.35)",
            }}
          >
            <img
              src={logoCharacter}
              alt="0xAdam"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center top",
                filter: "grayscale(1) sepia(1) saturate(6) hue-rotate(272deg) brightness(1.1) contrast(1.15)",
              }}
            />
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle at 50% 60%, transparent 40%, hsla(315,60%,10%,0.55) 100%)",
                mixBlendMode: "multiply",
              }}
            />
            <div
              className="absolute inset-0 rounded-full"
              style={{ boxShadow: "inset 0 0 0 2px hsla(315,95%,65%,0.35)" }}
            />
          </div>
        </div>
      </div>

      {/* Text */}
      <div
        style={{
          textAlign: "center",
          opacity: phase === "enter" ? 0 : 1,
          transform: phase === "enter" ? "translateY(16px)" : "translateY(0)",
          transition: "opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s",
        }}
      >
        <h1
          className="text-4xl font-black tracking-tight text-glow"
          style={{ color: "hsl(var(--foreground))" }}
        >
          0xAdam
        </h1>
        <p
          className="text-sm mt-2 tracking-widest uppercase font-medium"
          style={{ color: "hsl(var(--primary))", letterSpacing: "0.25em" }}
        >
          Checker
        </p>
      </div>

      {/* Loading dots */}
      <div
        className="flex gap-1.5 mt-10"
        style={{
          opacity: phase === "enter" ? 0 : 1,
          transition: "opacity 0.5s ease 0.3s",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: 6,
              height: 6,
              background: "hsl(var(--primary))",
              animation: `splash-dot 1.2s ease-in-out infinite ${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default SplashScreen;
