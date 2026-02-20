import { useRef, useCallback } from "react";
import { Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LogoMark } from "./LogoMark";

/* ─── Telegram button ─── */
const TelegramButton = () => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate("/dashboard")}
      className="btn-shimmer w-full flex items-center justify-center gap-3 rounded-xl py-4 text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
      style={{
        background: "linear-gradient(135deg, hsl(200,100%,40%), hsl(200,100%,50%))",
        color: "hsl(0,0%,100%)",
        boxShadow: "0 4px 32px hsla(200,100%,45%,0.45), 0 0 80px hsla(200,100%,45%,0.15)",
        border: "1px solid hsla(200,100%,60%,0.25)",
      }}
    >
      <Send size={18} />
      Continue with Telegram
    </button>
  );
};

/* ─── Main auth card ─── */
const AuthCard = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef({ x: 0, y: 0, raf: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    tiltRef.current.x = dy * -8;
    tiltRef.current.y = dx * 8;
    cancelAnimationFrame(tiltRef.current.raf);
    tiltRef.current.raf = requestAnimationFrame(() => {
      if (cardRef.current) {
        cardRef.current.style.transform = `perspective(1200px) rotateX(${tiltRef.current.x}deg) rotateY(${tiltRef.current.y}deg) scale(1.01)`;
      }
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    cancelAnimationFrame(tiltRef.current.raf);
    tiltRef.current.raf = requestAnimationFrame(() => {
      if (cardRef.current) {
        cardRef.current.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)`;
      }
    });
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="glass-card animate-card-entrance rounded-3xl p-8 w-full max-w-md mx-4"
      style={{
        transition: "transform 0.15s ease-out",
        willChange: "transform",
      }}
    >
      {/* Header */}
      <div className="text-center mb-10">
        <LogoMark />
        <h1
          className="text-2xl font-extrabold tracking-tight text-glow"
          style={{ color: "hsl(var(--foreground))" }}
        >
          0xAdam
        </h1>
        <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
          Welcome To 0xAdam Checker
        </p>
      </div>

      {/* Telegram only */}
      <TelegramButton />

      {/* Footer note */}
      <p className="text-center text-xs mt-6" style={{ color: "hsl(var(--muted-foreground))" }}>
        Secure login via Telegram OAuth
      </p>
    </div>
  );
};

export default AuthCard;
