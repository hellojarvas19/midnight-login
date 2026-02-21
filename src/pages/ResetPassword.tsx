import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import ParticleBackground from "@/components/ParticleBackground";
import { LogoMark } from "@/components/LogoMark";
import { Lock } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 2000);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center" style={{ background: "hsl(var(--background))" }}>
      <ParticleBackground />
      <main className="relative z-10 w-full max-w-md mx-4">
        <div className="glass-card rounded-3xl p-8">
          <div className="text-center mb-8">
            <LogoMark />
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: "hsl(var(--foreground))" }}>
              Reset Password
            </h1>
          </div>

          {success ? (
            <p className="text-center text-sm" style={{ color: "hsl(142,70%,55%)" }}>
              Password updated! Redirecting…
            </p>
          ) : !isRecovery ? (
            <p className="text-center text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
              Invalid or expired reset link. Please request a new one.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground))" }} />
                <input
                  type="password"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-sm"
                  style={{
                    background: "hsla(330,18%,8%,0.8)",
                    border: "1px solid hsla(315,30%,25%,0.3)",
                    color: "hsl(var(--foreground))",
                  }}
                />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground))" }} />
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-sm"
                  style={{
                    background: "hsla(330,18%,8%,0.8)",
                    border: "1px solid hsla(315,30%,25%,0.3)",
                    color: "hsl(var(--foreground))",
                  }}
                />
              </div>
              {error && <p className="text-xs text-center" style={{ color: "hsl(0,75%,60%)" }}>{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="btn-shimmer w-full rounded-xl py-3 text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg, hsl(315,90%,45%), hsl(315,90%,55%))",
                  color: "#fff",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "Updating…" : "Update Password"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
