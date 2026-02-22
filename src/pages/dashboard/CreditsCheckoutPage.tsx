import { useState } from "react";
import { Copy, Check, ArrowLeft, Wallet, Send, Clock, AlertTriangle, Zap, ShieldCheck } from "lucide-react";
import { CRYPTO_WALLETS } from "@/contexts/PlanContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const CREDITS_PACKAGES = [
  { credits: 5000, price: 10, label: "5,000" },
  { credits: 15000, price: 25, label: "15,000" },
  { credits: 50000, price: 70, label: "50,000" },
] as const;

// TXID validation patterns per crypto
const TXID_PATTERNS: Record<string, { pattern: RegExp; hint: string }> = {
  BTC: { pattern: /^[a-fA-F0-9]{64}$/, hint: "BTC TXID must be 64 hex characters" },
  USDT_TRC20: { pattern: /^[a-fA-F0-9]{64}$/, hint: "TRC20 TXID must be 64 hex characters" },
  USDT_BSC20: { pattern: /^0x[a-fA-F0-9]{64}$/, hint: "BSC20 TXID must start with 0x followed by 64 hex characters" },
  LTC: { pattern: /^[a-fA-F0-9]{64}$/, hint: "LTC TXID must be 64 hex characters" },
};

interface CreditsCheckoutPageProps {
  onBack: () => void;
}

const CreditsCheckoutPage = ({ onBack }: CreditsCheckoutPageProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPkg, setSelectedPkg] = useState(0);
  const [selectedCrypto, setSelectedCrypto] = useState(0);
  const [txHash, setTxHash] = useState("");
  const [txError, setTxError] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const pkg = CREDITS_PACKAGES[selectedPkg];
  const wallet = CRYPTO_WALLETS[selectedCrypto];

  const validateTxHash = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) { setTxError("Transaction hash is required"); return false; }
    const validator = TXID_PATTERNS[wallet.currency];
    if (validator && !validator.pattern.test(trimmed)) {
      setTxError(validator.hint);
      return false;
    }
    setTxError("");
    return true;
  };

  const handleTxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTxHash(e.target.value);
    if (txError) validateTxHash(e.target.value);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleSubmit = async () => {
    if (!validateTxHash(txHash) || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("payments" as any).insert({
        user_id: user.id,
        plan: "credits",
        amount_usd: pkg.price,
        crypto_currency: wallet.currency,
        tx_hash: txHash.trim(),
        wallet_address: wallet.address,
        status: "pending",
        payment_type: "credits",
        credits_amount: pkg.credits,
      });
      if (error) throw error;

      // Notify owners
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/owner-payments?action=notify-submission`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                plan: `Credits (${pkg.label})`,
                amount_usd: pkg.price,
                crypto_currency: wallet.currency,
                tx_hash: txHash.trim(),
              }),
            }
          );
        }
      } catch {}

      setSubmitted(true);
      toast({ title: "Payment submitted!", description: `Your ${pkg.label} credits purchase is being reviewed.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to submit", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-12 animate-card-entrance">
        <div
          className="rounded-full p-4"
          style={{ background: "hsla(142,60%,20%,0.3)", border: "1px solid hsla(142,60%,40%,0.4)" }}
        >
          <Clock size={32} style={{ color: "hsl(142,70%,55%)", filter: "drop-shadow(0 0 8px hsla(142,70%,55%,0.6))" }} />
        </div>
        <h2 className="text-xl font-bold" style={{ color: "hsl(var(--foreground))" }}>Payment Submitted</h2>
        <p className="text-sm text-center max-w-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
          Your <strong style={{ color: "hsl(315,90%,65%)" }}>{pkg.label}</strong> credits purchase is being reviewed.
          Credits will be added once an admin confirms the transaction.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl px-6 py-2.5 text-sm font-bold transition-all"
          style={{
            background: "hsla(315,70%,45%,0.25)",
            border: "1px solid hsla(315,50%,45%,0.3)",
            color: "hsl(var(--foreground))",
          }}
        >
          Back to Profile
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-card-entrance">
      {/* Back */}
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm font-medium self-start" style={{ color: "hsl(var(--muted-foreground))" }}>
        <ArrowLeft size={16} /> Back to Profile
      </button>

      {/* Package selector */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
          Select Credits Package
        </p>
        <div className="grid grid-cols-3 gap-2">
          {CREDITS_PACKAGES.map((p, i) => (
            <button
              key={p.credits}
              type="button"
              onClick={() => setSelectedPkg(i)}
              className="rounded-xl p-3 flex flex-col items-center gap-1 transition-all"
              style={{
                background: i === selectedPkg ? "hsla(315,80%,40%,0.2)" : "hsla(315,30%,15%,0.3)",
                border: `1px solid ${i === selectedPkg ? "hsla(315,70%,55%,0.5)" : "hsla(315,40%,30%,0.25)"}`,
                boxShadow: i === selectedPkg ? "0 0 16px hsla(315,90%,60%,0.2)" : "none",
              }}
            >
              <Zap size={14} style={{ color: i === selectedPkg ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} />
              <span className="text-sm font-bold" style={{ color: i === selectedPkg ? "hsl(var(--primary))" : "hsl(var(--foreground))" }}>
                {p.label}
              </span>
              <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>${p.price}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Crypto selector */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
          Payment Method
        </p>
        <div className="grid grid-cols-2 gap-2">
          {CRYPTO_WALLETS.map((w, i) => (
            <button
              key={w.currency}
              type="button"
              onClick={() => { setSelectedCrypto(i); setTxError(""); }}
              className="rounded-xl p-3 text-left transition-all"
              style={{
                background: i === selectedCrypto ? "hsla(44,80%,40%,0.15)" : "hsla(315,30%,15%,0.3)",
                border: `1px solid ${i === selectedCrypto ? "hsla(44,80%,55%,0.4)" : "hsla(315,40%,30%,0.25)"}`,
                boxShadow: i === selectedCrypto ? "0 0 16px hsla(44,100%,55%,0.15)" : "none",
              }}
            >
              <span className="text-xs font-bold" style={{ color: i === selectedCrypto ? "hsl(48,100%,68%)" : "hsl(var(--foreground))" }}>
                {w.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Wallet address */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
          Send exactly ${pkg.price} USD in {wallet.label} to:
        </p>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3" style={{ border: "1px solid hsla(315,40%,30%,0.3)" }}>
          <Wallet size={16} style={{ color: "hsl(var(--primary))", flexShrink: 0 }} />
          <code className="flex-1 text-xs break-all font-mono" style={{ color: "hsl(var(--foreground))", opacity: 0.9 }}>
            {wallet.address}
          </code>
          <button type="button" onClick={handleCopy} className="rounded-lg p-2 transition-colors flex-shrink-0" style={{
            background: copied ? "hsla(142,60%,20%,0.3)" : "hsla(315,40%,20%,0.3)",
            border: `1px solid ${copied ? "hsla(142,60%,40%,0.3)" : "hsla(315,40%,30%,0.25)"}`,
          }}>
            {copied ? <Check size={14} style={{ color: "hsl(142,70%,55%)" }} /> : <Copy size={14} style={{ color: "hsl(var(--muted-foreground))" }} />}
          </button>
        </div>
      </div>

      {/* Warning */}
      <div className="rounded-xl p-3 flex items-start gap-2.5" style={{ background: "hsla(44,80%,40%,0.1)", border: "1px solid hsla(44,80%,55%,0.2)" }}>
        <AlertTriangle size={14} style={{ color: "hsl(48,100%,65%)", flexShrink: 0, marginTop: 1 }} />
        <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
          Send the <strong style={{ color: "hsl(48,100%,68%)" }}>exact amount</strong> to the address above.
          After sending, paste your transaction hash below for verification.
        </p>
      </div>

      {/* TX hash input with validation */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
          Transaction Hash (TXID)
        </p>
        <input
          type="text"
          value={txHash}
          onChange={handleTxChange}
          onBlur={() => txHash && validateTxHash(txHash)}
          placeholder="Paste your transaction hash here..."
          className="rounded-xl px-4 py-3 text-sm outline-none transition-all"
          style={{
            background: "hsla(315,30%,12%,0.5)",
            border: `1px solid ${txError ? "hsla(0,70%,50%,0.5)" : "hsla(315,40%,30%,0.3)"}`,
            color: "hsl(var(--foreground))",
          }}
        />
        {txError && (
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={11} style={{ color: "hsl(0,75%,60%)" }} />
            <p className="text-xs" style={{ color: "hsl(0,75%,60%)" }}>{txError}</p>
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!txHash.trim() || submitting}
        className="w-full rounded-xl py-3 text-sm font-bold tracking-wide transition-all duration-200 flex items-center justify-center gap-2"
        style={{
          background: txHash.trim() && !txError
            ? "linear-gradient(135deg, hsl(315,80%,45%), hsl(315,70%,55%))"
            : "hsla(315,30%,20%,0.4)",
          border: txHash.trim() && !txError
            ? "1px solid hsla(315,70%,55%,0.5)"
            : "1px solid hsla(315,40%,30%,0.25)",
          color: txHash.trim() && !txError ? "#fff" : "hsl(var(--muted-foreground))",
          boxShadow: txHash.trim() && !txError ? "0 0 20px hsla(315,90%,55%,0.3)" : "none",
          cursor: !txHash.trim() || submitting ? "not-allowed" : "pointer",
          opacity: submitting ? 0.6 : 1,
        }}
      >
        <Send size={14} />
        {submitting ? "Submitting..." : "Submit Payment"}
      </button>
    </div>
  );
};

export default CreditsCheckoutPage;
