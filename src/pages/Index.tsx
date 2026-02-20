import { useState } from "react";
import ParticleBackground from "@/components/ParticleBackground";
import AuthCard from "@/components/AuthCard";
import SplashScreen from "@/components/SplashScreen";

const Index = () => {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <div
      className="relative min-h-screen flex items-center justify-center"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* Splash screen */}
      {!splashDone && <SplashScreen onComplete={() => setSplashDone(true)} />}

      {/* Animated star/orb background */}
      <ParticleBackground />

      {/* Auth card — fades in after splash */}
      <main
        className="relative z-10 flex items-center justify-center w-full py-8 px-4"
        style={{
          opacity: splashDone ? 1 : 0,
          transform: splashDone ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
        }}
      >
        <AuthCard />
      </main>

      {/* Footer */}
      <p
        className="absolute bottom-4 left-0 right-0 text-center text-xs"
        style={{
          color: "hsl(var(--muted-foreground))",
          opacity: splashDone ? 1 : 0,
          transition: "opacity 0.6s ease 0.2s",
        }}
      >
        © 2026 0xAdam Checker · All rights reserved
      </p>
    </div>
  );
};

export default Index;
