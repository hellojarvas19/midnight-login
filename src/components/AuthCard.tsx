import { useRef, useCallback, useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LogoMark } from "./LogoMark";
import { useAuth } from "@/contexts/AuthContext";

const TELEGRAM_BOT_USERNAME = "ChkXdAdmBot";

const AuthCard = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef({ x: 0, y: 0, raf: 0 });
  const navigate = useNavigate();
  const { signInWithTelegram } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  useEffect(() => {
    // Expose the global callback for Telegram Login Widget
    (window as any).onTelegramAuth = async (tgUser: any) => {
      setLoading(true);
      setError("");
      const { error: err } = await signInWithTelegram(tgUser);
      setLoading(false);
      if (err) {
        setError(err.message);
      } else {
        navigate("/dashboard");
      }
    };
    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, [signInWithTelegram, navigate]);

  const handleContinueWithTelegram = () => {
    // Open Telegram login widget popup
    const botUsername = TELEGRAM_BOT_USERNAME;
    const origin = window.location.origin;
    const popup = window.open(
      `https://oauth.telegram.org/auth?bot_id=&scope=&public_key=&nonce=&origin=${encodeURIComponent(origin)}`,
      "telegram_login",
      "width=550,height=470"
    );

    // Use the Telegram Login Widget script approach instead
    // Inject script dynamically
    const container = document.getElementById("telegram-login-container");
    if (container) {
      container.innerHTML = "";
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.setAttribute("data-telegram-login", botUsername);
      script.setAttribute("data-size", "large");
      script.setAttribute("data-onauth", "onTelegramAuth(user)");
      script.setAttribute("data-request-access", "write");
      script.async = true;
      container.appendChild(script);
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="glass-card animate-card-entrance rounded-3xl p-8 w-full max-w-md mx-4"
      style={{ transition: "transform 0.15s ease-out", willChange: "transform" }}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <LogoMark />
        <h1 className="text-2xl font-extrabold tracking-tight text-glow" style={{ color: "hsl(var(--foreground))" }}>
          0xAdam
        </h1>
        <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
          Welcome To 0xAdam Checker
        </p>
      </div>

      {/* Error */}
      {error && <p className="text-xs text-center mb-4" style={{ color: "hsl(0,75%,60%)" }}>{error}</p>}

      {/* Telegram Login Widget Container */}
      <div id="telegram-login-container" className="flex justify-center mb-4" />

      {/* Continue with Telegram button */}
      <button
        type="button"
        disabled={loading}
        onClick={handleContinueWithTelegram}
        className="btn-shimmer w-full flex items-center justify-center gap-3 rounded-xl py-3.5 text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: "linear-gradient(135deg, hsl(200,80%,50%), hsl(200,85%,42%))",
          color: "#fff",
          boxShadow: "0 4px 32px hsla(200,80%,50%,0.35), 0 0 80px hsla(200,80%,50%,0.1)",
          border: "1px solid hsla(200,70%,60%,0.25)",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.492-1.302.48-.428-.013-1.252-.242-1.865-.442-.751-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
        )}
        Continue with Telegram
      </button>

      {/* Footer note */}
      <p className="text-center text-xs mt-5" style={{ color: "hsl(var(--muted-foreground))" }}>
        Secure authentication powered by Lovable Cloud
      </p>
    </div>
  );
};

export default AuthCard;
