import ParticleBackground from "@/components/ParticleBackground";
import AuthCard from "@/components/AuthCard";

const Index = () => {
  return (
    <div
      className="relative min-h-screen flex items-center justify-center"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* Animated star/orb background */}
      <ParticleBackground />

      {/* Auth card centered */}
      <main className="relative z-10 flex items-center justify-center w-full py-8 px-4">
        <AuthCard />
      </main>

      {/* Bottom attribution / footer */}
      <p
        className="absolute bottom-4 left-0 right-0 text-center text-xs"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        © 2026 SaaS Dashboard · All rights reserved
      </p>
    </div>
  );
};

export default Index;
