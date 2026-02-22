import { useEffect, useRef, useState, useMemo } from "react";
import { Activity, BarChart2, CheckCircle, CreditCard, ShieldCheck, Zap, TrendingUp, Wallet, Clock, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan, PLAN_DETAILS } from "@/contexts/PlanContext";
import { supabase } from "@/integrations/supabase/client";

async function fetchDailyUsage(userId: string): Promise<number> {
  const { data } = await supabase
    .from("daily_usage")
    .select("checks_used")
    .eq("user_id", userId)
    .eq("usage_date", new Date().toISOString().slice(0, 10))
    .maybeSingle();
  return data?.checks_used ?? 0;
}

/* ─── Animated counter hook ─── */
function useCountUp(target: number, duration = 1400, delay = 0) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, delay]);

  return value;
}

/* ─── Stat Card ─── */
const StatCard = ({
  label,
  target,
  suffix = "",
  icon: Icon,
  emoji,
  emojiAnimation,
  delay = 0,
}: {
  label: string;
  target: number;
  suffix?: string;
  icon: typeof Activity;
  emoji?: string;
  emojiAnimation?: string;
  delay?: number;
}) => {
  const count = useCountUp(target, 1600, delay + 300);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="rounded-lg p-1.5 shrink-0 flex items-center gap-1" style={{ background: "hsla(315,80%,40%,0.15)" }}>
          {emoji && (
            <span style={{ display: "inline-block", fontSize: 12, animation: emojiAnimation, lineHeight: 1 }}>
              {emoji}
            </span>
          )}
          <Icon size={13} style={{ color: "hsl(var(--primary))", filter: "drop-shadow(0 0 4px hsla(315,90%,60%,0.55))" }} />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
          {label}
        </span>
      </div>

      <p
        className="text-3xl font-extrabold tracking-tight tabular-nums pl-0.5"
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          color: "hsl(var(--foreground))",
          textShadow: "0 0 20px hsla(315,90%,72%,0.22)",
        }}
      >
        {count.toLocaleString()}
        {suffix}
      </p>

      <div className="h-px rounded-full overflow-hidden" style={{ background: "hsla(315,40%,30%,0.3)" }}>
        <div
          className="h-full rounded-full transition-all duration-[1600ms] ease-out"
          style={{
            width: `${Math.min((count / (target || 1)) * 100, 100)}%`,
            background: "linear-gradient(90deg, hsl(315,95%,45%), hsl(315,90%,65%))",
            boxShadow: "0 0 6px hsla(315,90%,55%,0.5)",
          }}
        />
      </div>
    </div>
  );
};

/* ─── Live dot indicator ─── */
const LiveDot = () => (
  <span className="relative flex h-2 w-2">
    <span
      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
      style={{ background: "hsl(var(--primary))" }}
    />
    <span
      className="relative inline-flex rounded-full h-2 w-2"
      style={{ background: "hsl(var(--primary))" }}
    />
  </span>
);

/* ─── Page ─── */
const HomePage = () => {
  const { profile, user } = useAuth();
  const { activePlan, isPlanActive, planExpiresAt } = usePlan();

  const [dailyUsed, setDailyUsed] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchDailyUsage(user.id).then(setDailyUsed);
  }, [user]);

  const dailyLimit = activePlan?.dailyLimit ?? 0;
  const dailyRemaining = Math.max(0, dailyLimit - dailyUsed);
  const dailyPercent = dailyLimit > 0 ? Math.min((dailyUsed / dailyLimit) * 100, 100) : 0;

  const credits = profile?.credits ?? 0;
  const username = profile?.username || "User";

  const daysLeft = useMemo(() => {
    if (!planExpiresAt) return 0;
    const diff = new Date(planExpiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [planExpiresAt]);

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome header */}
      <div
        className="animate-card-entrance"
        style={{ animationDelay: "0ms", animationFillMode: "both" }}
      >
        <p className="text-sm font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
          Welcome back,
        </p>
        <h1
          className="text-4xl font-black tracking-tight leading-none"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            color: "hsl(var(--primary))",
            textShadow: "0 0 30px hsla(315,90%,60%,0.45), 0 0 60px hsla(315,90%,50%,0.2)",
          }}
        >
          {username}
        </h1>
        <p className="mt-2 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          Here's a live snapshot of your checker activity.
        </p>
      </div>

      {/* ── Stats Card ── */}
      <div
        className="glass-card animate-card-entrance rounded-2xl overflow-hidden"
        style={{ animationDelay: "60ms", animationFillMode: "both" }}
      >
        <div
          className="flex items-center gap-3 px-5 py-4 border-b"
          style={{ borderColor: "hsla(315,30%,25%,0.2)" }}
        >
          <div className="rounded-xl p-2" style={{ background: "hsla(315,80%,40%,0.15)" }}>
            <TrendingUp size={15} style={{ color: "hsl(var(--primary))", filter: "drop-shadow(0 0 5px hsla(315,90%,60%,0.55))" }} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
            Activity Overview
          </p>
          <div className="ml-auto flex items-center gap-1.5">
            <LiveDot />
            <span className="text-xs font-medium" style={{ color: "hsl(var(--primary))" }}>Live</span>
          </div>
        </div>

        <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-5">
          <StatCard label="Credits" target={credits} icon={Wallet} emoji="💰" emojiAnimation="emoji-bounce 1.6s ease-in-out infinite" delay={60} />
          <StatCard label="Used Today" target={dailyUsed} icon={BarChart2} emoji="📊" emojiAnimation="emoji-spin 2.8s linear infinite" delay={120} />
          <StatCard label="Remaining" target={dailyRemaining} icon={CheckCircle} emoji="✅" emojiAnimation="emoji-wobble 2s ease-in-out infinite" delay={180} />
        </div>
      </div>

      {/* ── Daily Limit Bar ── */}
      {isPlanActive && (
        <div
          className="glass-card animate-card-entrance rounded-2xl p-5"
          style={{ animationDelay: "140ms", animationFillMode: "both" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg p-1.5" style={{ background: "hsla(315,80%,40%,0.15)" }}>
                <Zap size={13} style={{ color: "hsl(var(--primary))", filter: "drop-shadow(0 0 4px hsla(315,90%,60%,0.55))" }} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
                Daily Usage
              </span>
            </div>
            <span className="text-xs font-bold tabular-nums" style={{ color: "hsl(var(--foreground))" }}>
              {dailyUsed.toLocaleString()} / {dailyLimit.toLocaleString()}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsla(315,40%,30%,0.3)" }}>
            <div
              className="h-full rounded-full transition-all duration-[1600ms] ease-out"
              style={{
                width: `${dailyPercent}%`,
                background: dailyPercent > 90
                  ? "linear-gradient(90deg, hsl(0,85%,50%), hsl(0,90%,60%))"
                  : "linear-gradient(90deg, hsl(315,95%,45%), hsl(315,90%,65%))",
                boxShadow: "0 0 8px hsla(315,90%,55%,0.5)",
              }}
            />
          </div>
        </div>
      )}

      {/* ── Plan Info Card ── */}
      <div
        className="glass-card animate-card-entrance rounded-2xl p-5"
        style={{ animationDelay: "200ms", animationFillMode: "both" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-xl p-2" style={{ background: "hsla(315,80%,40%,0.15)" }}>
            <Crown size={15} style={{ color: "hsl(var(--primary))", filter: "drop-shadow(0 0 5px hsla(315,90%,60%,0.55))" }} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
            Plan Status
          </p>
        </div>

        {isPlanActive && activePlan ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-extrabold" style={{ color: "hsl(var(--foreground))", fontFamily: "'Space Grotesk', sans-serif" }}>
                {activePlan.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                {dailyLimit.toLocaleString()} credits/day
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5">
                <Clock size={12} style={{ color: "hsl(var(--muted-foreground))" }} />
                <span className="text-sm font-bold tabular-nums" style={{ color: "hsl(var(--foreground))" }}>
                  {daysLeft}d
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>remaining</p>
            </div>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            No active plan. Subscribe to start checking cards.
          </p>
        )}
      </div>
    </div>
  );
};

export default HomePage;
