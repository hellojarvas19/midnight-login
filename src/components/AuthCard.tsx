import { useState, useRef, useCallback } from "react";
import { Eye, EyeOff, Mail, Lock, User, Send } from "lucide-react";

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
}: FloatingInputProps) => {
  const [focused, setFocused] = useState(false);
  const isFloated = focused || value.length > 0;

  return (
    <div className="relative group">
      <div
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: focused ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))", transition: "color 0.3s" }}
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
          color: focused ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
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
        className="glass-input w-full rounded-xl px-10 pt-5 pb-2 text-sm text-foreground"
        style={{ height: 54 }}
      />
      {rightElement && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
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
    <div className="space-y-1">
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

/* ─── Primary button ─── */
const PrimaryButton = ({
  children,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) => (
  <button
    type={type}
    onClick={onClick}
    className="btn-shimmer w-full rounded-xl py-3.5 text-sm font-bold tracking-wide transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] animate-pulse-glow"
    style={{
      background: "linear-gradient(135deg, hsl(315,90%,52%), hsl(340,80%,42%))",
      color: "hsl(var(--primary-foreground))",
      boxShadow: "0 4px 32px hsla(315,90%,55%,0.45)",
      border: "1px solid hsla(315,80%,70%,0.2)",
    }}
  >
    {children}
  </button>
);

/* ─── Main auth card ─── */
const AuthCard = () => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [transitioning, setTransitioning] = useState(false);

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
    setTransitioning(true);
    setTimeout(() => {
      setMode(next);
      setTransitioning(false);
    }, 280);
  };

  const eyeBtn = (show: boolean, toggle: () => void) => (
    <button
      type="button"
      onClick={toggle}
      className="text-muted-foreground hover:text-foreground transition-colors"
      tabIndex={-1}
    >
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="glass-card animate-card-entrance rounded-3xl p-8 w-full max-w-md mx-4"
      style={{
        transition: "transform 0.15s ease-out",
        willChange: "transform",
      }}
    >
      {/* Logo / brand */}
      <div className="text-center mb-8">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
          style={{
            background: "linear-gradient(135deg, hsl(315,90%,52%), hsl(340,80%,40%))",
            boxShadow: "0 0 36px hsla(315,90%,58%,0.6)",
          }}
        >
          <span className="text-2xl font-black text-white">S</span>
        </div>
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

      {/* Mode tab switcher */}
      <div
        className="flex rounded-xl p-1 mb-6"
        style={{ background: "hsl(var(--muted))" }}
      >
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

      {/* Form content with fade transition */}
      <div
        style={{
          opacity: transitioning ? 0 : 1,
          transform: transitioning ? "translateY(8px)" : "translateY(0)",
          transition: "opacity 0.28s ease, transform 0.28s ease",
        }}
      >
        {mode === "login" ? (
          /* ── LOGIN FORM ── */
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <FloatingInput
              id="login-email"
              type="email"
              label="Email address"
              value={loginEmail}
              onChange={setLoginEmail}
              icon={<Mail size={16} />}
              autoComplete="email"
            />
            <FloatingInput
              id="login-password"
              type={showLoginPw ? "text" : "password"}
              label="Password"
              value={loginPassword}
              onChange={setLoginPassword}
              icon={<Lock size={16} />}
              autoComplete="current-password"
              rightElement={eyeBtn(showLoginPw, () => setShowLoginPw((s) => !s))}
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

            <PrimaryButton type="submit">Sign In</PrimaryButton>

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
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <FloatingInput
              id="reg-name"
              label="Full name"
              value={regName}
              onChange={setRegName}
              icon={<User size={16} />}
              autoComplete="name"
            />
            <FloatingInput
              id="reg-email"
              type="email"
              label="Email address"
              value={regEmail}
              onChange={setRegEmail}
              icon={<Mail size={16} />}
              autoComplete="email"
            />
            <FloatingInput
              id="reg-password"
              type={showRegPw ? "text" : "password"}
              label="Password"
              value={regPassword}
              onChange={setRegPassword}
              icon={<Lock size={16} />}
              autoComplete="new-password"
              rightElement={eyeBtn(showRegPw, () => setShowRegPw((s) => !s))}
            />

            {regPassword.length > 0 && <PasswordStrength password={regPassword} />}

            <FloatingInput
              id="reg-confirm"
              type={showRegConfirm ? "text" : "password"}
              label="Confirm password"
              value={regConfirm}
              onChange={setRegConfirm}
              icon={<Lock size={16} />}
              autoComplete="new-password"
              rightElement={eyeBtn(showRegConfirm, () => setShowRegConfirm((s) => !s))}
            />

            {regConfirm.length > 0 && regPassword !== regConfirm && (
              <p className="text-xs" style={{ color: "hsl(var(--destructive))" }}>
                Passwords do not match
              </p>
            )}

            <PrimaryButton type="submit">Create Account</PrimaryButton>

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
