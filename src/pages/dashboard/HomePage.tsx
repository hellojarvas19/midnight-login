import { useEffect, useRef, useState } from "react";
import { Activity, BarChart2, CheckCircle, CreditCard, ShieldCheck, Zap } from "lucide-react";

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
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="glass-card animate-card-entrance rounded-2xl p-4 flex flex-col gap-3"
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: "both",
        transform: hovered ? "translateY(-4px) scale(1.01)" : "translateY(0) scale(1)",
        boxShadow: hovered
          ? "0 0 120px hsla(315, 90%, 52%, 0.35), 0 0 200px hsla(315, 80%, 42%, 0.18), 0 0 0 1px hsla(315, 100%, 92%, 0.07) inset, 0 1px 0 hsla(315, 100%, 92%, 0.13) inset, 0 24px 64px hsla(330, 30%, 2%, 0.9)"
          : undefined,
        transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease",
        cursor: "default",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold uppercase tracking-wider leading-tight"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          {label}
        </span>
        <div
          className="rounded-lg p-1.5 shrink-0 flex items-center gap-1"
          style={{ background: "hsla(315, 80%, 45%, 0.18)" }}
        >
          {emoji && (
            <span
              style={{
                display: "inline-block",
                fontSize: 13,
                animation: emojiAnimation,
                lineHeight: 1,
              }}
            >
              {emoji}
            </span>
          )}
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
            background: "linear-gradient(90deg, hsl(315,95%,45%), hsl(315,90%,65%))",
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
  card: string;
  timestamp: Date;
};

const SEED_ACTIVITIES: Omit<ActivityEntry, "id">[] = [
  {
    icon: CheckCircle,
    iconBg: "hsla(315,80%,45%,0.18)",
    label: "Card approved",
    card: "•••• 4242",
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
  },
  {
    icon: CreditCard,
    iconBg: "hsla(315,60%,40%,0.14)",
    label: "Batch processed",
    card: "•••• 1337",
    timestamp: new Date(Date.now() - 1000 * 60 * 8),
  },
  {
    icon: ShieldCheck,
    iconBg: "hsla(315,70%,42%,0.16)",
    label: "Card checked",
    card: "•••• 9981",
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
  { label: "Card approved", card: "•••• 4242" },
  { label: "Card declined", card: "•••• 1234" },
  { label: "Mass run completed", card: "•••• 8800" },
  { label: "Batch processed", card: "•••• 5566" },
  { label: "Card checked", card: "•••• 3391" },
];

const ActivityFeed = () => {
  const [entries, setEntries] = useState<ActivityEntry[]>(
    SEED_ACTIVITIES.map((e, i) => ({ ...e, id: i }))
  );
  const counterRef = useRef(SEED_ACTIVITIES.length);

  useEffect(() => {
    const schedule = () => {
      const delay = 5000 + Math.random() * 4000;
      return setTimeout(() => {
        const template = LIVE_EVENTS[Math.floor(Math.random() * LIVE_EVENTS.length)];
        const newEntry: ActivityEntry = {
          id: counterRef.current++,
          icon: CheckCircle,
          iconBg: "hsla(315,80%,45%,0.18)",
          label: template.label,
          card: template.card,
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
              <p className="text-sm font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>
                {entry.label}
              </p>
              <p className="text-xs font-mono truncate" style={{ color: "hsl(var(--muted-foreground))" }}>
                {entry.card}
              </p>
            </div>
            <span className="text-xs shrink-0 tabular-nums" style={{ color: "hsl(var(--muted-foreground))" }}>
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
      {/* Welcome header — matches Checker page style */}
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
          0xAdam
        </h1>
        <p className="mt-2 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          Here's a live snapshot of your checker activity.
        </p>
      </div>

      {/* Stat cards — 2 cols mobile, 3 cols desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Total Checks"   target={1284} icon={BarChart2}   emoji="📊" emojiAnimation="emoji-bounce 1.6s ease-in-out infinite" delay={60}  />
        <StatCard label="Approved Today" target={3}    icon={CheckCircle} emoji="✅" emojiAnimation="emoji-spin 2.8s linear infinite"         delay={120} />
        <StatCard label="Cards Scanned"  target={847}  icon={CreditCard}  emoji="💳" emojiAnimation="emoji-wobble 2s ease-in-out infinite"     delay={180} />
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
            <span className="text-xs font-medium" style={{ color: "hsl(var(--primary))" }}>
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
