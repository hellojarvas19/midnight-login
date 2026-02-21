import { useState } from "react";
import { Crown, Check, Zap, Star, Sparkles, Clock, ShieldCheck } from "lucide-react";
import { usePlan, PLAN_DETAILS, type PlanId } from "@/contexts/PlanContext";
import PaymentPage from "./PaymentPage";

const PLANS = [
  {
    id: "basic" as PlanId,
    icon: Zap,
    accent: "hsla(315,60%,45%,0.25)",
    border: "hsla(315,50%,45%,0.3)",
    glow: "hsla(315,80%,55%,0.15)",
  },
  {
    id: "standard" as PlanId,
    icon: Crown,
    accent: "hsla(44,90%,50%,0.25)",
    border: "hsla(44,80%,55%,0.4)",
    glow: "hsla(44,100%,55%,0.2)",
    popular: true,
  },
  {
    id: "pro" as PlanId,
    icon: Star,
    accent: "hsla(270,60%,50%,0.25)",
    border: "hsla(270,50%,55%,0.35)",
    glow: "hsla(270,70%,55%,0.15)",
  },
];

const PlansPage = () => {
  const { activePlan, isPlanActive, planExpiresAt } = usePlan();
  const [payingPlan, setPayingPlan] = useState<PlanId | null>(null);

  if (payingPlan) {
    return (
      <PaymentPage
        selectedPlan={payingPlan}
        onBack={() => setPayingPlan(null)}
        onSuccess={() => setPayingPlan(null)}
      />
    );
  }

  const expiresFormatted = planExpiresAt
    ? new Date(planExpiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Active plan banner */}
      {isPlanActive && activePlan && (
        <div
          className="glass-card rounded-2xl p-4 flex items-center gap-3 animate-card-entrance"
          style={{
            border: "1px solid hsla(142,60%,40%,0.3)",
            background: "hsla(142,50%,15%,0.15)",
          }}
        >
          <ShieldCheck size={18} style={{ color: "hsl(142,70%,55%)", filter: "drop-shadow(0 0 6px hsla(142,70%,55%,0.6))" }} />
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: "hsl(142,70%,65%)" }}>
              {activePlan.name} Plan Active
            </p>
            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
              Expires {expiresFormatted}
            </p>
          </div>
          <Clock size={14} style={{ color: "hsl(var(--muted-foreground))" }} />
        </div>
      )}

      {/* Header */}
      <div className="animate-card-entrance" style={{ animationDelay: "0ms", animationFillMode: "both" }}>
        <p className="text-sm font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Choose your</p>
        <h1
          className="text-4xl font-black tracking-tight leading-none"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            background: "linear-gradient(90deg, hsl(42,100%,52%) 0%, hsl(52,100%,78%) 30%, hsl(45,100%,65%) 50%, hsl(36,90%,45%) 70%, hsl(48,100%,70%) 85%, hsl(42,100%,52%) 100%)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            animation: "gold-shimmer 2.8s linear infinite",
            filter: "drop-shadow(0 0 12px hsla(44,100%,58%,0.4))",
          }}
        >
          Plan
        </h1>
        <p className="mt-2 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          Pay with crypto. Activate instantly after confirmation.
        </p>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((planStyle, idx) => {
          const plan = PLAN_DETAILS[planStyle.id];
          const PlanIcon = planStyle.icon;
          const isCurrent = isPlanActive && activePlan?.id === planStyle.id;
          return (
            <div
              key={plan.id}
              className="glass-card animate-card-entrance rounded-2xl flex flex-col overflow-hidden relative"
              style={{
                animationDelay: `${80 + idx * 80}ms`,
                animationFillMode: "both",
                border: `1px solid ${planStyle.border}`,
                boxShadow: planStyle.popular
                  ? `0 0 30px ${planStyle.glow}, 0 0 60px ${planStyle.glow}`
                  : `0 0 20px ${planStyle.glow}`,
              }}
            >
              {planStyle.popular && (
                <div
                  className="absolute top-3 right-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    background: "hsla(44,90%,45%,0.2)",
                    border: "1px solid hsla(44,80%,55%,0.4)",
                    color: "hsl(48,100%,70%)",
                  }}
                >
                  <Sparkles size={10} /> Popular
                </div>
              )}

              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="rounded-xl p-2" style={{ background: planStyle.accent }}>
                    <PlanIcon
                      size={16}
                      style={{
                        color: planStyle.popular ? "hsl(48,100%,65%)" : "hsl(var(--primary))",
                        filter: planStyle.popular
                          ? "drop-shadow(0 0 6px hsla(44,100%,58%,0.8))"
                          : "drop-shadow(0 0 4px hsla(315,90%,60%,0.55))",
                      }}
                    />
                  </div>
                  <h2
                    className="text-lg font-bold tracking-tight"
                    style={{ color: planStyle.popular ? "hsl(48,100%,68%)" : "hsl(var(--foreground))" }}
                  >
                    {plan.name}
                  </h2>
                </div>

                <p className="text-xs mb-4" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {plan.duration} days access
                </p>

                <div className="flex items-baseline gap-1">
                  <span
                    className="text-3xl font-black tracking-tight"
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      color: planStyle.popular ? "hsl(48,100%,70%)" : "hsl(var(--foreground))",
                      textShadow: planStyle.popular ? "0 0 20px hsla(44,100%,58%,0.35)" : "0 0 20px hsla(315,90%,72%,0.15)",
                    }}
                  >
                    {plan.price}
                  </span>
                  <span className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
                    /{plan.duration}d
                  </span>
                </div>
              </div>

              <div style={{ height: 1, margin: "0 20px", background: planStyle.border }} />

              <div className="flex-1 px-5 py-4 flex flex-col gap-2.5">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2.5">
                    <Check
                      size={13}
                      style={{
                        flexShrink: 0,
                        color: planStyle.popular ? "hsl(48,100%,65%)" : "hsl(var(--primary))",
                        filter: planStyle.popular
                          ? "drop-shadow(0 0 4px hsla(44,100%,58%,0.6))"
                          : "drop-shadow(0 0 3px hsla(315,90%,60%,0.4))",
                      }}
                    />
                    <span className="text-xs font-medium" style={{ color: "hsl(var(--foreground))", opacity: 0.85 }}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              <div className="px-5 pb-5 pt-2">
                <button
                  type="button"
                  onClick={() => !isCurrent && setPayingPlan(planStyle.id)}
                  className="w-full rounded-xl py-2.5 text-sm font-bold tracking-wide transition-all duration-200"
                  style={{
                    background: isCurrent
                      ? "transparent"
                      : planStyle.popular
                        ? "linear-gradient(135deg, hsl(42,100%,48%), hsl(48,100%,58%))"
                        : "hsla(315,70%,45%,0.25)",
                    border: isCurrent
                      ? `1px solid ${planStyle.border}`
                      : planStyle.popular
                        ? "1px solid hsla(44,80%,55%,0.5)"
                        : `1px solid ${planStyle.border}`,
                    color: isCurrent
                      ? "hsl(var(--muted-foreground))"
                      : planStyle.popular
                        ? "hsl(20,15%,10%)"
                        : "hsl(var(--foreground))",
                    boxShadow: isCurrent
                      ? "none"
                      : planStyle.popular
                        ? "0 0 20px hsla(44,100%,55%,0.3)"
                        : `0 0 12px ${planStyle.glow}`,
                    cursor: isCurrent ? "default" : "pointer",
                  }}
                >
                  {isCurrent ? "Current Plan" : "Upgrade Now"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlansPage;
