import { Crown, Check, Zap, Star, Sparkles } from "lucide-react";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/forever",
    description: "Get started with basic features",
    features: ["50 checks/day", "1 gateway", "Basic support", "Community chat"],
    accent: "hsla(315,60%,45%,0.25)",
    border: "hsla(315,50%,45%,0.3)",
    glow: "hsla(315,80%,55%,0.15)",
    icon: Zap,
    current: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For power users who need more",
    features: [
      "Unlimited checks",
      "All gateways",
      "Priority support",
      "Mass checker",
      "Multi-proxy rotation",
      "API access",
    ],
    accent: "hsla(44,90%,50%,0.25)",
    border: "hsla(44,80%,55%,0.4)",
    glow: "hsla(44,100%,55%,0.2)",
    icon: Crown,
    current: true,
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$99",
    period: "/month",
    description: "Custom solutions for teams",
    features: [
      "Everything in Pro",
      "Dedicated gateways",
      "Custom integrations",
      "SLA guarantee",
      "Team seats (up to 10)",
      "Webhook callbacks",
    ],
    accent: "hsla(270,60%,50%,0.25)",
    border: "hsla(270,50%,55%,0.35)",
    glow: "hsla(270,70%,55%,0.15)",
    icon: Star,
    current: false,
  },
];

const PlansPage = () => {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div
        className="animate-card-entrance"
        style={{ animationDelay: "0ms", animationFillMode: "both" }}
      >
        <p className="text-sm font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
          Choose your
        </p>
        <h1
          className="text-4xl font-black tracking-tight leading-none"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            background:
              "linear-gradient(90deg, hsl(42,100%,52%) 0%, hsl(52,100%,78%) 30%, hsl(45,100%,65%) 50%, hsl(36,90%,45%) 70%, hsl(48,100%,70%) 85%, hsl(42,100%,52%) 100%)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: "gold-shimmer 2.8s linear infinite",
            filter: "drop-shadow(0 0 12px hsla(44,100%,58%,0.4))",
          }}
        >
          Plan
        </h1>
        <p className="mt-2 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          Unlock more power with a premium plan.
        </p>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan, idx) => {
          const PlanIcon = plan.icon;
          return (
            <div
              key={plan.id}
              className="glass-card animate-card-entrance rounded-2xl flex flex-col overflow-hidden relative"
              style={{
                animationDelay: `${80 + idx * 80}ms`,
                animationFillMode: "both",
                border: `1px solid ${plan.border}`,
                boxShadow: plan.popular
                  ? `0 0 30px ${plan.glow}, 0 0 60px ${plan.glow}`
                  : `0 0 20px ${plan.glow}`,
              }}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div
                  className="absolute top-3 right-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    background: "hsla(44,90%,45%,0.2)",
                    border: "1px solid hsla(44,80%,55%,0.4)",
                    color: "hsl(48,100%,70%)",
                  }}
                >
                  <Sparkles size={10} />
                  Popular
                </div>
              )}

              {/* Header */}
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className="rounded-xl p-2"
                    style={{ background: plan.accent }}
                  >
                    <PlanIcon
                      size={16}
                      style={{
                        color: plan.popular ? "hsl(48,100%,65%)" : "hsl(var(--primary))",
                        filter: plan.popular
                          ? "drop-shadow(0 0 6px hsla(44,100%,58%,0.8))"
                          : "drop-shadow(0 0 4px hsla(315,90%,60%,0.55))",
                      }}
                    />
                  </div>
                  <h2
                    className="text-lg font-bold tracking-tight"
                    style={{
                      color: plan.popular ? "hsl(48,100%,68%)" : "hsl(var(--foreground))",
                    }}
                  >
                    {plan.name}
                  </h2>
                </div>

                <p className="text-xs mb-4" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {plan.description}
                </p>

                {/* Price */}
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-3xl font-black tracking-tight"
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      color: plan.popular ? "hsl(48,100%,70%)" : "hsl(var(--foreground))",
                      textShadow: plan.popular
                        ? "0 0 20px hsla(44,100%,58%,0.35)"
                        : "0 0 20px hsla(315,90%,72%,0.15)",
                    }}
                  >
                    {plan.price}
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: "hsl(var(--muted-foreground))" }}
                  >
                    {plan.period}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div
                style={{
                  height: 1,
                  margin: "0 20px",
                  background: plan.border,
                }}
              />

              {/* Features */}
              <div className="flex-1 px-5 py-4 flex flex-col gap-2.5">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2.5">
                    <Check
                      size={13}
                      style={{
                        flexShrink: 0,
                        color: plan.popular ? "hsl(48,100%,65%)" : "hsl(var(--primary))",
                        filter: plan.popular
                          ? "drop-shadow(0 0 4px hsla(44,100%,58%,0.6))"
                          : "drop-shadow(0 0 3px hsla(315,90%,60%,0.4))",
                      }}
                    />
                    <span
                      className="text-xs font-medium"
                      style={{ color: "hsl(var(--foreground))", opacity: 0.85 }}
                    >
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="px-5 pb-5 pt-2">
                <button
                  type="button"
                  className="w-full rounded-xl py-2.5 text-sm font-bold tracking-wide transition-all duration-200"
                  style={{
                    background: plan.current
                      ? "transparent"
                      : plan.popular
                        ? "linear-gradient(135deg, hsl(42,100%,48%), hsl(48,100%,58%))"
                        : "hsla(315,70%,45%,0.25)",
                    border: plan.current
                      ? `1px solid ${plan.border}`
                      : plan.popular
                        ? "1px solid hsla(44,80%,55%,0.5)"
                        : `1px solid ${plan.border}`,
                    color: plan.current
                      ? "hsl(var(--muted-foreground))"
                      : plan.popular
                        ? "hsl(20,15%,10%)"
                        : "hsl(var(--foreground))",
                    boxShadow: plan.current
                      ? "none"
                      : plan.popular
                        ? "0 0 20px hsla(44,100%,55%,0.3)"
                        : `0 0 12px ${plan.glow}`,
                    cursor: plan.current ? "default" : "pointer",
                  }}
                >
                  {plan.current ? "Current Plan" : "Upgrade"}
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
