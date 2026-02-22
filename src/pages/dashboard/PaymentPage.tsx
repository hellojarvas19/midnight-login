import { useState } from "react";
import { Copy, Check, ArrowLeft, Bitcoin, Wallet, Send, Clock, AlertTriangle } from "lucide-react";
import { PLAN_DETAILS, CRYPTO_WALLETS, type PlanId } from "@/contexts/PlanContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PaymentPageProps {
  selectedPlan: PlanId;
  onBack: () => void;
  onSuccess: () => void;
}

const PaymentPage = ({ selectedPlan, onBack, onSuccess }: PaymentPageProps) => {
  const plan = PLAN_DETAILS[selectedPlan];
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCrypto, setSelectedCrypto] = useState(0);
  const [txHash, setTxHash] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const wallet = CRYPTO_WALLETS[selectedCrypto];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleSubmit = async () => {
    if (!txHash.trim() || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("payments" as any).insert({
        user_id: user.id,
        plan: selectedPlan,
        amount_usd: plan.priceUsd,
        crypto_currency: wallet.currency,
        tx_hash: txHash.trim(),
        wallet_address: wallet.address,
        status: "pending",
      });
      if (error) throw error;

      // Notify owners via Telegram
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
                plan: selectedPlan,
                amount_usd: plan.priceUsd,
                crypto_currency: wallet.currency,
                tx_hash: txHash.trim(),
              }),
            }
          );
        }
      } catch {
        // Notification failure shouldn't block the payment submission
      }

      setSubmitted(true);
      toast({ title: "Payment submitted!", description: "Your payment is being reviewed. Plan will activate once confirmed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to submit payment", variant: "destructive" });
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
          Your <strong style={{ color: "hsl(48,100%,68%)" }}>{plan.name}</strong> plan payment is being reviewed.
          It will be activated once an admin confirms the transaction.
        </p>
        <button
          type="button"
          onClick={onSuccess}
          className="rounded-xl px-6 py-2.5 text-sm font-bold transition-all"
          style={{
            background: "hsla(315,70%,45%,0.25)",
            border: "1px solid hsla(315,50%,45%,0.3)",
            color: "hsl(var(--foreground))",
          }}
        >
          Back to Plans
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-card-entrance">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium self-start transition-colors"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        <ArrowLeft size={16} /> Back to Plans
      </button>

      {/* Plan summary */}
      <div
        className="glass-card rounded-2xl p-5 flex items-center justify-between"
        style={{ border: "1px solid hsla(44,80%,55%,0.3)" }}
      >
        <div>
          <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Selected Plan</p>
          <h2 className="text-lg font-bold" style={{
            background: "linear-gradient(90deg, hsl(42,100%,52%), hsl(52,100%,78%))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>
            {plan.name} — {plan.duration} Days
          </h2>
        </div>
        <div
          className="text-2xl font-black"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            color: "hsl(48,100%,70%)",
            textShadow: "0 0 20px hsla(44,100%,58%,0.35)",
          }}
        >
          {plan.price}
        </div>
      </div>

      {/* Crypto selector */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
          Select Payment Method
        </p>
        <div className="grid grid-cols-2 gap-2">
          {CRYPTO_WALLETS.map((w, i) => (
            <button
              key={w.currency}
              type="button"
              onClick={() => setSelectedCrypto(i)}
              className="rounded-xl p-3 text-left transition-all"
              style={{
                background: i === selectedCrypto ? "hsla(44,80%,40%,0.15)" : "hsla(315,30%,15%,0.3)",
                border: `1px solid ${i === selectedCrypto ? "hsla(44,80%,55%,0.4)" : "hsla(315,40%,30%,0.25)"}`,
                boxShadow: i === selectedCrypto ? "0 0 16px hsla(44,100%,55%,0.15)" : "none",
              }}
            >
              <span
                className="text-xs font-bold"
                style={{ color: i === selectedCrypto ? "hsl(48,100%,68%)" : "hsl(var(--foreground))" }}
              >
                {w.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Wallet address */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
          Send exactly {plan.price} USD in {wallet.label} to:
        </p>
        <div
          className="glass-card rounded-xl p-4 flex items-center gap-3"
          style={{ border: "1px solid hsla(315,40%,30%,0.3)" }}
        >
          <Wallet size={16} style={{ color: "hsl(var(--primary))", flexShrink: 0, filter: "drop-shadow(0 0 4px hsla(315,90%,60%,0.5))" }} />
          <code
            className="flex-1 text-xs break-all font-mono"
            style={{ color: "hsl(var(--foreground))", opacity: 0.9 }}
          >
            {wallet.address}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg p-2 transition-colors flex-shrink-0"
            style={{
              background: copied ? "hsla(142,60%,20%,0.3)" : "hsla(315,40%,20%,0.3)",
              border: `1px solid ${copied ? "hsla(142,60%,40%,0.3)" : "hsla(315,40%,30%,0.25)"}`,
            }}
          >
            {copied
              ? <Check size={14} style={{ color: "hsl(142,70%,55%)" }} />
              : <Copy size={14} style={{ color: "hsl(var(--muted-foreground))" }} />
            }
          </button>
        </div>
      </div>

      {/* Warning */}
      <div
        className="rounded-xl p-3 flex items-start gap-2.5"
        style={{ background: "hsla(44,80%,40%,0.1)", border: "1px solid hsla(44,80%,55%,0.2)" }}
      >
        <AlertTriangle size={14} style={{ color: "hsl(48,100%,65%)", flexShrink: 0, marginTop: 1 }} />
        <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
          Send the <strong style={{ color: "hsl(48,100%,68%)" }}>exact amount</strong> to the address above.
          After sending, paste your transaction hash below for verification.
        </p>
      </div>

      {/* TX hash input */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
          Transaction Hash
        </p>
        <input
          type="text"
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          placeholder="Paste your transaction hash here..."
          className="rounded-xl px-4 py-3 text-sm outline-none transition-all"
          style={{
            background: "hsla(315,30%,12%,0.5)",
            border: "1px solid hsla(315,40%,30%,0.3)",
            color: "hsl(var(--foreground))",
          }}
        />
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!txHash.trim() || submitting}
        className="w-full rounded-xl py-3 text-sm font-bold tracking-wide transition-all duration-200 flex items-center justify-center gap-2"
        style={{
          background: txHash.trim()
            ? "linear-gradient(135deg, hsl(42,100%,48%), hsl(48,100%,58%))"
            : "hsla(315,30%,20%,0.4)",
          border: txHash.trim()
            ? "1px solid hsla(44,80%,55%,0.5)"
            : "1px solid hsla(315,40%,30%,0.25)",
          color: txHash.trim() ? "hsl(20,15%,10%)" : "hsl(var(--muted-foreground))",
          boxShadow: txHash.trim() ? "0 0 20px hsla(44,100%,55%,0.3)" : "none",
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

export default PaymentPage;
