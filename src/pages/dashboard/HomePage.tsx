import { Activity, BarChart2, Clock, Zap } from "lucide-react";

const StatCard = ({
  label,
  value,
  icon: Icon,
  delay = 0,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
  delay?: number;
}) => (
  <div
    className="glass-card animate-card-entrance rounded-2xl p-5 flex flex-col gap-2"
    style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
  >
    <div className="flex items-center justify-between">
      <span
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        {label}
      </span>
      <div
        className="rounded-lg p-1.5"
        style={{ background: "hsla(315, 80%, 45%, 0.18)" }}
      >
        <Icon
          size={14}
          style={{
            color: "hsl(var(--primary))",
            filter: "drop-shadow(0 0 4px hsla(315,90%,60%,0.6))",
          }}
        />
      </div>
    </div>
    <p
      className="text-2xl font-extrabold tracking-tight"
      style={{ color: "hsl(var(--foreground))" }}
    >
      {value}
    </p>
  </div>
);

const HomePage = () => {
  return (
    <div className="flex flex-col gap-6">
      {/* Welcome header */}
      <div
        className="animate-card-entrance"
        style={{ animationDelay: "0ms", animationFillMode: "both" }}
      >
        <h1
          className="text-3xl font-extrabold tracking-tight text-glow"
          style={{ color: "hsl(var(--foreground))" }}
        >
          Welcome back,{" "}
          <span style={{ color: "hsl(var(--primary))" }}>0xAdam</span>
        </h1>
        <p className="mt-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          Here's a snapshot of your checker activity.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Checks" value="—" icon={BarChart2} delay={60} />
        <StatCard label="Active Sessions" value="—" icon={Zap} delay={120} />
        <StatCard label="Last Login" value="Just now" icon={Clock} delay={180} />
      </div>

      {/* Recent Activity panel */}
      <div
        className="glass-card animate-card-entrance rounded-2xl p-6"
        style={{ animationDelay: "240ms", animationFillMode: "both" }}
      >
        <h2
          className="text-sm font-semibold uppercase tracking-wider mb-4"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          Recent Activity
        </h2>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div
            className="rounded-full p-4"
            style={{ background: "hsla(315, 80%, 45%, 0.12)" }}
          >
            <Activity
              size={28}
              style={{
                color: "hsl(var(--primary))",
                filter: "drop-shadow(0 0 8px hsla(315,90%,60%,0.6))",
              }}
            />
          </div>
          <p
            className="text-sm font-medium"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            No activity yet — run your first check.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
