import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import CreditsCheckoutPage from "./CreditsCheckoutPage";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
/* ─── Animated counter hook ─── */
function useCountUp(target: number, duration = 1400, delay = 0) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setValue(0);
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
import {
  User,
  Hash,
  Zap,
  ArrowDownLeft,
  Gift,
  Copy,
  Check,
  ShieldCheck,
  LogOut,
  Link2,
  Users,
  CreditCard,
  Clock,
  Target,
  Diamond,
} from "lucide-react";
import logoCharacter from "@/assets/logo-character.jpg";
import { usePlan } from "@/contexts/PlanContext";

// Fallback defaults
const FALLBACK = {
  name: "User",
  telegramId: "—",
  username: "@unknown",
  avatarUrl: logoCharacter,
  joinedDate: "—",
  credits: 0,
  plan: "Free",
  referralCode: "",
  referralCount: 0,
  referralLink: "",
};

type PaymentStatus = "pending" | "approved" | "rejected";

interface PaymentRecord {
  id: string;
  plan: string;
  amount_usd: number;
  crypto_currency: string;
  tx_hash: string | null;
  status: string;
  created_at: string;
}

const STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string; bg: string; Icon: typeof Clock }> = {
  pending:  { label: "Pending",  color: "hsl(44,100%,65%)",  bg: "hsla(44,80%,30%,0.25)",  Icon: Clock        },
  approved: { label: "Approved", color: "hsl(142,70%,55%)",  bg: "hsla(142,60%,20%,0.25)", Icon: Check        },
  rejected: { label: "Rejected", color: "hsl(0,75%,60%)",    bg: "hsla(0,65%,20%,0.25)",   Icon: Target       },
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
  const { activePlan, isPlanActive, planExpiresAt } = usePlan();
  const { profile, signOut, user: authUser } = useAuth();
  const navigate = useNavigate();
  const [copiedId, setCopiedId]           = useState(false);
  const [copiedRef, setCopiedRef]         = useState(false);
  const [loggingOut, setLoggingOut]       = useState(false);
  const [loggedOut, setLoggedOut]         = useState(false);
  const [creditsBarWidth, setCreditsBarWidth] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [showCreditsCheckout, setShowCreditsCheckout] = useState(false);

  useEffect(() => {
    if (!authUser) return;
    supabase.rpc("has_role", { _user_id: authUser.id, _role: "admin" as any }).then(({ data, error }) => {
      if (!error) setIsAdmin(!!data);
    });
    Promise.all([
      supabase.rpc("has_role", { _user_id: authUser.id, _role: "owner" as any }),
      supabase.rpc("is_primary_owner", { _user_id: authUser.id }),
    ]).then(([ownerRes, primaryRes]) => {
      setIsOwner(!!ownerRes.data || !!primaryRes.data);
    });
  }, [authUser]);

  // Fetch payment history
  useEffect(() => {
    if (!authUser) return;
    setPaymentsLoading(true);
    supabase
      .from("payments")
      .select("id, plan, amount_usd, crypto_currency, tx_hash, status, created_at")
      .eq("user_id", authUser.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setPayments((data as PaymentRecord[]) || []);
        setPaymentsLoading(false);
      });
  }, [authUser]);

  const displayName = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ""}`
    : profile?.username || FALLBACK.name;

  const user = {
    name: displayName,
    telegramId: profile?.telegram_id || FALLBACK.telegramId,
    username: profile?.username ? `@${profile.username}` : FALLBACK.username,
    avatarUrl: profile?.avatar_url || FALLBACK.avatarUrl,
    joinedDate: profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : FALLBACK.joinedDate,
    credits: profile?.credits ?? FALLBACK.credits,
    plan: activePlan?.name ?? "None",
    referralCode: profile?.referral_code || FALLBACK.referralCode,
    referralCount: 0,
    referralLink: profile?.referral_code ? `https://t.me/ChkXdAdmBot?start=${profile.referral_code}` : FALLBACK.referralLink,
  };

  // Animated counters
  const creditsCount         = useCountUp(user.credits,              1600, 200);
  const referralFriendsCount = useCountUp(user.referralCount,        1200, 350);
  const referralCreditsCount = useCountUp(user.referralCount * 100,  1400, 450);

  useEffect(() => {
    const t = setTimeout(() => setCreditsBarWidth(7), 120);
    return () => clearTimeout(t);
  }, []);

  const handleLogout = async () => {
    if (loggingOut || loggedOut) return;
    setLoggingOut(true);
    await signOut();
    navigate("/");
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(user.telegramId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {}
  };

  const handleCopyRef = async () => {
    try {
      await navigator.clipboard.writeText(user.referralLink);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {}
  };

  if (showCreditsCheckout) {
    return (
      <div className="flex flex-col gap-6 w-full">
        <CreditsCheckoutPage onBack={() => setShowCreditsCheckout(false)} />
      </div>
    );
  }

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

          {/* Luxury gold aura */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: isOwner ? 130 : 110,
              height: isOwner ? 130 : 110,
              borderRadius: "50%",
              background: "transparent",
              boxShadow: isOwner
                ? "0 0 0 2px hsla(42,80%,50%,0.4), 0 0 24px 6px hsla(42,80%,48%,0.18), 0 0 60px 14px hsla(42,70%,40%,0.08)"
                : "0 0 0 4px hsla(44,100%,58%,0.35), 0 0 22px 6px hsla(44,100%,55%,0.30), 0 0 50px 14px hsla(42,100%,50%,0.16)",
              animation: isOwner ? "royal-aura-breathe 3.5s ease-in-out infinite" : "gold-aura-pulse 2.4s ease-in-out infinite",
              zIndex: 0,
            }}
          />

          {/* Owner-only subtle outer ring */}
          {isOwner && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 148,
                height: 148,
                borderRadius: "50%",
                border: "1px solid hsla(42,70%,50%,0.15)",
                boxShadow: "0 0 20px 4px hsla(42,60%,45%,0.06)",
                animation: "royal-aura-breathe 3.5s ease-in-out infinite 0.5s",
                zIndex: 0,
              }}
            />
          )}

          {/* Non-owner second ring */}
          {!isOwner && (
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
          )}

          {/* Avatar ring */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              width: 90,
              height: 90,
              borderRadius: "50%",
              padding: 3,
              background: isOwner
                ? "linear-gradient(135deg, hsl(42,80%,55%) 0%, hsl(36,70%,40%) 40%, hsl(44,85%,58%) 60%, hsl(38,75%,42%) 100%)"
                : "linear-gradient(135deg, hsl(48,100%,72%) 0%, hsl(42,100%,52%) 35%, hsl(52,100%,78%) 55%, hsl(36,90%,40%) 80%, hsl(48,100%,68%) 100%)",
              boxShadow: isOwner
                ? "0 0 14px 4px hsla(42,80%,50%,0.5), 0 0 30px 8px hsla(42,70%,45%,0.2)"
                : "0 0 12px 3px hsla(44,100%,56%,0.55), 0 0 28px 6px hsla(44,100%,52%,0.28)",
              animation: "avatar-ring-breathe 2.8s ease-in-out infinite",
            }}
          >
            <div className="rounded-full overflow-hidden w-full h-full">
              {user.avatarUrl && user.avatarUrl !== logoCharacter ? (
                <img
                  src={user.avatarUrl}
                  alt="Profile avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, hsla(315,90%,45%,0.4) 0%, hsla(330,18%,8%,0.9) 100%)",
                  }}
                >
                  <User
                    size={38}
                    strokeWidth={1.5}
                    style={{
                      color: "hsl(var(--primary))",
                      filter: "drop-shadow(0 0 8px hsla(315,90%,55%,0.5))",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          {/* Verified/Owner badge */}
          <div
            className="absolute -bottom-1 -right-1 rounded-full p-1"
            style={{
              background: isOwner ? "linear-gradient(135deg, hsl(42,75%,50%), hsl(36,65%,38%))" : "hsl(315,95%,45%)",
              border: isOwner ? "2px solid hsl(330,15%,5%)" : "2px solid hsl(var(--background))",
              boxShadow: isOwner
                ? "0 0 8px hsla(42,80%,50%,0.5)"
                : "0 0 8px hsla(315,90%,55%,0.5)",
            }}
          >
            {isOwner ? (
              <span style={{ fontSize: 11, lineHeight: 1 }}>👑</span>
            ) : (
              <ShieldCheck size={12} style={{ color: "#fff" }} />
            )}
          </div>
        </div>

        {/* Name & username */}
        <div className="text-center">
          <h2
            className="text-2xl font-black"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: "-0.02em",
              background: isOwner
                ? "linear-gradient(90deg, hsl(42,75%,50%) 0%, hsl(48,85%,65%) 30%, hsl(44,80%,58%) 50%, hsl(36,70%,42%) 70%, hsl(42,75%,50%) 100%)"
                : "linear-gradient(90deg, hsl(42,100%,52%) 0%, hsl(52,100%,78%) 30%, hsl(45,100%,65%) 50%, hsl(36,90%,45%) 70%, hsl(48,100%,70%) 85%, hsl(42,100%,52%) 100%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "gold-shimmer 2.8s linear infinite",
              filter: isOwner ? "drop-shadow(0 0 10px hsla(42,75%,50%,0.5))" : "drop-shadow(0 0 10px hsla(44,100%,58%,0.55))",
            }}
          >
            {user.name}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
            {user.username}
          </p>
        </div>

        {/* Role + Plan badges */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {isOwner && (
            <div
              className="flex items-center gap-2 rounded-full px-4 py-1.5 relative overflow-hidden"
              style={{
                background: "hsla(42,60%,18%,0.5)",
                border: "1px solid hsla(42,70%,48%,0.35)",
                boxShadow: "0 0 12px hsla(42,70%,45%,0.15)",
              }}
            >
              {/* Subtle gold sweep */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(105deg, transparent 35%, hsla(42,80%,65%,0.1) 48%, transparent 60%)",
                  animation: "owner-holo-sweep 4s linear infinite",
                }}
              />
              <span style={{ fontSize: 14, zIndex: 1 }}>👑</span>
              <span
                className="text-xs font-bold uppercase tracking-widest relative z-10"
                style={{
                  color: "hsl(42,70%,60%)",
                  letterSpacing: "0.15em",
                }}
              >
                Owner
              </span>
            </div>
          )}
          {isAdmin && !isOwner && (
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1"
              style={{
                background: "hsla(44,100%,50%,0.15)",
                border: "1px solid hsla(44,100%,58%,0.4)",
                boxShadow: "0 0 10px hsla(44,100%,55%,0.2)",
              }}
            >
              <svg width="13" height="10" viewBox="0 0 48 36" fill="none" style={{ flexShrink: 0 }}>
                <path d="M4 30 L4 22 L12 8 L24 18 L36 8 L44 22 L44 30 Z" fill="hsl(44,100%,58%)" stroke="hsl(45,100%,75%)" strokeWidth="1.2" strokeLinejoin="round"/>
                <rect x="4" y="27" width="40" height="5" rx="2" fill="hsl(42,90%,48%)" stroke="hsl(45,100%,75%)" strokeWidth="0.8"/>
                <circle cx="24" cy="24" r="3" fill="hsl(315,95%,65%)"/>
              </svg>
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{
                  background: "linear-gradient(90deg, hsl(42,100%,52%), hsl(52,100%,78%), hsl(42,100%,52%))",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  animation: "gold-shimmer 2.8s linear infinite",
                }}
              >
                Admin
              </span>
            </div>
          )}
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1"
            style={{
              background: "hsla(315,80%,40%,0.2)",
              border: "1px solid hsla(315,70%,55%,0.35)",
            }}
          >
            <Zap size={12} style={{ color: "hsl(var(--primary))" }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "hsl(var(--primary))" }}>
              {activePlan?.name ?? "No"} Plan
            </span>
          </div>
        </div>

        {/* Plan Details */}
        <div
          className="w-full rounded-xl overflow-hidden"
          style={{
            background: "hsla(330,18%,6%,0.7)",
            border: "1px solid hsla(44,80%,55%,0.2)",
          }}
        >
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 border-b"
            style={{ borderColor: "hsla(44,60%,40%,0.15)" }}
          >
            <Diamond
              size={13}
              style={{
                color: "hsl(48,100%,65%)",
                filter: "drop-shadow(0 0 4px hsla(44,100%,58%,0.6))",
              }}
            />
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Plan Details
            </span>
          </div>
          <div className="grid grid-cols-3 divide-x" style={{ borderColor: "hsla(44,60%,40%,0.12)" }}>
            {(() => {
              const daysLeft = planExpiresAt ? Math.max(0, Math.ceil((new Date(planExpiresAt).getTime() - Date.now()) / 86400000)) : 0;
              return [
                { icon: CreditCard, label: "Price", value: activePlan?.price ?? "—", color: "hsl(var(--primary))", bg: "hsla(315,80%,40%,0.15)" },
                { icon: Zap, label: "Duration", value: isPlanActive ? `${daysLeft}d left` : "—", color: "hsl(48,100%,65%)", bg: "hsla(44,80%,40%,0.15)" },
                { icon: Clock, label: "Status", value: isPlanActive ? "Active" : "Expired", color: isPlanActive ? "hsl(142,70%,55%)" : "hsl(0,75%,60%)", bg: isPlanActive ? "hsla(142,60%,30%,0.15)" : "hsla(0,60%,30%,0.15)" },
              ];
            })().map((item) => {
              const ItemIcon = item.icon;
              return (
                <div key={item.label} className="flex flex-col items-center gap-1.5 py-3 px-2" style={{ borderColor: "hsla(44,60%,40%,0.12)" }}>
                  <div className="rounded-lg p-1.5" style={{ background: item.bg }}>
                    <ItemIcon size={13} style={{ color: item.color, filter: `drop-shadow(0 0 4px ${item.color})` }} />
                  </div>
                  <p
                    className="text-sm font-bold tabular-nums"
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      color: item.color,
                      textShadow: `0 0 12px ${item.color}44`,
                    }}
                  >
                    {item.value}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>
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
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
            Credits Balance
          </p>
          <button
            type="button"
            onClick={() => setShowCreditsCheckout(true)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all"
            style={{
              background: "hsla(315,80%,40%,0.2)",
              border: "1px solid hsla(315,70%,55%,0.35)",
              color: "hsl(var(--primary))",
            }}
          >
            <Zap size={11} />
            Top Up
          </button>
        </div>

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
              {creditsCount.toLocaleString()}
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
            <span style={{ color: "hsl(var(--foreground))" }}>{creditsCount.toLocaleString()} credits</span>
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

      {/* ── Referral Section ── */}
      <div
        className="glass-card animate-card-entrance rounded-2xl p-6"
        style={{ animationDelay: "120ms", animationFillMode: "both" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="rounded-xl p-2" style={{ background: "hsla(44,90%,45%,0.15)" }}>
              <Users size={16} style={{ color: "hsl(48,100%,65%)", filter: "drop-shadow(0 0 5px hsla(44,100%,58%,0.6))" }} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
              Referral Program
            </p>
          </div>
          {/* Referral count badge */}
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1"
            style={{
              background: "hsla(44,90%,45%,0.14)",
              border: "1px solid hsla(44,90%,55%,0.32)",
            }}
          >
            <Users size={10} style={{ color: "hsl(48,100%,68%)" }} />
            <span className="text-xs font-bold" style={{ color: "hsl(48,100%,70%)" }}>
              {user.referralCount} referred
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div
          className="grid grid-cols-2 gap-3 mb-5 rounded-xl p-3"
          style={{ background: "hsla(44,80%,40%,0.07)", border: "1px solid hsla(44,80%,50%,0.12)" }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <p
              className="text-2xl font-black tabular-nums"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                background: "linear-gradient(90deg, hsl(42,100%,52%) 0%, hsl(52,100%,78%) 50%, hsl(42,100%,52%) 100%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "gold-shimmer 2.8s linear infinite",
              }}
            >
              {referralFriendsCount}
            </p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Friends joined</p>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <p
              className="text-2xl font-black tabular-nums"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                background: "linear-gradient(90deg, hsl(42,100%,52%) 0%, hsl(52,100%,78%) 50%, hsl(42,100%,52%) 100%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "gold-shimmer 2.8s linear infinite",
              }}
            >
              +{referralCreditsCount}
            </p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Credits earned</p>
          </div>
        </div>

        {/* Referral link row */}
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-3"
          style={{ background: "hsla(330,18%,6%,0.7)", border: "1px solid hsla(44,60%,40%,0.22)" }}
        >
          <div className="rounded-lg p-2" style={{ background: "hsla(44,80%,40%,0.14)" }}>
            <Link2 size={13} style={{ color: "hsl(48,100%,65%)", filter: "drop-shadow(0 0 4px hsla(44,100%,58%,0.55))" }} />
          </div>
          <p
            className="flex-1 text-xs font-mono truncate"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            {user.referralLink}
          </p>
          <button
            onClick={handleCopyRef}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: copiedRef
                ? "hsla(142,60%,20%,0.45)"
                : "linear-gradient(135deg, hsla(44,90%,48%,0.30), hsla(42,80%,36%,0.20))",
              border: copiedRef
                ? "1px solid hsla(142,60%,45%,0.5)"
                : "1px solid hsla(44,90%,58%,0.40)",
              color: copiedRef ? "hsl(142,70%,60%)" : "hsl(48,100%,68%)",
              boxShadow: copiedRef
                ? "0 0 12px hsla(142,70%,50%,0.25)"
                : "0 0 12px hsla(44,100%,55%,0.22)",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
            }}
          >
            {copiedRef ? <Check size={12} /> : <Copy size={12} />}
            {copiedRef ? "Copied!" : "Copy link"}
          </button>
        </div>

        {/* Earn-per-referral note */}
        <p className="text-center text-[10px] mt-3" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.7 }}>
          Earn&nbsp;
          <span style={{ color: "hsl(48,100%,65%)", fontWeight: 700 }}>+100 credits</span>
          &nbsp;for every friend who joins via your link
        </p>
      </div>

      {/* ── Payment History ── */}
      <div
        className="glass-card animate-card-entrance rounded-2xl overflow-hidden"
        style={{ animationDelay: "140ms", animationFillMode: "both" }}
      >
        <div
          className="px-5 py-4 border-b"
          style={{ borderColor: "hsla(315,30%,25%,0.2)" }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
            Payment History
          </h2>
        </div>

        <div className="flex flex-col divide-y" style={{ maxHeight: 380, overflowY: "auto" }}>
          {paymentsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4">
                <div className="shrink-0 rounded-xl w-9 h-9" style={{ background: "hsla(315,30%,20%,0.3)", animation: `pulse 1.5s ease-in-out ${i * 0.15}s infinite` }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 rounded-full w-2/3" style={{ background: "hsla(315,30%,20%,0.3)", animation: `pulse 1.5s ease-in-out ${i * 0.15}s infinite` }} />
                  <div className="h-2.5 rounded-full w-1/3" style={{ background: "hsla(315,30%,20%,0.2)", animation: `pulse 1.5s ease-in-out ${i * 0.15}s infinite` }} />
                </div>
              </div>
            ))
          ) : payments.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <CreditCard size={24} style={{ color: "hsl(var(--muted-foreground))", opacity: 0.4, margin: "0 auto 8px" }} />
              <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>No payments yet</p>
            </div>
          ) : (
            payments.map((p) => {
              const status = (p.status as PaymentStatus) || "pending";
              const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
              const StatusIcon = cfg.Icon;
              const date = new Date(p.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors"
                  style={{ borderColor: "hsla(315,20%,15%,0.4)" }}
                >
                  {/* Status icon */}
                  <div
                    className="shrink-0 rounded-xl p-2"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.color}33` }}
                  >
                    <StatusIcon size={14} style={{ color: cfg.color }} />
                  </div>

                  {/* Plan + date + tx hash */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>
                      {p.plan.charAt(0).toUpperCase() + p.plan.slice(1)} Plan · {p.crypto_currency}
                    </p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {date}
                      {p.tx_hash && (
                        <span className="ml-1.5 font-mono opacity-60">
                          TX: {p.tx_hash.slice(0, 10)}…
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Amount + status badge */}
                  <div className="shrink-0 text-right flex flex-col items-end gap-1">
                    <p
                      className="text-sm font-black"
                      style={{ color: "hsl(48,100%,68%)", fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      ${p.amount_usd}
                    </p>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
                      style={{
                        background: cfg.bg,
                        color: cfg.color,
                        border: `1px solid ${cfg.color}44`,
                      }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                </div>
              );
            })
          )}
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
