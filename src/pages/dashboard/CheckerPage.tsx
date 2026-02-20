import { useState } from "react";
import { Search, CreditCard, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ResultState = "idle" | "loading" | "charged" | "approved" | "declined";

const CheckerPage = () => {
  const [gateway, setGateway] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [holderName, setHolderName] = useState("");
  const [resultState, setResultState] = useState<ResultState>("idle");

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 2) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  };

  const getMaskedCard = () => {
    const digits = cardNumber.replace(/\s/g, "");
    const last4 = digits.slice(-4) || "????";
    return `•••• •••• •••• ${last4}`;
  };

  const handleRunCheck = () => {
    if (!gateway || !cardNumber) return;
    setResultState("loading");

    setTimeout(() => {
      const digits = cardNumber.replace(/\s/g, "");
      const lastDigit = parseInt(digits[digits.length - 1] || "0", 10);

      if (gateway === "stripe-charge") {
        setResultState("charged");
      } else if (lastDigit % 2 === 0) {
        setResultState("approved");
      } else {
        setResultState("declined");
      }
    }, 1500);
  };

  const gatewayLabel = () => {
    if (gateway === "stripe-charge") return "Stripe Charge";
    if (gateway === "stripe-auth") return "Stripe Auth";
    if (gateway === "shopify") return "Shopify";
    return "";
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div
        className="animate-card-entrance"
        style={{ animationDelay: "0ms", animationFillMode: "both" }}
      >
        <h1
          className="text-5xl font-black tracking-tight text-glow"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            color: "hsl(var(--primary))",
            letterSpacing: "-0.03em",
          }}
        >
          Checker
        </h1>
        <p className="mt-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          Select a gateway, enter card details, and run your check.
        </p>
      </div>

      {/* ── Input Panel ── */}
      <div
        className="glass-card animate-card-entrance rounded-2xl p-6 flex flex-col gap-5"
        style={{ animationDelay: "60ms", animationFillMode: "both" }}
      >
        {/* Select Gateway */}
        <div className="flex flex-col gap-2">
          <label
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Select Gateway
          </label>
          <Select value={gateway} onValueChange={setGateway}>
            <SelectTrigger
              className="glass-input rounded-xl border-0 h-12 px-4 text-sm font-medium focus:ring-0 focus:ring-offset-0"
              style={{
                background: "hsla(330, 20%, 6%, 0.85)",
                border: "1px solid hsla(315, 35%, 35%, 0.22)",
                color: gateway ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
              }}
            >
              <SelectValue placeholder="Choose a gateway..." />
            </SelectTrigger>
            <SelectContent
              style={{
                background: "hsl(330, 15%, 6%)",
                border: "1px solid hsla(315, 50%, 40%, 0.3)",
                backdropFilter: "blur(20px)",
                zIndex: 100,
              }}
            >
              <SelectItem
                value="stripe-charge"
                className="text-sm font-medium cursor-pointer"
                style={{ color: "hsl(var(--foreground))" }}
              >
                💳 Stripe Charge
              </SelectItem>
              <SelectItem
                value="stripe-auth"
                className="text-sm font-medium cursor-pointer"
                style={{ color: "hsl(var(--foreground))" }}
              >
                🔐 Stripe Auth
              </SelectItem>
              <SelectItem
                value="shopify"
                className="text-sm font-medium cursor-pointer"
                style={{ color: "hsl(var(--foreground))" }}
              >
                🛍️ Shopify
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Card Number */}
        <div className="flex flex-col gap-2">
          <label
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Card Number
          </label>
          <input
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            placeholder="•••• •••• •••• 1234"
            className="glass-input rounded-xl px-4 py-3 text-sm font-mono w-full"
            style={{ color: "hsl(var(--foreground))" }}
            maxLength={19}
          />
        </div>

        {/* Expiry + CVV */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <label
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Expiry
            </label>
            <input
              type="text"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              placeholder="MM/YY"
              className="glass-input rounded-xl px-4 py-3 text-sm font-mono w-full"
              style={{ color: "hsl(var(--foreground))" }}
              maxLength={5}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              CVV
            </label>
            <input
              type="text"
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="•••"
              className="glass-input rounded-xl px-4 py-3 text-sm font-mono w-full"
              style={{ color: "hsl(var(--foreground))" }}
              maxLength={4}
            />
          </div>
        </div>

        {/* Cardholder Name */}
        <div className="flex flex-col gap-2">
          <label
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Cardholder Name
          </label>
          <input
            type="text"
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            placeholder="John Doe"
            className="glass-input rounded-xl px-4 py-3 text-sm w-full"
            style={{ color: "hsl(var(--foreground))" }}
          />
        </div>

        {/* Run Check Button */}
        <button
          type="button"
          onClick={handleRunCheck}
          disabled={resultState === "loading" || !gateway || !cardNumber}
          className="btn-shimmer w-full flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{
            background: "linear-gradient(135deg, hsl(315,95%,45%), hsl(315,90%,55%))",
            color: "hsl(var(--primary-foreground))",
            boxShadow:
              "0 4px 24px hsla(315,90%,50%,0.45), 0 0 60px hsla(315,80%,45%,0.15)",
            border: "1px solid hsla(315,80%,60%,0.3)",
          }}
        >
          {resultState === "loading" ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Search size={16} />
          )}
          {resultState === "loading" ? "Checking..." : "Run Check"}
        </button>
      </div>

      {/* ── Results Panel ── */}
      <div
        className="glass-card animate-card-entrance rounded-2xl p-6"
        style={{ animationDelay: "120ms", animationFillMode: "both" }}
      >
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-6"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          Results
        </h2>

        {/* IDLE */}
        {resultState === "idle" && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div
              className="rounded-full p-4"
              style={{ background: "hsla(315, 80%, 45%, 0.12)" }}
            >
              <CreditCard
                size={28}
                style={{
                  color: "hsl(var(--primary))",
                  filter: "drop-shadow(0 0 8px hsla(315,90%,60%,0.6))",
                }}
              />
            </div>
            <p className="text-sm font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
              Enter card details to begin.
            </p>
          </div>
        )}

        {/* LOADING */}
        {resultState === "loading" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="relative w-16 h-16">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  border: "3px solid hsla(315, 95%, 55%, 0.15)",
                }}
              />
              <div
                className="absolute inset-0 rounded-full animate-spin"
                style={{
                  border: "3px solid transparent",
                  borderTopColor: "hsl(315, 95%, 55%)",
                  borderRightColor: "hsla(315, 95%, 55%, 0.5)",
                  filter: "drop-shadow(0 0 8px hsla(315,90%,60%,0.8))",
                }}
              />
            </div>
            <p className="text-sm font-semibold animate-pulse" style={{ color: "hsl(var(--primary))" }}>
              Processing check…
            </p>
          </div>
        )}

        {/* CHARGED */}
        {resultState === "charged" && (
          <div className="animate-result-pop flex flex-col items-center gap-6">
            {/* Diamond */}
            <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
              {/* Pulse ring */}
              <div
                className="absolute inset-0"
                style={{
                  borderRadius: "50%",
                  background: "radial-gradient(circle, hsla(315,90%,55%,0.25) 0%, transparent 70%)",
                  animation: "ring-pulse-magenta 2s ease-out infinite",
                }}
              />
              {/* Diamond shape */}
              <div
                style={{
                  width: 80,
                  height: 80,
                  clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                  background: "linear-gradient(135deg, hsl(315,95%,55%), hsl(315,75%,45%), hsl(315,95%,65%))",
                  boxShadow: "0 0 40px hsla(315,90%,55%,0.6), 0 0 80px hsla(315,80%,45%,0.3)",
                  animation: "diamond-spin 4s linear infinite",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Shimmer sweep */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(45deg, transparent 30%, hsla(315,100%,95%,0.4) 50%, transparent 70%)",
                    animation: "diamond-shimmer 2s ease-in-out infinite",
                  }}
                />
              </div>
            </div>

            {/* CC Details Card */}
            <div
              className="w-full rounded-xl p-4 flex flex-col gap-3"
              style={{
                background: "hsla(315, 40%, 10%, 0.6)",
                border: "1px solid hsla(315, 60%, 50%, 0.3)",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Card
                </span>
                <span
                  className="text-xs font-black uppercase px-2 py-0.5 rounded-full"
                  style={{
                    background: "hsla(315, 95%, 55%, 0.2)",
                    color: "hsl(315, 95%, 70%)",
                    border: "1px solid hsla(315,80%,60%,0.4)",
                    letterSpacing: "0.1em",
                  }}
                >
                  CHARGED
                </span>
              </div>
              <p className="font-mono text-lg font-bold" style={{ color: "hsl(var(--foreground))", letterSpacing: "0.1em" }}>
                {getMaskedCard()}
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Gateway</p>
                  <p className="font-semibold" style={{ color: "hsl(var(--foreground))" }}>{gatewayLabel()}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Expiry</p>
                  <p className="font-mono font-semibold" style={{ color: "hsl(var(--foreground))" }}>{expiry || "—"}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Holder</p>
                  <p className="font-semibold" style={{ color: "hsl(var(--foreground))" }}>{holderName || "—"}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Amount</p>
                  <p className="font-semibold" style={{ color: "hsl(315, 95%, 65%)" }}>$1.00</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* APPROVED */}
        {resultState === "approved" && (
          <div className="animate-result-pop flex flex-col items-center py-6 gap-5">
            <div className="relative flex items-center justify-center">
              {/* Pulse rings */}
              <div
                className="absolute"
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  border: "2px solid hsla(142, 70%, 50%, 0.3)",
                  animation: "ring-pulse-green 1.8s ease-out infinite",
                }}
              />
              <div
                className="absolute"
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  border: "2px solid hsla(142, 70%, 50%, 0.2)",
                  animation: "ring-pulse-green 1.8s ease-out 0.3s infinite",
                }}
              />
              {/* Circle + checkmark */}
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle
                  cx="40" cy="40" r="36"
                  fill="hsla(142, 70%, 40%, 0.2)"
                  stroke="hsl(142, 70%, 50%)"
                  strokeWidth="3"
                  style={{
                    filter: "drop-shadow(0 0 12px hsla(142,70%,50%,0.7))",
                  }}
                />
                <polyline
                  points="24,41 35,52 56,30"
                  fill="none"
                  stroke="hsl(142, 70%, 55%)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="50"
                  strokeDashoffset="50"
                  style={{
                    animation: "check-draw 0.5s ease-out 0.2s forwards",
                    filter: "drop-shadow(0 0 6px hsla(142,70%,55%,0.8))",
                  }}
                />
              </svg>
            </div>
            <div className="text-center">
              <p
                className="text-2xl font-black"
                style={{
                  color: "hsl(142, 70%, 55%)",
                  textShadow: "0 0 20px hsla(142,70%,55%,0.6), 0 0 40px hsla(142,70%,45%,0.3)",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                Approved
              </p>
              <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                {getMaskedCard()} · {gatewayLabel()}
              </p>
            </div>
          </div>
        )}

        {/* DECLINED */}
        {resultState === "declined" && (
          <div className="animate-result-pop flex flex-col items-center py-6 gap-5">
            <div className="relative flex items-center justify-center">
              {/* Pulse rings */}
              <div
                className="absolute"
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  border: "2px solid hsla(0, 75%, 55%, 0.3)",
                  animation: "ring-pulse-red 1.8s ease-out infinite",
                }}
              />
              <div
                className="absolute"
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  border: "2px solid hsla(0, 75%, 55%, 0.2)",
                  animation: "ring-pulse-red 1.8s ease-out 0.3s infinite",
                }}
              />
              {/* Circle + X */}
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle
                  cx="40" cy="40" r="36"
                  fill="hsla(0, 75%, 40%, 0.2)"
                  stroke="hsl(0, 75%, 55%)"
                  strokeWidth="3"
                  style={{
                    filter: "drop-shadow(0 0 12px hsla(0,75%,55%,0.7))",
                  }}
                />
                <line
                  x1="27" y1="27" x2="53" y2="53"
                  stroke="hsl(0, 75%, 60%)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="38"
                  strokeDashoffset="38"
                  style={{
                    animation: "x-draw 0.35s ease-out 0.15s forwards",
                    filter: "drop-shadow(0 0 6px hsla(0,75%,60%,0.8))",
                  }}
                />
                <line
                  x1="53" y1="27" x2="27" y2="53"
                  stroke="hsl(0, 75%, 60%)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="38"
                  strokeDashoffset="38"
                  style={{
                    animation: "x-draw 0.35s ease-out 0.35s forwards",
                    filter: "drop-shadow(0 0 6px hsla(0,75%,60%,0.8))",
                  }}
                />
              </svg>
            </div>
            <div className="text-center">
              <p
                className="text-2xl font-black"
                style={{
                  color: "hsl(0, 75%, 60%)",
                  textShadow: "0 0 20px hsla(0,75%,60%,0.6), 0 0 40px hsla(0,75%,45%,0.3)",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                Declined
              </p>
              <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                {getMaskedCard()} · {gatewayLabel()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckerPage;
