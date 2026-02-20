import { useEffect, useRef, useState } from "react";
import { Activity, BarChart2, Clock, Search, ShieldCheck, Zap } from "lucide-react";

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
        // ease-out cubic
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
  delay = 0,
}: {
  label: string;
  target: number;
  suffix?: string;
  icon: typeof Activity;
  delay?: number;
}) => {
  const count = useCountUp(target, 1600, delay + 300);

  return (
    <div
      className="glass-card animate-card-entrance rounded-2xl p-5 flex flex-col gap-3"
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
        className="text-3xl font-extrabold tracking-tight tabular-nums"
        style={{
          color: "hsl(var(--foreground))",
          textShadow: "0 0 20px hsla(315,90%,72%,0.25)",
        }}
      >
        {count.toLocaleString()}
        {suffix}
      </p>
      {/* Subtle progress bar */}
      <div
        className="h-0.5 rounded-full overflow-hidden"
        style={{ background: "hsla(315,40%,30%,0.3)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-[1600ms] ease-out"
          style={{
            width: `${Math.min((count / target) * 100, 100)}%`,
            background:
              "linear-gradient(90deg, hsl(315,95%,45%), hsl(315,90%,65%))",
            boxShadow: "0 0 8px hsla(315,90%,55%,0.6)",
          }}
        />
      </div>
    </div>
  );
};

/* ─── Activity Feed ─── */
type ActivityEntry = {
  id: number;
  icon: typeof Activity;
  iconBg: string;
  label: string;
  address: string;
  timestamp: Date;
};

const SEED_ACTIVITIES: Omit<ActivityEntry, "id">[] = [
  {
    icon: ShieldCheck,
    iconBg: "hsla(315,80%,45%,0.18)",
    label: "Check completed",
    address: "0x71C7...3Ec1",
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
  },
  {
    icon: Search,
    iconBg: "hsla(315,60%,40%,0.14)",
    label: "Address scanned",
    address: "0xd8dA...6045",
    timestamp: new Date(Date.now() - 1000 * 60 * 8),
  },
  {
    icon: Zap,
    iconBg: "hsla(315,70%,42%,0.16)",
    label: "Quick lookup",
    address: "0xAbCd...1234",
    timestamp: new Date(Date.now() - 1000 * 60 * 21),
  },
];

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

const LIVE_EVENTS = [
  { label: "New check run", address: "0x3fC9...A4b2" },
  { label: "Address flagged", address: "0xBe12...99FF" },
  { label: "Contract scanned", address: "0x1A2B...C3D4" },
  { label: "Wallet analysed", address: "0xFf00...1234" },
];

const ActivityFeed = () => {
  const [entries, setEntries] = useState<ActivityEntry[]>(
    SEED_ACTIVITIES.map((e, i) => ({ ...e, id: i }))
  );
  const counterRef = useRef(SEED_ACTIVITIES.length);

  /* Simulate a new event every 5-9 seconds */
  useEffect(() => {
    const schedule = () => {
      const delay = 5000 + Math.random() * 4000;
      return setTimeout(() => {
        const template =
          LIVE_EVENTS[Math.floor(Math.random() * LIVE_EVENTS.length)];
        const newEntry: ActivityEntry = {
          id: counterRef.current++,
          icon: ShieldCheck,
          iconBg: "hsla(315,80%,45%,0.18)",
          label: template.label,
          address: template.address,
          timestamp: new Date(),
        };
        setEntries((prev) => [newEntry, ...prev].slice(0, 8));
        timerRef.current = schedule();
      }, delay);
    };

    const timerRef: { current: ReturnType<typeof setTimeout> | null } = {
      current: schedule(),
    };
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col divide-y" style={{ borderColor: "hsla(315,20%,20%,0.4)" }}>
      {entries.map((entry, idx) => {
        const EntryIcon = entry.icon;
        return (
          <div
            key={entry.id}
            className="flex items-center gap-3 py-3 transition-all duration-500"
            style={{
              opacity: idx === 0 ? 1 : Math.max(0.35, 1 - idx * 0.1),
              animation: idx === 0 ? "card-entrance 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards" : undefined,
            }}
          >
            <div className="rounded-xl p-2 shrink-0" style={{ background: entry.iconBg }}>
              <EntryIcon
                size={14}
                style={{
                  color: "hsl(var(--primary))",
                  filter: "drop-shadow(0 0 4px hsla(315,90%,60%,0.5))",
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium truncate"
                style={{ color: "hsl(var(--foreground))" }}
              >
                {entry.label}
              </p>
              <p
                className="text-xs font-mono truncate"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                {entry.address}
              </p>
            </div>
            <span
              className="text-xs shrink-0 tabular-nums"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              {timeAgo(entry.timestamp)}
            </span>
          </div>
        );
      })}
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
          Here's a live snapshot of your checker activity.
        </p>
      </div>

      {/* Stat cards with animated counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Checks" target={1284} icon={BarChart2} delay={60} />
        <StatCard label="Active Sessions" target={3} suffix="" icon={Zap} delay={120} />
        <StatCard label="Addresses Scanned" target={847} icon={ShieldCheck} delay={180} />
      </div>

      {/* Live activity feed */}
      <div
        className="glass-card animate-card-entrance rounded-2xl p-6"
        style={{ animationDelay: "240ms", animationFillMode: "both" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Recent Activity
          </h2>
          <div className="flex items-center gap-2">
            <LiveDot />
            <span
              className="text-xs font-medium"
              style={{ color: "hsl(var(--primary))" }}
            >
              Live
            </span>
          </div>
        </div>

        <ActivityFeed />
      </div>
    </div>
  );
};

export default HomePage;
