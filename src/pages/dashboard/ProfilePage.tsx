import { useState, useEffect, useRef } from "react";
import {
  User,
  Hash,
  Zap,
  ArrowDownLeft,
  ArrowUpRight,
  Gift,
  Copy,
  Check,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import logoCharacter from "@/assets/logo-character.jpg";

// ─── Mock Telegram user data ───────────────────────────────────────────────
const MOCK_USER = {
  name: "0xAdam",
  telegramId: "1047382910",
  username: "@0xadam_checker",
  avatarUrl: logoCharacter,
  joinedDate: "Jan 2026",
  credits: 2_480,
  plan: "Pro",
};

type TxType = "credit" | "debit" | "bonus";

interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  description: string;
  date: string;
  balance: number;
}

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: "tx001", type: "credit", amount: 1000, description: "Top-up via Crypto",         date: "20 Feb 2026, 18:42", balance: 2480 },
  { id: "tx002", type: "debit",  amount: -50,  description: "Mass Check · 50 cards",     date: "20 Feb 2026, 17:11", balance: 1480 },
  { id: "tx003", type: "bonus",  amount: 30,   description: "Referral bonus · @user123", date: "19 Feb 2026, 09:00", balance: 1530 },
  { id: "tx004", type: "debit",  amount: -120, description: "Mass Check · 120 cards",    date: "18 Feb 2026, 22:37", balance: 1500 },
  { id: "tx005", type: "credit", amount: 500,  description: "Top-up via Crypto",         date: "17 Feb 2026, 14:05", balance: 1620 },
  { id: "tx006", type: "debit",  amount: -10,  description: "Single Check",              date: "16 Feb 2026, 11:00", balance: 1120 },
  { id: "tx007", type: "bonus",  amount: 100,  description: "Welcome bonus",             date: "15 Feb 2026, 08:30", balance: 1130 },
  { id: "tx008", type: "credit", amount: 1000, description: "Initial top-up",            date: "15 Feb 2026, 08:00", balance: 1030 },
];

const TX_CONFIG: Record<TxType, { color: string; bg: string; Icon: typeof ArrowDownLeft }> = {
  credit: { color: "hsl(142,70%,55%)",  bg: "hsla(142,60%,20%,0.25)", Icon: ArrowDownLeft  },
  debit:  { color: "hsl(0,75%,60%)",    bg: "hsla(0,65%,20%,0.25)",   Icon: ArrowUpRight   },
  bonus:  { color: "hsl(315,95%,65%)",  bg: "hsla(315,80%,30%,0.2)",  Icon: Gift           },
};

/* ─── Crown Sparkles ─── */
type CrownParticle = {
  id: number;
  x: number;       // % offset from center
  sx: number;      // horizontal drift px
  size: number;
  opacity: number;
  duration: number; // ms
  delay: number;    // ms
  color: string;
  shape: "star" | "dot" | "diamond";
};

const GOLD_COLORS = [
  "hsl(48,100%,72%)", "hsl(44,100%,65%)", "hsl(42,100%,55%)",
  "hsl(52,100%,78%)", "hsl(38,95%,60%)",  "hsl(0,0%,100%)",
];

let _pid = 0;
const makeParticle = (): CrownParticle => ({
  id: _pid++,
  x: Math.random() * 80 - 40,
  sx: Math.random() * 20 - 10,
  size: 4 + Math.random() * 5,
  opacity: 0.7 + Math.random() * 0.3,
  duration: 1400 + Math.random() * 1000,
  delay: 0,
  color: GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)],
  shape: (["star", "dot", "diamond"] as const)[Math.floor(Math.random() * 3)],
});

const CrownSparkles = () => {
  const [particles, setParticles] = useState<CrownParticle[]>(() =>
    Array.from({ length: 6 }, makeParticle)
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      const p = makeParticle();
      setParticles((prev) => [...prev.slice(-10), p]);
    }, 320);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return (
    <div
      className="pointer-events-none absolute"
      style={{ top: -44, left: "50%", width: 0, height: 0, zIndex: 20 }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}px`,
            top: 0,
            width: p.size,
            height: p.size,
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
            opacity: p.opacity,
            ["--sx" as string]: `${p.sx}px`,
            animation: `crown-sparkle-drift ${p.duration}ms cubic-bezier(0.25,0.46,0.45,0.94) forwards`,
            filter: `drop-shadow(0 0 3px ${p.color})`,
          }}
        >
          {p.shape === "star" && (
            <svg viewBox="0 0 10 10" width={p.size} height={p.size}>
              <polygon points="5,0 6,3.5 10,3.5 7,6 8,10 5,7.5 2,10 3,6 0,3.5 4,3.5" fill={p.color} />
            </svg>
          )}
          {p.shape === "dot" && (
            <div style={{ width: p.size, height: p.size, borderRadius: "50%", background: p.color }} />
          )}
          {p.shape === "diamond" && (
            <div style={{ width: p.size, height: p.size, background: p.color, transform: "rotate(45deg)" }} />
          )}
        </div>
      ))}
    </div>
  );
};

const ProfilePage = () => {
  const [copiedId, setCopiedId] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);
  const [creditsBarWidth, setCreditsBarWidth] = useState(0);
  const user = MOCK_USER;

  // Animate credits bar from 0 → 7% on mount
  useEffect(() => {
    const t = setTimeout(() => setCreditsBarWidth(7), 120);
    return () => clearTimeout(t);
  }, []);

  const handleLogout = async () => {
    if (loggingOut || loggedOut) return;
    setLoggingOut(true);
    await new Promise((r) => setTimeout(r, 1400));
    setLoggingOut(false);
    setLoggedOut(true);
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(user.telegramId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {}
  };

  return (
    <div className="flex flex-col gap-6 w-full">

      {/* ── Profile Card ── */}
      <div
        className="glass-card animate-card-entrance rounded-2xl p-6 flex flex-col items-center gap-4"
        style={{ animationDelay: "0ms", animationFillMode: "both" }}
      >
        {/* Avatar + Crown */}
        <div className="relative flex flex-col items-center">
          <CrownSparkles />
          {/* Rotating tilted golden crown */}
          <div
          style={{
              position: "absolute",
              top: -38,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10,
              animation: "crown-tilt 3.6s ease-in-out infinite, crown-bob 2.2s ease-in-out infinite",
              transformOrigin: "center bottom",
              filter: "drop-shadow(0 0 8px hsla(45,100%,55%,0.85)) drop-shadow(0 0 18px hsla(45,90%,50%,0.5))",
            }}
          >
            <svg width="48" height="36" viewBox="0 0 48 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Crown base */}
              <path
                d="M4 30 L4 22 L12 8 L24 18 L36 8 L44 22 L44 30 Z"
                fill="url(#crownGrad)"
                stroke="hsl(45,100%,75%)"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              {/* Band */}
              <rect x="4" y="27" width="40" height="5" rx="2" fill="url(#bandGrad)" stroke="hsl(45,100%,75%)" strokeWidth="0.8"/>
              {/* Jewels */}
              <circle cx="24" cy="24" r="3" fill="hsl(315,95%,65%)" style={{ filter: "drop-shadow(0 0 4px hsl(315,95%,65%))" }}/>
              <circle cx="11" cy="27" r="2" fill="hsl(200,90%,65%)" />
              <circle cx="37" cy="27" r="2" fill="hsl(142,70%,60%)" />
              {/* Top balls */}
              <circle cx="12" cy="8"  r="3" fill="url(#crownGrad)" stroke="hsl(45,100%,80%)" strokeWidth="1"/>
              <circle cx="24" cy="18" r="3" fill="url(#crownGrad)" stroke="hsl(45,100%,80%)" strokeWidth="1"/>
              <circle cx="36" cy="8"  r="3" fill="url(#crownGrad)" stroke="hsl(45,100%,80%)" strokeWidth="1"/>
              {/* Shine */}
              <ellipse cx="18" cy="15" rx="5" ry="2" fill="hsla(0,0%,100%,0.18)" transform="rotate(-20 18 15)"/>
              <defs>
                <linearGradient id="crownGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="hsl(48,100%,72%)"/>
                  <stop offset="50%"  stopColor="hsl(42,100%,52%)"/>
                  <stop offset="100%" stopColor="hsl(36,90%,38%)"/>
                </linearGradient>
                <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="hsl(44,100%,58%)"/>
                  <stop offset="100%" stopColor="hsl(36,90%,40%)"/>
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Gold aura ring — sits behind avatar */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 110,
              height: 110,
              borderRadius: "50%",
              background: "transparent",
              boxShadow:
                "0 0 0 4px hsla(44,100%,58%,0.35), 0 0 22px 6px hsla(44,100%,55%,0.30), 0 0 50px 14px hsla(42,100%,50%,0.16)",
              animation: "gold-aura-pulse 2.4s ease-in-out infinite",
              zIndex: 0,
            }}
          />
          {/* Second softer outer ring */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 130,
              height: 130,
              borderRadius: "50%",
              background: "transparent",
              boxShadow: "0 0 30px 10px hsla(44,100%,52%,0.10)",
              animation: "gold-aura-pulse 2.4s ease-in-out infinite 0.6s",
              zIndex: 0,
            }}
          />

          {/* Avatar ring */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              width: 90,
              height: 90,
              borderRadius: "50%",
              padding: 3,
              background: "linear-gradient(135deg, hsl(48,100%,72%) 0%, hsl(42,100%,52%) 35%, hsl(52,100%,78%) 55%, hsl(36,90%,40%) 80%, hsl(48,100%,68%) 100%)",
              boxShadow:
                "0 0 12px 3px hsla(44,100%,56%,0.55), 0 0 28px 6px hsla(44,100%,52%,0.28)",
              animation: "avatar-ring-breathe 2.8s ease-in-out infinite",
            }}
          >
            <div className="rounded-full overflow-hidden w-full h-full">
              <img
                src={user.avatarUrl}
                alt="Profile avatar"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          {/* Verified badge */}
          <div
            className="absolute -bottom-1 -right-1 rounded-full p-1"
            style={{
              background: "hsl(315,95%,45%)",
              border: "2px solid hsl(var(--background))",
              boxShadow: "0 0 8px hsla(315,90%,55%,0.5)",
            }}
          >
            <ShieldCheck size={12} style={{ color: "#fff" }} />
          </div>
        </div>

        {/* Name & username */}
        <div className="text-center">
          <h2
            className="text-2xl font-black"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: "-0.02em",
              background: "linear-gradient(90deg, hsl(42,100%,52%) 0%, hsl(52,100%,78%) 30%, hsl(45,100%,65%) 50%, hsl(36,90%,45%) 70%, hsl(48,100%,70%) 85%, hsl(42,100%,52%) 100%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "gold-shimmer 2.8s linear infinite",
              filter: "drop-shadow(0 0 10px hsla(44,100%,58%,0.55))",
            }}
          >
            {user.name}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
            {user.username}
          </p>
        </div>

        {/* Plan badge */}
        <div
          className="flex items-center gap-1.5 rounded-full px-3 py-1"
          style={{
            background: "hsla(315,80%,40%,0.2)",
            border: "1px solid hsla(315,70%,55%,0.35)",
          }}
        >
          <Zap size={12} style={{ color: "hsl(var(--primary))" }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "hsl(var(--primary))" }}>
            {user.plan} Plan
          </span>
        </div>

        {/* Info grid */}
        <div className="w-full grid grid-cols-1 gap-3 mt-1">
          {/* Telegram ID */}
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: "hsla(330,18%,6%,0.7)", border: "1px solid hsla(315,30%,25%,0.25)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="rounded-lg p-2"
                style={{ background: "hsla(315,80%,40%,0.15)" }}
              >
                <Hash size={14} style={{ color: "hsl(var(--primary))" }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Telegram ID</p>
                <p className="text-sm font-mono font-bold" style={{ color: "hsl(var(--foreground))" }}>
                  {user.telegramId}
                </p>
              </div>
            </div>
            <button
              onClick={handleCopyId}
              className="rounded-lg p-2 transition-all duration-200 hover:scale-110"
              style={{
                background: copiedId ? "hsla(142,60%,20%,0.4)" : "hsla(315,40%,15%,0.5)",
                border: "1px solid hsla(315,35%,35%,0.2)",
                color: copiedId ? "hsl(142,70%,60%)" : "hsl(var(--muted-foreground))",
              }}
              title="Copy Telegram ID"
            >
              {copiedId ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>

          {/* Joined date */}
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: "hsla(330,18%,6%,0.7)", border: "1px solid hsla(315,30%,25%,0.25)" }}
          >
            <div
              className="rounded-lg p-2"
              style={{ background: "hsla(315,80%,40%,0.15)" }}
            >
              <User size={14} style={{ color: "hsl(var(--primary))" }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Member Since</p>
              <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                {user.joinedDate}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Credits Balance Card ── */}
      <div
        className="glass-card animate-card-entrance rounded-2xl p-6"
        style={{ animationDelay: "80ms", animationFillMode: "both" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "hsl(var(--muted-foreground))" }}>
          Credits Balance
        </p>

        <div className="flex items-end gap-3">
          <div
            className="rounded-xl p-3"
            style={{ background: "hsla(315,80%,40%,0.15)" }}
          >
            <Zap size={22} style={{ color: "hsl(var(--primary))", filter: "drop-shadow(0 0 8px hsla(315,90%,60%,0.7))" }} />
          </div>
          <div>
            <p
              className="text-4xl font-black leading-none"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                color: "hsl(var(--primary))",
                textShadow: "0 0 20px hsla(315,90%,60%,0.5)",
              }}
            >
              {user.credits.toLocaleString()}
            </p>
            <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
              Available credits
            </p>
          </div>
        </div>

        {/* Credit usage bar */}
        <div className="mt-4 flex flex-col gap-1.5">
          <div className="flex justify-between text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
            <span>Usage this month</span>
            <span style={{ color: "hsl(var(--foreground))" }}>180 / 2,660 used</span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: "hsla(315,40%,20%,0.3)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${creditsBarWidth}%`,
                background: "linear-gradient(90deg, hsl(315,95%,45%), hsl(315,90%,65%))",
                boxShadow: "0 0 10px hsla(315,90%,55%,0.5)",
                transition: "width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Transaction History ── */}
      <div
        className="glass-card animate-card-entrance rounded-2xl overflow-hidden"
        style={{ animationDelay: "140ms", animationFillMode: "both" }}
      >
        <div
          className="px-5 py-4 border-b"
          style={{ borderColor: "hsla(315,30%,25%,0.2)" }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
            Transaction History
          </h2>
        </div>

        <div className="flex flex-col divide-y" style={{ maxHeight: 380, overflowY: "auto" }}>
          {MOCK_TRANSACTIONS.map((tx) => {
            const cfg = TX_CONFIG[tx.type];
            const TxIcon = cfg.Icon;
            return (
              <div
                key={tx.id}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors"
                style={{ borderColor: "hsla(315,20%,15%,0.4)" }}
              >
                {/* Type icon */}
                <div
                  className="shrink-0 rounded-xl p-2"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.color}33` }}
                >
                  <TxIcon size={14} style={{ color: cfg.color }} />
                </div>

                {/* Description + date */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>
                    {tx.description}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {tx.date}
                  </p>
                </div>

                {/* Amount + running balance */}
                <div className="shrink-0 text-right">
                  <p
                    className="text-sm font-black"
                    style={{
                      color: cfg.color,
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  >
                    {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                  </p>
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                    bal: {tx.balance.toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* ── Logout Button ── */}
      <div
        className="animate-card-entrance"
        style={{ animationDelay: "200ms", animationFillMode: "both" }}
      >
        <button
          onClick={handleLogout}
          disabled={loggingOut || loggedOut}
          className="relative w-full rounded-2xl overflow-hidden group transition-all duration-300"
          style={{
            padding: "1px",
            background: loggedOut
              ? "linear-gradient(135deg, hsl(142,70%,45%), hsl(142,60%,35%))"
              : "linear-gradient(135deg, hsl(0,75%,55%), hsl(315,90%,50%))",
            boxShadow: loggedOut
              ? "0 0 24px hsla(142,70%,45%,0.45), 0 0 60px hsla(142,60%,35%,0.2)"
              : "0 0 24px hsla(0,75%,55%,0.45), 0 0 60px hsla(315,80%,45%,0.2)",
          }}
        >
          {/* Animated glow layer */}
          {!loggedOut && (
            <span
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: "linear-gradient(135deg, hsl(0,80%,60%), hsl(315,95%,55%))",
                filter: "blur(8px)",
              }}
            />
          )}

          {/* Inner surface */}
          <span
            className="relative flex items-center justify-center gap-3 rounded-[14px] px-6 py-4"
            style={{
              background: loggedOut
                ? "hsla(142,50%,10%,0.85)"
                : "hsla(0,40%,8%,0.85)",
              backdropFilter: "blur(12px)",
            }}
          >
            {loggingOut ? (
              /* Spinner */
              <>
                <svg
                  className="animate-spin"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ color: "hsl(0,75%,65%)" }}
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="15" strokeLinecap="round" />
                </svg>
                <span
                  className="text-sm font-bold tracking-wide"
                  style={{ color: "hsl(0,75%,65%)" }}
                >
                  Signing out…
                </span>
              </>
            ) : loggedOut ? (
              /* Success state */
              <>
                <Check size={18} style={{ color: "hsl(142,70%,55%)" }} />
                <span
                  className="text-sm font-bold tracking-wide"
                  style={{ color: "hsl(142,70%,55%)" }}
                >
                  Signed out
                </span>
              </>
            ) : (
              /* Default state */
              <>
                <LogOut
                  size={18}
                  className="transition-transform duration-300 group-hover:-translate-x-1"
                  style={{
                    color: "hsl(0,75%,65%)",
                    filter: "drop-shadow(0 0 6px hsla(0,80%,60%,0.7))",
                  }}
                />
                <span
                  className="text-sm font-bold tracking-wide"
                  style={{
                    color: "hsl(0,75%,65%)",
                    textShadow: "0 0 12px hsla(0,80%,60%,0.5)",
                  }}
                >
                  Log Out
                </span>
              </>
            )}
          </span>
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
