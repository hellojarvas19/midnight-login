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
  const [widgetLoaded, setWidgetLoaded] = useState(false);

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

    // Inject Telegram Login Widget script with loading state
    const container = document.getElementById("telegram-login-container");
    if (container && container.childElementCount === 0) {
      setWidgetLoaded(false);
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.setAttribute("data-telegram-login", TELEGRAM_BOT_USERNAME);
      script.setAttribute("data-size", "large");
      script.setAttribute("data-radius", "12");
      script.setAttribute("data-onauth", "onTelegramAuth(user)");
      script.setAttribute("data-request-access", "write");
      script.async = true;
      
      // Set widget as loaded when script loads
      script.onload = () => setWidgetLoaded(true);
      script.onerror = () => setWidgetLoaded(true); // Show button even on error
      
      container.appendChild(script);
    } else {
      setWidgetLoaded(true);
    }

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, [signInWithTelegram, navigate]);

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

      {/* Loading state */}
      {(loading || !widgetLoaded) && (
        <div className="flex items-center justify-center gap-2 mb-4">
          <Loader2 size={16} className="animate-spin" style={{ color: "hsl(var(--primary))" }} />
          <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            {loading ? "Authenticating..." : "Loading login..."}
          </span>
        </div>
      )}

      {/* Telegram Login Widget Container — the only login button */}
      <div
        id="telegram-login-container"
        className={`flex justify-center mb-4 rounded-xl p-3 ${!widgetLoaded ? 'invisible' : ''}`}
        style={{
          background: "hsla(200, 80%, 50%, 0.08)",
          border: "1px solid hsla(200, 70%, 55%, 0.18)",
          boxShadow: "0 0 24px hsla(200, 80%, 50%, 0.1), inset 0 0 0 1px hsla(200, 80%, 60%, 0.05)",
        }}
      />

      {/* Footer note */}
      <p className="text-center text-xs mt-5" style={{ color: "hsl(var(--muted-foreground))" }}>
        Secure authentication powered by 0xAdam
      </p>
    </div>
  );
};

export default AuthCard;
