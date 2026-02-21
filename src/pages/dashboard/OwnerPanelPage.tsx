import { useState, useEffect, useCallback } from "react";
import { Check, X, Clock, RefreshCw, Shield, ChevronDown, User, Hash, Wallet, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  id: string;
  user_id: string;
  plan: string;
  amount_usd: number;
  crypto_currency: string;
  tx_hash: string;
  wallet_address: string;
  status: string;
  created_at: string;
  user_username: string;
  user_telegram_id: string;
}

const OwnerPanelPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [processing, setProcessing] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);

  const fetchPayments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/owner-payments?action=list&status=${filter}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (res.status === 403) {
        setIsOwner(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setIsOwner(true);
      setPayments(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, filter, toast]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleDecision = async (paymentId: string, decision: "approve" | "reject") => {
    setProcessing(paymentId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/owner-payments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ payment_id: paymentId, decision }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({
        title: decision === "approve" ? "Payment Approved ✓" : "Payment Rejected",
        description: decision === "approve" ? "Plan has been activated for the user." : "Payment has been rejected.",
      });

      // Remove from list
      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  // Not owner
  if (isOwner === false) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Shield size={40} style={{ color: "hsl(0,75%,60%)", filter: "drop-shadow(0 0 12px hsla(0,75%,60%,0.5))" }} />
        <h2 className="text-lg font-bold" style={{ color: "hsl(var(--foreground))" }}>Owner Access Required</h2>
        <p className="text-sm text-center" style={{ color: "hsl(var(--muted-foreground))" }}>
          This panel is restricted to the project owner only.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="animate-card-entrance" style={{ animationFillMode: "both" }}>
        <p className="text-sm font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Owner</p>
        <h1
          className="text-3xl font-black tracking-tight leading-none"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            background: "linear-gradient(90deg, hsl(0,85%,55%) 0%, hsl(15,90%,60%) 30%, hsl(0,80%,50%) 60%, hsl(350,85%,55%) 100%)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            animation: "gold-shimmer 2.8s linear infinite",
            filter: "drop-shadow(0 0 12px hsla(0,85%,55%,0.4))",
          }}
        >
          Payment Approvals
        </h1>
      </div>

      {/* Filter tabs + refresh */}
      <div className="flex items-center gap-2">
        {(["pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className="rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all"
            style={{
              background: filter === f
                ? f === "pending" ? "hsla(44,80%,40%,0.2)" : f === "approved" ? "hsla(142,60%,20%,0.2)" : "hsla(0,60%,20%,0.2)"
                : "hsla(315,30%,15%,0.3)",
              border: `1px solid ${filter === f
                ? f === "pending" ? "hsla(44,80%,55%,0.4)" : f === "approved" ? "hsla(142,60%,40%,0.4)" : "hsla(0,60%,40%,0.4)"
                : "hsla(315,40%,30%,0.25)"}`,
              color: filter === f
                ? f === "pending" ? "hsl(48,100%,68%)" : f === "approved" ? "hsl(142,70%,60%)" : "hsl(0,75%,60%)"
                : "hsl(var(--muted-foreground))",
            }}
          >
            {f}
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={fetchPayments}
          className="rounded-xl p-2 transition-all"
          style={{
            background: "hsla(315,30%,15%,0.3)",
            border: "1px solid hsla(315,40%,30%,0.25)",
            color: "hsl(var(--muted-foreground))",
          }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Payments list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw size={20} className="animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
        </div>
      ) : payments.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 flex flex-col items-center gap-3" style={{ border: "1px solid hsla(315,40%,30%,0.2)" }}>
          <Clock size={28} style={{ color: "hsl(var(--muted-foreground))", opacity: 0.5 }} />
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            No {filter} payments
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {payments.map((payment, idx) => (
            <div
              key={payment.id}
              className="glass-card rounded-2xl p-4 flex flex-col gap-3 animate-card-entrance"
              style={{
                animationDelay: `${idx * 60}ms`,
                animationFillMode: "both",
                border: "1px solid hsla(315,40%,30%,0.25)",
              }}
            >
              {/* Top row: user + plan + amount */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="rounded-lg p-1.5" style={{ background: "hsla(315,80%,40%,0.15)" }}>
                    <User size={13} style={{ color: "hsl(var(--primary))" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "hsl(var(--foreground))" }}>
                      @{payment.user_username}
                    </p>
                    <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      TG: {payment.user_telegram_id}
                    </p>
                  </div>
                </div>

                <div
                  className="rounded-full px-3 py-1 text-xs font-bold uppercase"
                  style={{
                    background: "hsla(44,80%,40%,0.15)",
                    border: "1px solid hsla(44,80%,55%,0.3)",
                    color: "hsl(48,100%,68%)",
                  }}
                >
                  {payment.plan}
                </div>

                <span
                  className="text-lg font-black"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: "hsl(142,70%,55%)",
                    textShadow: "0 0 12px hsla(142,70%,55%,0.3)",
                  }}
                >
                  ${payment.amount_usd}
                </span>
              </div>

              {/* Crypto + TX details */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Wallet size={12} style={{ color: "hsl(var(--muted-foreground))" }} />
                  <span className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {payment.crypto_currency}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Hash size={12} style={{ color: "hsl(var(--muted-foreground))" }} />
                  <code className="text-[11px] break-all font-mono flex-1" style={{ color: "hsl(var(--foreground))", opacity: 0.8 }}>
                    {payment.tx_hash}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={12} style={{ color: "hsl(var(--muted-foreground))" }} />
                  <span className="text-[11px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {new Date(payment.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action buttons — only for pending */}
              {filter === "pending" && (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={processing === payment.id}
                    onClick={() => handleDecision(payment.id, "approve")}
                    className="flex-1 rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: "linear-gradient(135deg, hsl(142,60%,35%), hsl(142,70%,45%))",
                      border: "1px solid hsla(142,60%,50%,0.5)",
                      color: "#fff",
                      boxShadow: "0 0 16px hsla(142,70%,45%,0.3)",
                      opacity: processing === payment.id ? 0.6 : 1,
                    }}
                  >
                    <Check size={14} />
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={processing === payment.id}
                    onClick={() => handleDecision(payment.id, "reject")}
                    className="flex-1 rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: "hsla(0,60%,25%,0.3)",
                      border: "1px solid hsla(0,60%,40%,0.4)",
                      color: "hsl(0,75%,65%)",
                      opacity: processing === payment.id ? 0.6 : 1,
                    }}
                  >
                    <X size={14} />
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OwnerPanelPage;
