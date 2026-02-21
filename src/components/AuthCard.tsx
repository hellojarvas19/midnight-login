import { useRef, useCallback, useState } from "react";
import { Mail, Lock, User, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LogoMark } from "./LogoMark";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/* ─── Main auth card ─── */
const AuthCard = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef({ x: 0, y: 0, raf: 0 });
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (mode === "forgot") {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (err) setError(err.message);
      else setMessage("Check your email for a reset link!");
      return;
    }

    if (mode === "signin") {
      const { error: err } = await signIn(email, password);
      setLoading(false);
      if (err) {
        setError(err.message);
      } else {
        navigate("/dashboard");
      }
    } else {
      const { error: err } = await signUp(email, password, username);
      setLoading(false);
      if (err) {
        setError(err.message);
      } else {
        setMessage("Check your email to confirm your account!");
      }
    }
  };

  const inputStyle = {
    background: "hsla(330,18%,8%,0.8)",
    border: "1px solid hsla(315,30%,25%,0.3)",
    color: "hsl(var(--foreground))",
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
          {mode === "forgot" ? "Reset your password" : "Welcome To 0xAdam Checker"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {/* Username (signup only) */}
        {mode === "signup" && (
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground))" }} />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:ring-1 focus:ring-primary/40 transition-all"
              style={inputStyle}
            />
          </div>
        )}

        {/* Email */}
        <div className="relative">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground))" }} />
          <input
            type="email"
            placeholder="Email address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:ring-1 focus:ring-primary/40 transition-all"
            style={inputStyle}
          />
        </div>

        {/* Password (not for forgot mode) */}
        {mode !== "forgot" && (
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground))" }} />
            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:ring-1 focus:ring-primary/40 transition-all"
              style={inputStyle}
            />
          </div>
        )}

        {/* Error / Success */}
        {error && <p className="text-xs text-center" style={{ color: "hsl(0,75%,60%)" }}>{error}</p>}
        {message && <p className="text-xs text-center" style={{ color: "hsl(142,70%,55%)" }}>{message}</p>}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn-shimmer w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, hsl(315,90%,45%), hsl(315,90%,55%))",
            color: "#fff",
            boxShadow: "0 4px 32px hsla(315,90%,50%,0.35), 0 0 80px hsla(315,90%,50%,0.1)",
            border: "1px solid hsla(315,80%,60%,0.25)",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
        </button>
      </form>

      {/* Mode toggle */}
      <div className="flex flex-col items-center gap-2 mt-5">
        {mode !== "forgot" && (
          <button
            type="button"
            onClick={() => { setMode("forgot"); setError(""); setMessage(""); }}
            className="text-xs transition-colors hover:underline"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Forgot password?
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError("");
            setMessage("");
          }}
          className="text-xs transition-colors"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
          <span className="font-semibold" style={{ color: "hsl(var(--primary))" }}>
            {mode === "signin" ? "Sign Up" : "Sign In"}
          </span>
        </button>
      </div>

      {/* Footer note */}
      <p className="text-center text-xs mt-5" style={{ color: "hsl(var(--muted-foreground))" }}>
        Secure authentication powered by Lovable Cloud
      </p>
    </div>
  );
};

export default AuthCard;
