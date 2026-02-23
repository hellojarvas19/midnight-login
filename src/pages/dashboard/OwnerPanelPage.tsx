import { useState, useEffect, useCallback, useRef } from "react";
import {
  Check, X, Clock, RefreshCw, Shield, User, Hash, Wallet,
  Crown, ShieldAlert, Ban, UserPlus, UserMinus, Coins, ChevronDown,
  ChevronUp, Settings2, Zap, Star, Globe, Plus, Trash2, Upload, FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

/* ─── Types ─── */
interface OwnerPerms {
  can_approve_payments: boolean;
  can_ban_users: boolean;
  can_manage_admins: boolean;
  can_give_credits: boolean;
}

interface ManagedUser {
  id: string;
  username: string;
  telegram_id: string | null;
  credits: number;
  plan: string;
  plan_expires_at: string | null;
  banned: boolean;
  banned_at: string | null;
  created_at: string;
  roles: string[];
  owner_permissions: OwnerPerms | null;
  is_primary: boolean;
}

interface WhoAmI {
  isPrimary: boolean;
  isOwner: boolean;
  permissions: OwnerPerms;
}

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
  payment_type?: string;
  credits_amount?: number;
}

/* ─── Helper ─── */
const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

async function ownerApi(path: string, method = "GET", body?: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

/* ─── Tab Button ─── */
const TabBtn = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all"
    style={{
      background: active ? "hsla(315,80%,40%,0.2)" : "hsla(315,30%,15%,0.3)",
      border: `1px solid ${active ? "hsla(315,70%,55%,0.4)" : "hsla(315,40%,30%,0.25)"}`,
      color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
    }}
  >
    {label}
  </button>
);

/* ─── Credits Dialog ─── */
const CreditsDialog = ({ user, onClose, onSubmit }: { user: ManagedUser; onClose: () => void; onSubmit: (amount: number) => void }) => {
  const [amount, setAmount] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "hsla(0,0%,0%,0.7)" }}>
      <div className="glass-card rounded-2xl p-6 w-80 flex flex-col gap-4" style={{ border: "1px solid hsla(315,40%,30%,0.3)" }}>
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>
          Give Credits to @{user.username}
        </h3>
        <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
          Current: {user.credits.toLocaleString()} credits
        </p>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount to add"
          min="1"
          className="rounded-xl px-4 py-2.5 text-sm outline-none"
          style={{
            background: "hsla(315,30%,10%,0.5)",
            border: "1px solid hsla(315,40%,30%,0.3)",
            color: "hsl(var(--foreground))",
          }}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { const n = parseInt(amount, 10); if (n > 0) onSubmit(n); }}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold"
            style={{
              background: "linear-gradient(135deg, hsl(142,60%,35%), hsl(142,70%,45%))",
              color: "#fff",
            }}
          >
            Add Credits
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold"
            style={{ background: "hsla(0,60%,25%,0.3)", color: "hsl(0,75%,65%)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Permissions Editor ─── */
const PermToggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all"
    style={{
      background: value ? "hsla(142,60%,20%,0.25)" : "hsla(0,60%,20%,0.15)",
      border: `1px solid ${value ? "hsla(142,60%,40%,0.4)" : "hsla(0,60%,30%,0.3)"}`,
      color: value ? "hsl(142,70%,60%)" : "hsl(0,75%,65%)",
    }}
  >
    {value ? <Check size={12} /> : <X size={12} />}
    {label}
  </button>
);

/* ─── User Card ─── */
const UserCard = ({
  user, whoami, onAction, processing,
}: {
  user: ManagedUser;
  whoami: WhoAmI;
  onAction: (action: string, userId: string, extra?: any) => Promise<void>;
  processing: string | null;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [editPerms, setEditPerms] = useState<OwnerPerms | null>(null);

  const isOwner = user.roles.includes("owner");
  const isAdmin = user.roles.includes("admin");
  const busy = processing === user.id;

  return (
    <>
      <div
        className="glass-card rounded-2xl p-4 flex flex-col gap-3 animate-card-entrance"
        style={{ border: "1px solid hsla(315,40%,30%,0.25)" }}
      >
        {/* User info row */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg p-1.5" style={{ background: "hsla(315,80%,40%,0.15)" }}>
            <User size={14} style={{ color: "hsl(var(--primary))" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-bold truncate" style={{ color: "hsl(var(--foreground))" }}>
                @{user.username}
              </p>
              {user.is_primary && (
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full"
                  style={{ background: "hsla(44,90%,45%,0.2)", border: "1px solid hsla(44,90%,55%,0.4)", color: "hsl(48,100%,70%)" }}>
                  <Star size={8} className="inline mr-0.5" style={{ verticalAlign: "middle" }} />Primary
                </span>
              )}
              {isOwner && !user.is_primary && (
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full"
                  style={{ background: "hsla(0,80%,40%,0.2)", border: "1px solid hsla(0,80%,50%,0.4)", color: "hsl(0,85%,65%)" }}>
                  Owner
                </span>
              )}
              {isAdmin && (
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full"
                  style={{ background: "hsla(44,80%,40%,0.15)", border: "1px solid hsla(44,80%,50%,0.3)", color: "hsl(48,100%,68%)" }}>
                  Admin
                </span>
              )}
              {user.banned && (
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full"
                  style={{ background: "hsla(0,80%,30%,0.3)", border: "1px solid hsla(0,80%,50%,0.4)", color: "hsl(0,80%,65%)" }}>
                  Banned
                </span>
              )}
            </div>
            <p className="text-[10px] flex items-center gap-2" style={{ color: "hsl(var(--muted-foreground))" }}>
              <span>TG: {user.telegram_id || "—"}</span>
              <span>•</span>
              <span>{user.credits.toLocaleString()} credits</span>
              <span>•</span>
              <span>{user.plan}</span>
            </p>
          </div>
          <button type="button" onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg" style={{ color: "hsl(var(--muted-foreground))" }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Expanded actions */}
        {expanded && !user.is_primary && (
          <div className="flex flex-col gap-2 pt-2" style={{ borderTop: "1px solid hsla(315,30%,25%,0.2)" }}>
            <div className="flex flex-wrap gap-2">
              {/* Ban/Unban */}
              {whoami.permissions.can_ban_users && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAction(user.banned ? "unban" : "ban", user.id)}
                  className="rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5 transition-all"
                  style={{
                    background: user.banned ? "hsla(142,60%,20%,0.2)" : "hsla(0,60%,20%,0.2)",
                    border: `1px solid ${user.banned ? "hsla(142,60%,40%,0.4)" : "hsla(0,60%,40%,0.4)"}`,
                    color: user.banned ? "hsl(142,70%,60%)" : "hsl(0,75%,60%)",
                    opacity: busy ? 0.5 : 1,
                  }}
                >
                  <Ban size={12} />
                  {user.banned ? "Unban" : "Ban"}
                </button>
              )}

              {/* Give credits */}
              {whoami.permissions.can_give_credits && (
                <button
                  type="button"
                  onClick={() => setShowCredits(true)}
                  className="rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5"
                  style={{
                    background: "hsla(44,80%,40%,0.15)",
                    border: "1px solid hsla(44,80%,55%,0.3)",
                    color: "hsl(48,100%,68%)",
                  }}
                >
                  <Coins size={12} />
                  Give Credits
                </button>
              )}

              {/* Admin toggle */}
              {whoami.permissions.can_manage_admins && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAction(isAdmin ? "remove-admin" : "add-admin", user.id)}
                  className="rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5"
                  style={{
                    background: isAdmin ? "hsla(0,60%,20%,0.2)" : "hsla(315,60%,30%,0.2)",
                    border: `1px solid ${isAdmin ? "hsla(0,60%,40%,0.3)" : "hsla(315,60%,40%,0.3)"}`,
                    color: isAdmin ? "hsl(0,75%,60%)" : "hsl(var(--primary))",
                    opacity: busy ? 0.5 : 1,
                  }}
                >
                  {isAdmin ? <UserMinus size={12} /> : <UserPlus size={12} />}
                  {isAdmin ? "Remove Admin" : "Make Admin"}
                </button>
              )}

              {/* Owner management (PRIMARY ONLY) */}
              {whoami.isPrimary && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onAction(isOwner ? "remove-owner" : "add-owner", user.id, isOwner ? undefined : { permissions: { can_approve_payments: false, can_ban_users: false, can_manage_admins: false, can_give_credits: false } })}
                    className="rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5"
                    style={{
                      background: isOwner ? "hsla(0,60%,20%,0.2)" : "hsla(0,80%,40%,0.15)",
                      border: `1px solid ${isOwner ? "hsla(0,60%,40%,0.3)" : "hsla(0,80%,50%,0.3)"}`,
                      color: isOwner ? "hsl(0,75%,60%)" : "hsl(0,85%,65%)",
                      opacity: busy ? 0.5 : 1,
                    }}
                  >
                    <Crown size={12} />
                    {isOwner ? "Remove Owner" : "Make Owner"}
                  </button>

                  {/* Permission editor for existing owners */}
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setEditPerms(user.owner_permissions || { can_approve_payments: false, can_ban_users: false, can_manage_admins: false, can_give_credits: false })}
                      className="rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5"
                      style={{
                        background: "hsla(315,60%,30%,0.15)",
                        border: "1px solid hsla(315,60%,40%,0.3)",
                        color: "hsl(var(--primary))",
                      }}
                    >
                      <Settings2 size={12} />
                      Permissions
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Inline permission editor */}
            {editPerms && (
              <div className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: "hsla(315,30%,10%,0.4)", border: "1px solid hsla(315,40%,30%,0.2)" }}>
                <p className="text-xs font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>Owner Permissions:</p>
                <div className="flex flex-wrap gap-2">
                  <PermToggle label="Payments" value={editPerms.can_approve_payments} onChange={(v) => setEditPerms({ ...editPerms, can_approve_payments: v })} />
                  <PermToggle label="Ban Users" value={editPerms.can_ban_users} onChange={(v) => setEditPerms({ ...editPerms, can_ban_users: v })} />
                  <PermToggle label="Admins" value={editPerms.can_manage_admins} onChange={(v) => setEditPerms({ ...editPerms, can_manage_admins: v })} />
                  <PermToggle label="Credits" value={editPerms.can_give_credits} onChange={(v) => setEditPerms({ ...editPerms, can_give_credits: v })} />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      await onAction("update-permissions", user.id, { permissions: editPerms });
                      setEditPerms(null);
                    }}
                    className="rounded-xl px-4 py-2 text-xs font-bold"
                    style={{ background: "linear-gradient(135deg, hsl(142,60%,35%), hsl(142,70%,45%))", color: "#fff" }}
                  >
                    Save
                  </button>
                  <button type="button" onClick={() => setEditPerms(null)} className="rounded-xl px-4 py-2 text-xs font-bold"
                    style={{ background: "hsla(0,60%,25%,0.3)", color: "hsl(0,75%,65%)" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showCredits && (
        <CreditsDialog
          user={user}
          onClose={() => setShowCredits(false)}
          onSubmit={async (amount) => {
            await onAction("give-credits", user.id, { amount });
            setShowCredits(false);
          }}
        />
      )}
    </>
  );
};

/* ─── Payment Card (reused from old panel) ─── */
const PaymentCard = ({ payment, onDecision, processing }: {
  payment: Payment;
  onDecision: (id: string, d: "approve" | "reject") => void;
  processing: string | null;
}) => (
  <div className="glass-card rounded-2xl p-4 flex flex-col gap-3 animate-card-entrance" style={{ border: "1px solid hsla(315,40%,30%,0.25)" }}>
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="rounded-lg p-1.5" style={{ background: "hsla(315,80%,40%,0.15)" }}>
          <User size={13} style={{ color: "hsl(var(--primary))" }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: "hsl(var(--foreground))" }}>@{payment.user_username}</p>
          <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>TG: {payment.user_telegram_id}</p>
        </div>
      </div>
      <span className="rounded-full px-3 py-1 text-xs font-bold uppercase"
        style={{ background: "hsla(44,80%,40%,0.15)", border: "1px solid hsla(44,80%,55%,0.3)", color: "hsl(48,100%,68%)" }}>
        {payment.payment_type === "credits" ? `${payment.credits_amount} credits` : payment.plan}
      </span>
      <span className="text-lg font-black" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "hsl(142,70%,55%)" }}>
        ${payment.amount_usd}
      </span>
    </div>
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Wallet size={12} style={{ color: "hsl(var(--muted-foreground))" }} />
        <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{payment.crypto_currency}</span>
      </div>
      <div className="flex items-center gap-2">
        <Hash size={12} style={{ color: "hsl(var(--muted-foreground))" }} />
        <code className="text-[11px] break-all font-mono flex-1" style={{ color: "hsl(var(--foreground))", opacity: 0.8 }}>{payment.tx_hash}</code>
      </div>
      <div className="flex items-center gap-2">
        <Clock size={12} style={{ color: "hsl(var(--muted-foreground))" }} />
        <span className="text-[11px]" style={{ color: "hsl(var(--muted-foreground))" }}>{new Date(payment.created_at).toLocaleString()}</span>
      </div>
    </div>
    {payment.status === "pending" && (
      <div className="flex gap-2 pt-1">
        <button type="button" disabled={processing === payment.id} onClick={() => onDecision(payment.id, "approve")}
          className="flex-1 rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, hsl(142,60%,35%), hsl(142,70%,45%))", color: "#fff", opacity: processing === payment.id ? 0.6 : 1 }}>
          <Check size={14} />Approve
        </button>
        <button type="button" disabled={processing === payment.id} onClick={() => onDecision(payment.id, "reject")}
          className="flex-1 rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2"
          style={{ background: "hsla(0,60%,25%,0.3)", border: "1px solid hsla(0,60%,40%,0.4)", color: "hsl(0,75%,65%)", opacity: processing === payment.id ? 0.6 : 1 }}>
          <X size={14} />Reject
        </button>
      </div>
    )}
  </div>
);

/* ─── Main Page ─── */
const OwnerPanelPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"users" | "payments" | "sites">("users");
  const [whoami, setWhoami] = useState<WhoAmI | null>(null);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payFilter, setPayFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Sites state
  const [sitesList, setSitesList] = useState<{ id: string; url: string; created_at: string }[]>([]);
  const [newSiteUrl, setNewSiteUrl] = useState("");
  const [sitesLoading, setSitesLoading] = useState(false);
  const siteFileRef = useRef<HTMLInputElement>(null);

  const fetchSites = useCallback(async () => {
    setSitesLoading(true);
    try {
      const { data, error } = await supabase.from("shopify_sites").select("id, url, created_at").order("created_at", { ascending: false });
      if (error) throw error;
      setSitesList(data || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSitesLoading(false);
    }
  }, [toast]);

  const addSite = async () => {
    const url = newSiteUrl.trim();
    if (!url || !url.startsWith("http")) return;
    try {
      const { error } = await supabase.from("shopify_sites").insert({ url, added_by: user!.id });
      if (error) throw error;
      setNewSiteUrl("");
      toast({ title: "Site added" });
      fetchSites();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const removeSite = async (id: string) => {
    try {
      const { error } = await supabase.from("shopify_sites").delete().eq("id", id);
      if (error) throw error;
      setSitesList((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Site removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const addSitesFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const urls = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0 && l.startsWith("http"));
      if (urls.length === 0) {
        toast({ title: "No valid URLs found", description: "Each line should be a URL starting with http", variant: "destructive" });
        return;
      }
      const rows = urls.map((url) => ({ url, added_by: user!.id }));
      try {
        const { error } = await supabase.from("shopify_sites").insert(rows);
        if (error) throw error;
        toast({ title: `${urls.length} site${urls.length !== 1 ? "s" : ""} added` });
        fetchSites();
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  // Check identity
  useEffect(() => {
    if (!user) return;
    ownerApi("owner-manage?action=whoami")
      .then((data) => { setWhoami(data); setIsOwner(true); })
      .catch(() => setIsOwner(false));
  }, [user]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ownerApi("owner-manage?action=list-users");
      setUsers(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ownerApi(`owner-payments?action=list&status=${payFilter}`);
      setPayments(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [payFilter, toast]);

  useEffect(() => {
    if (!isOwner) return;
    if (tab === "users") fetchUsers();
    else if (tab === "payments") fetchPayments();
    else fetchSites();
  }, [isOwner, tab, fetchUsers, fetchPayments, fetchSites]);

  // User action handler
  const handleUserAction = async (action: string, targetId: string, extra?: any) => {
    setProcessing(targetId);
    try {
      await ownerApi(`owner-manage?action=${action}`, "POST", { target_user_id: targetId, ...extra });
      toast({ title: "Success", description: `Action "${action}" completed.` });
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  // Payment decision handler
  const handlePayDecision = async (paymentId: string, decision: "approve" | "reject") => {
    setProcessing(paymentId);
    try {
      await ownerApi("owner-payments", "POST", { payment_id: paymentId, decision });
      toast({ title: decision === "approve" ? "Payment Approved ✓" : "Payment Rejected" });
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
          This panel is restricted to owners only.
        </p>
      </div>
    );
  }

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.telegram_id || "").includes(searchTerm)
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="animate-card-entrance" style={{ animationFillMode: "both" }}>
        <p className="text-sm font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
          {whoami?.isPrimary ? "Primary Owner" : "Owner"}
        </p>
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
          Control Panel
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <TabBtn active={tab === "users"} label="Users" onClick={() => setTab("users")} />
        <TabBtn active={tab === "payments"} label="Payments" onClick={() => setTab("payments")} />
        <TabBtn active={tab === "sites"} label="Sites" onClick={() => setTab("sites")} />
        <div className="flex-1" />
        <button type="button" onClick={() => tab === "users" ? fetchUsers() : tab === "payments" ? fetchPayments() : fetchSites()}
          className="rounded-xl p-2 transition-all"
          style={{ background: "hsla(315,30%,15%,0.3)", border: "1px solid hsla(315,40%,30%,0.25)", color: "hsl(var(--muted-foreground))" }}>
          <RefreshCw size={14} className={loading || sitesLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Users Tab */}
      {tab === "users" && (
        <>
          {/* Search */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by username or TG ID..."
            className="rounded-xl px-4 py-2.5 text-sm outline-none w-full"
            style={{
              background: "hsla(315,30%,10%,0.5)",
              border: "1px solid hsla(315,40%,30%,0.3)",
              color: "hsl(var(--foreground))",
            }}
          />

          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw size={20} className="animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
              </p>
              {filteredUsers.map((u) => (
                <UserCard key={u.id} user={u} whoami={whoami!} onAction={handleUserAction} processing={processing} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Payments Tab */}
      {tab === "payments" && (
        <>
          <div className="flex items-center gap-2">
            {(["pending", "approved", "rejected"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setPayFilter(f)}
                className="rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all"
                style={{
                  background: payFilter === f
                    ? f === "pending" ? "hsla(44,80%,40%,0.2)" : f === "approved" ? "hsla(142,60%,20%,0.2)" : "hsla(0,60%,20%,0.2)"
                    : "hsla(315,30%,15%,0.3)",
                  border: `1px solid ${payFilter === f
                    ? f === "pending" ? "hsla(44,80%,55%,0.4)" : f === "approved" ? "hsla(142,60%,40%,0.4)" : "hsla(0,60%,40%,0.4)"
                    : "hsla(315,40%,30%,0.25)"}`,
                  color: payFilter === f
                    ? f === "pending" ? "hsl(48,100%,68%)" : f === "approved" ? "hsl(142,70%,60%)" : "hsl(0,75%,60%)"
                    : "hsl(var(--muted-foreground))",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw size={20} className="animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
            </div>
          ) : payments.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 flex flex-col items-center gap-3">
              <Clock size={28} style={{ color: "hsl(var(--muted-foreground))", opacity: 0.5 }} />
              <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>No {payFilter} payments</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {payments.map((p) => (
                <PaymentCard key={p.id} payment={p} onDecision={handlePayDecision} processing={processing} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Sites Tab */}
      {tab === "sites" && (
        <>
          {/* Add site input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newSiteUrl}
              onChange={(e) => setNewSiteUrl(e.target.value)}
              placeholder="https://example.myshopify.com"
              onKeyDown={(e) => e.key === "Enter" && addSite()}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none font-mono"
              style={{
                background: "hsla(315,30%,10%,0.5)",
                border: "1px solid hsla(315,40%,30%,0.3)",
                color: "hsl(var(--foreground))",
              }}
            />
            <button
              type="button"
              onClick={addSite}
              disabled={!newSiteUrl.trim() || !newSiteUrl.startsWith("http")}
              className="rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-1.5 transition-all disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, hsl(315,95%,40%), hsl(315,85%,50%))",
                color: "hsl(var(--primary-foreground))",
                border: "1px solid hsla(315,80%,60%,0.3)",
              }}
            >
              <Plus size={14} /> Add
            </button>
            <button
              type="button"
              onClick={() => siteFileRef.current?.click()}
              className="rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-1.5 transition-all"
              style={{
                background: "hsla(44,80%,40%,0.15)",
                border: "1px solid hsla(44,80%,55%,0.3)",
                color: "hsl(48,100%,68%)",
              }}
            >
              <Upload size={14} /> .txt
            </button>
            <input
              ref={siteFileRef}
              type="file"
              accept=".txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) addSitesFromFile(file);
                e.target.value = "";
              }}
            />
          </div>

          <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.7 }}>
            Add sites one by one or upload a .txt file (one URL per line). Checker rotates: 1 site = 10 cards.
          </p>

          {sitesLoading ? (
            <div className="flex justify-center py-12">
              <RefreshCw size={20} className="animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
            </div>
          ) : sitesList.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 flex flex-col items-center gap-3">
              <Globe size={28} style={{ color: "hsl(var(--muted-foreground))", opacity: 0.5 }} />
              <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>No Shopify sites added yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                {sitesList.length} site{sitesList.length !== 1 ? "s" : ""} · checker rotates every 10 cards
              </p>
              {sitesList.map((site) => (
                <div
                  key={site.id}
                  className="glass-card rounded-xl px-4 py-3 flex items-center gap-3 animate-card-entrance"
                  style={{ border: "1px solid hsla(315,40%,30%,0.25)" }}
                >
                  <Globe size={13} style={{ color: "hsl(var(--primary))" }} />
                  <span className="flex-1 text-sm font-mono truncate" style={{ color: "hsl(var(--foreground))" }}>{site.url}</span>
                  <span className="text-[10px] shrink-0" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {new Date(site.created_at).toLocaleDateString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSite(site.id)}
                    className="shrink-0 rounded-lg p-1.5 transition-all hover:scale-110"
                    style={{ color: "hsl(0,75%,60%)" }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OwnerPanelPage;
