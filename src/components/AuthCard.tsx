import { useState, useRef, useCallback } from "react";
import { Eye, EyeOff, Mail, Lock, User, Send, AlertCircle } from "lucide-react";
import { z } from "zod";

/* ─── Zod schemas ─── */
const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Passwords do not match",
  path: ["confirm"],
});

type FieldErrors = Record<string, string>;

/* ─── Floating label input ─── */
interface FloatingInputProps {
  id: string;
  type?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  rightElement?: React.ReactNode;
  autoComplete?: string;
  error?: string;
}

const FloatingInput = ({
  id,
  type = "text",
  label,
  value,
  onChange,
  icon,
  rightElement,
  autoComplete,
  error,
}: FloatingInputProps) => {
  const [focused, setFocused] = useState(false);
  const isFloated = focused || value.length > 0;
  const hasError = !!error;

  return (
    <div className="space-y-1">
      <div className="relative group">
        <div
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-300"
          style={{
            color: hasError
              ? "hsl(var(--destructive))"
              : focused
              ? "hsl(var(--primary))"
              : "hsl(var(--muted-foreground))",
          }}
        >
          {icon}
        </div>

        <label
          htmlFor={id}
          className="absolute left-10 pointer-events-none font-medium text-sm transition-all duration-200"
          style={{
            top: isFloated ? "6px" : "50%",
            transform: isFloated ? "translateY(0) scale(0.78)" : "translateY(-50%) scale(1)",
            transformOrigin: "left top",
            color: hasError
              ? "hsl(var(--destructive))"
              : focused
              ? "hsl(var(--primary))"
              : "hsl(var(--muted-foreground))",
            zIndex: 10,
          }}
        >
          {label}
        </label>

        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full rounded-xl px-10 pt-5 pb-2 text-sm text-foreground transition-all duration-300"
          style={{
            height: 54,
            background: hasError
              ? "hsla(0, 60%, 10%, 0.7)"
              : "hsla(330, 12%, 10%, 0.75)",
            border: hasError
              ? "1px solid hsla(0, 72%, 58%, 0.8)"
              : focused
              ? "1px solid hsla(315, 90%, 58%, 0.7)"
              : "1px solid hsla(315, 40%, 45%, 0.25)",
            boxShadow: hasError
              ? "0 0 0 3px hsla(0, 72%, 58%, 0.15), 0 0 20px hsla(0, 72%, 58%, 0.08)"
              : focused
              ? "0 0 0 3px hsla(315, 90%, 58%, 0.15), 0 0 24px hsla(315, 90%, 58%, 0.12)"
              : "none",
            outline: "none",
          }}
        />

        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
        )}
      </div>

      {/* Inline error message */}
      {error && (
        <div
          className="flex items-center gap-1.5 px-1"
          style={{ animation: "fade-in-error 0.2s ease forwards" }}
        >
          <AlertCircle size={12} style={{ color: "hsl(var(--destructive))", flexShrink: 0 }} />
          <p className="text-xs" style={{ color: "hsl(var(--destructive))" }}>
            {error}
          </p>
        </div>
      )}
    </div>
  );
};

/* ─── Password strength bar ─── */
const getStrength = (pw: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;

  if (score <= 1) return { score, label: "Weak", color: "hsl(0,72%,58%)" };
  if (score === 2) return { score, label: "Fair", color: "hsl(35,90%,55%)" };
  if (score === 3) return { score, label: "Good", color: "hsl(200,80%,55%)" };
  return { score, label: "Strong", color: "hsl(145,60%,50%)" };
};

const PasswordStrength = ({ password }: { password: string }) => {
  const { score, label, color } = getStrength(password);
  const pct = Math.min((score / 5) * 100, 100);

  return (
    <div className="space-y-1 px-1">
      <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: "hsl(var(--border))" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {password.length > 0 && (
        <p className="text-xs" style={{ color }}>
          {label} password
        </p>
      )}
    </div>
  );
};

/* ─── Telegram button ─── */
const TelegramButton = ({ text }: { text: string }) => (
  <button
    type="button"
    className="btn-shimmer w-full flex items-center justify-center gap-3 rounded-xl py-3 text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
    style={{
      background: "linear-gradient(135deg, hsl(200,100%,40%), hsl(200,100%,50%))",
      color: "hsl(0,0%,100%)",
      boxShadow: "0 4px 24px hsla(200,100%,45%,0.3)",
      border: "1px solid hsla(200,100%,60%,0.25)",
    }}
  >
    <Send size={16} />
    {text}
  </button>
);

/* ─── Auth state ─── */
type AuthState = "idle" | "loading" | "success";

const Spinner = () => (
  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
    <path d="M12 2a10 10 0 0 1 10 10" />
  </svg>
);

const Checkmark = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    <path
      d="M5 13l4 4L19 7"
      style={{
        strokeDasharray: 22,
        strokeDashoffset: 0,
        animation: "check-draw 0.4s cubic-bezier(0.65,0,0.45,1) forwards",
      }}
    />
  </svg>
);

const PrimaryButton = ({
  children,
  authState,
  type = "button",
}: {
  children: React.ReactNode;
  authState: AuthState;
  type?: "button" | "submit";
}) => {
  const isLoading = authState === "loading";
  const isSuccess = authState === "success";

  return (
    <button
      type={type}
      disabled={isLoading || isSuccess}
      className="btn-shimmer w-full rounded-xl py-3.5 text-sm font-bold tracking-wide transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed relative overflow-hidden"
      style={{
        background: isSuccess
          ? "linear-gradient(135deg, hsl(145,60%,40%), hsl(145,60%,32%))"
          : "linear-gradient(135deg, hsl(315,90%,52%), hsl(340,80%,42%))",
        color: "hsl(var(--primary-foreground))",
        boxShadow: isSuccess
          ? "0 4px 32px hsla(145,60%,40%,0.5)"
          : "0 4px 32px hsla(315,90%,55%,0.45)",
        border: isSuccess
          ? "1px solid hsla(145,60%,60%,0.25)"
          : "1px solid hsla(315,80%,70%,0.2)",
        transition: "background 0.5s ease, box-shadow 0.5s ease",
      }}
    >
      <span
        className="flex items-center justify-center gap-2.5 transition-all duration-300"
        style={{ opacity: isLoading ? 0 : 1, transform: isLoading ? "scale(0.8)" : "scale(1)" }}
      >
        {isSuccess ? <Checkmark /> : null}
        {isSuccess ? "Success!" : children}
      </span>
      <span
        className="absolute inset-0 flex items-center justify-center transition-all duration-300"
        style={{ opacity: isLoading ? 1 : 0, transform: isLoading ? "scale(1)" : "scale(0.6)" }}
      >
        <Spinner />
      </span>
    </button>
  );
};

/* ─── Eye toggle helper ─── */
const eyeBtn = (show: boolean, toggle: () => void) => (
  <button
    type="button"
    onClick={toggle}
    className="transition-colors"
    style={{ color: "hsl(var(--muted-foreground))" }}
    tabIndex={-1}
  >
    {show ? <EyeOff size={16} /> : <Eye size={16} />}
  </button>
);

/* ─── Main auth card ─── */
const AuthCard = () => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [transitioning, setTransitioning] = useState(false);
  const [authState, setAuthState] = useState<AuthState>("idle");
  const [shaking, setShaking] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);

  // Register fields
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  // 3D tilt
  const cardRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef({ x: 0, y: 0, raf: 0 });

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authState !== "idle") return;

    setErrors({});

    if (mode === "login") {
      const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
      if (!result.success) {
        const fieldErrors: FieldErrors = {};
        result.error.errors.forEach((err) => {
          const key = err.path[0] as string;
          fieldErrors[key] = err.message;
        });
        setErrors(fieldErrors);
        triggerShake();
        return;
      }
    } else {
      const result = registerSchema.safeParse({
        name: regName,
        email: regEmail,
        password: regPassword,
        confirm: regConfirm,
      });
      if (!result.success) {
        const fieldErrors: FieldErrors = {};
        result.error.errors.forEach((err) => {
          const key = err.path[0] as string;
          if (!fieldErrors[key]) fieldErrors[key] = err.message;
        });
        setErrors(fieldErrors);
        triggerShake();
        return;
      }
    }

    // Passed validation — run simulated auth
    setAuthState("loading");
    setTimeout(() => {
      setAuthState("success");
      setTimeout(() => setAuthState("idle"), 2200);
    }, 1800);
  };

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

  const switchMode = (next: "login" | "register") => {
    if (next === mode || transitioning) return;
    setErrors({});
    setTransitioning(true);
    setTimeout(() => {
      setMode(next);
      setTransitioning(false);
    }, 280);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="glass-card animate-card-entrance rounded-3xl p-8 w-full max-w-md mx-4"
      style={{
        transition: shaking ? "none" : "transform 0.15s ease-out",
        willChange: "transform",
        animation: shaking
          ? "card-shake 0.55s cubic-bezier(0.36,0.07,0.19,0.97) both"
          : undefined,
      }}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h1
          className="text-2xl font-extrabold tracking-tight text-glow"
          style={{ color: "hsl(var(--foreground))" }}
        >
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
          {mode === "login"
            ? "Sign in to your SaaS dashboard"
            : "Start your journey with us today"}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-xl p-1 mb-6" style={{ background: "hsl(var(--muted))" }}>
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all duration-300"
            style={{
              background: mode === m ? "linear-gradient(135deg, hsl(315,90%,52%), hsl(340,80%,42%))" : "transparent",
              color: mode === m ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
              boxShadow: mode === m ? "0 2px 12px hsla(315,90%,55%,0.45)" : "none",
            }}
          >
            {m === "login" ? "Sign In" : "Register"}
          </button>
        ))}
      </div>

      {/* Form content */}
      <div
        style={{
          opacity: transitioning ? 0 : 1,
          transform: transitioning ? "translateY(8px)" : "translateY(0)",
          transition: "opacity 0.28s ease, transform 0.28s ease",
        }}
      >
        {mode === "login" ? (
          /* ── LOGIN FORM ── */
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <FloatingInput
              id="login-email"
              type="email"
              label="Email address"
              value={loginEmail}
              onChange={(v) => { setLoginEmail(v); setErrors((p) => ({ ...p, email: "" })); }}
              icon={<Mail size={16} />}
              autoComplete="email"
              error={errors.email}
            />
            <FloatingInput
              id="login-password"
              type={showLoginPw ? "text" : "password"}
              label="Password"
              value={loginPassword}
              onChange={(v) => { setLoginPassword(v); setErrors((p) => ({ ...p, password: "" })); }}
              icon={<Lock size={16} />}
              autoComplete="current-password"
              rightElement={eyeBtn(showLoginPw, () => setShowLoginPw((s) => !s))}
              error={errors.password}
            />

            <div className="flex justify-end">
              <button
                type="button"
                className="text-xs font-medium transition-colors hover:underline"
                style={{ color: "hsl(var(--primary))" }}
              >
                Forgot password?
              </button>
            </div>

            <PrimaryButton type="submit" authState={authState}>Sign In</PrimaryButton>

            <div className="relative flex items-center gap-3 my-2">
              <div className="flex-1 h-px" style={{ background: "hsl(var(--border))" }} />
              <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>or</span>
              <div className="flex-1 h-px" style={{ background: "hsl(var(--border))" }} />
            </div>

            <TelegramButton text="Continue with Telegram" />

            <p className="text-center text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="font-semibold hover:underline"
                style={{ color: "hsl(var(--primary))" }}
              >
                Sign up
              </button>
            </p>
          </form>
        ) : (
          /* ── REGISTER FORM ── */
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <FloatingInput
              id="reg-name"
              label="Full name"
              value={regName}
              onChange={(v) => { setRegName(v); setErrors((p) => ({ ...p, name: "" })); }}
              icon={<User size={16} />}
              autoComplete="name"
              error={errors.name}
            />
            <FloatingInput
              id="reg-email"
              type="email"
              label="Email address"
              value={regEmail}
              onChange={(v) => { setRegEmail(v); setErrors((p) => ({ ...p, email: "" })); }}
              icon={<Mail size={16} />}
              autoComplete="email"
              error={errors.email}
            />
            <FloatingInput
              id="reg-password"
              type={showRegPw ? "text" : "password"}
              label="Password"
              value={regPassword}
              onChange={(v) => { setRegPassword(v); setErrors((p) => ({ ...p, password: "" })); }}
              icon={<Lock size={16} />}
              autoComplete="new-password"
              rightElement={eyeBtn(showRegPw, () => setShowRegPw((s) => !s))}
              error={errors.password}
            />

            {regPassword.length > 0 && <PasswordStrength password={regPassword} />}

            <FloatingInput
              id="reg-confirm"
              type={showRegConfirm ? "text" : "password"}
              label="Confirm password"
              value={regConfirm}
              onChange={(v) => { setRegConfirm(v); setErrors((p) => ({ ...p, confirm: "" })); }}
              icon={<Lock size={16} />}
              autoComplete="new-password"
              rightElement={eyeBtn(showRegConfirm, () => setShowRegConfirm((s) => !s))}
              error={errors.confirm}
            />

            <PrimaryButton type="submit" authState={authState}>Create Account</PrimaryButton>

            <div className="relative flex items-center gap-3 my-2">
              <div className="flex-1 h-px" style={{ background: "hsl(var(--border))" }} />
              <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>or</span>
              <div className="flex-1 h-px" style={{ background: "hsl(var(--border))" }} />
            </div>

            <TelegramButton text="Register with Telegram" />

            <p className="text-center text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="font-semibold hover:underline"
                style={{ color: "hsl(var(--primary))" }}
              >
                Sign in
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthCard;
