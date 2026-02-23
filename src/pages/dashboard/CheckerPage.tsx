import { useState, useRef, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { usePlan } from "@/contexts/PlanContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload, Play, Loader2, CheckCircle2, XCircle, CreditCard,
  Trash2, FileText, ClipboardList, Copy, Download, Check,
  Shield, ShieldCheck, ShieldOff, Plus, X, Zap, Settings2,
  Globe,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type CardResult = {
  raw: string;
  card: string;
  expiry: string;
  cvv: string;
  luhnValid: boolean;
  status: "pending" | "checking" | "charged" | "approved" | "declined";
  responseCode?: string;
  responseMessage?: string;
};

/** Luhn algorithm — returns true if the card number passes the check */
const luhnCheck = (num: string): boolean => {
  const digits = num.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (isEven) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    isEven = !isEven;
  }
  return sum % 10 === 0;
};

const parseCardLine = (line: string): { card: string; expiry: string; cvv: string } => {
  const clean = line.trim();
  const sep = clean.includes("|") ? "|" : clean.includes(":") ? ":" : " ";
  const parts = clean.split(sep).map((p) => p.trim());
  return {
    card: parts[0] || "",
    expiry: parts[1] || "",
    cvv: parts[2] || "",
  };
};

const maskCard = (card: string) => {
  const d = card.replace(/\s/g, "");
  if (d.length < 4) return card;
  return `•••• •••• •••• ${d.slice(-4)}`;
};

const STATUS_CONFIG = {
  pending:  { label: "Pending",  color: "hsl(var(--muted-foreground))", bg: "hsla(330,15%,15%,0.5)", icon: null },
  checking: { label: "Checking…", color: "hsl(315,95%,65%)", bg: "hsla(315,80%,30%,0.2)", icon: null },
  charged:  { label: "Charged",  color: "hsl(315,95%,70%)", bg: "hsla(315,80%,30%,0.2)", icon: "charge" },
  approved: { label: "Approved", color: "hsl(142,70%,55%)", bg: "hsla(142,60%,20%,0.25)", icon: "check" },
  declined: { label: "Declined", color: "hsl(0,75%,60%)",   bg: "hsla(0,65%,20%,0.25)",  icon: "x" },
};

/* ─── Sparkle Burst ─── */
type Sparkle = { id: number; x: number; y: number; color: string; size: number; distance: number; duration: number; shape: "star" | "circle" | "diamond" };

const SPARKLE_COLORS = [
  "hsl(315,95%,70%)", "hsl(315,90%,80%)", "hsl(45,100%,65%)",
  "hsl(142,70%,60%)", "hsl(200,90%,70%)", "hsl(0,0%,100%)",
];

const SparklesBurst = ({ active }: { active: boolean }) => {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const prevActive = useRef(false);

  useEffect(() => {
    if (active && !prevActive.current) {
      const burst: Sparkle[] = Array.from({ length: 28 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 140 - 70,
        y: Math.random() * 60 - 80,
        color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
        size: 6 + Math.random() * 9,
        distance: 45 + Math.random() * 75,
        duration: 550 + Math.random() * 500,
        shape: (["star", "circle", "diamond"] as const)[Math.floor(Math.random() * 3)],
      }));
      setSparkles(burst);
      setTimeout(() => setSparkles([]), 1200);
    }
    prevActive.current = active;
  }, [active]);

  if (sparkles.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" style={{ zIndex: 50 }}>
      {sparkles.map((s) => {
        const tx = `translateX(${s.x}px)`;
        const ty = `translateY(${s.y - s.distance}px)`;
        return (
          <div
            key={s.id}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: s.size,
              height: s.size,
              marginLeft: -s.size / 2,
              marginTop: -s.size / 2,
              ["--tx" as string]: tx,
              ["--ty" as string]: ty,
              animation: `sparkle-fly ${s.duration}ms cubic-bezier(0.22,1,0.36,1) forwards`,
            }}
          >
            {s.shape === "star" && (
              <svg viewBox="0 0 10 10" width={s.size} height={s.size} style={{ filter: `drop-shadow(0 0 3px ${s.color})` }}>
                <polygon points="5,0 6,4 10,4 7,6 8,10 5,7 2,10 3,6 0,4 4,4" fill={s.color} />
              </svg>
            )}
            {s.shape === "circle" && (
              <div style={{ width: s.size, height: s.size, borderRadius: "50%", background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
            )}
            {s.shape === "diamond" && (
              <div style={{ width: s.size, height: s.size, background: s.color, transform: "rotate(45deg)", boxShadow: `0 0 6px ${s.color}` }} />
            )}
          </div>
        );
      })}
    </div>
  );
};

const CheckerPage = () => {
  const { toast } = useToast();
  const { activePlan, isPlanActive } = usePlan();
  const { user: authUser, profile, refreshProfile } = useAuth();

  // ── Daily usage tracking (DB-based) ──
  const [dailyUsed, setDailyUsed] = useState(0);
  const dailyLimit = activePlan?.dailyLimit ?? 0;
  const dailyRemaining = Math.max(0, dailyLimit - dailyUsed);

  useEffect(() => {
    if (!authUser) return;
    supabase
      .from("daily_usage")
      .select("checks_used")
      .eq("user_id", authUser.id)
      .eq("usage_date", new Date().toISOString().slice(0, 10))
      .maybeSingle()
      .then(({ data }) => setDailyUsed(data?.checks_used ?? 0));
  }, [authUser]);

  // ── Typewriter for heading ──
  const HEADING = "Checker";
  const [typedCount, setTypedCount] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    if (typedCount < HEADING.length) {
      const t = setTimeout(() => setTypedCount((n) => n + 1), 95);
      return () => clearTimeout(t);
    }
  }, [typedCount]);

  useEffect(() => {
    const t = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(t);
  }, []);

  // ── Session persistence helpers ──
  const STORAGE_KEY = "checker_session";
  const saveSession = useCallback((data: Record<string, any>) => {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...data }));
    } catch {}
  }, []);
  const loadSession = useCallback(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  }, []);
  const clearSession = useCallback(() => { localStorage.removeItem(STORAGE_KEY); }, []);

  const saved = useRef(loadSession());

  const [gateway, setGateway] = useState(saved.current.gateway || "");
  const [inputMode, setInputMode] = useState<"paste" | "file">("paste");
  const [pasteText, setPasteText] = useState(saved.current.pasteText || "");
  const [cards, setCards] = useState<CardResult[]>(() => {
    if (saved.current.pasteText) return parseLines(saved.current.pasteText);
    return [];
  });
  const [isRunning, setIsRunning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [proxyOpen, setProxyOpen] = useState(false);
  const [proxyInput, setProxyInput] = useState("");
  const [proxies, setProxies] = useState<string[]>(saved.current.proxies || []);
  const [proxyEnabled, setProxyEnabled] = useState((saved.current.proxies?.length ?? 0) > 0);
  const proxyIndexRef = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<boolean>(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(saved.current.currentJobId || null);

  // ── Persist session on state changes ──
  useEffect(() => { saveSession({ gateway }); }, [gateway]);
  useEffect(() => { saveSession({ pasteText }); }, [pasteText]);
  useEffect(() => { saveSession({ proxies }); }, [proxies]);
  useEffect(() => { saveSession({ currentJobId }); }, [currentJobId]);

  // ── Restore running job on mount ──
  useEffect(() => {
    if (!saved.current.currentJobId || !authUser) return;
    const jobId = saved.current.currentJobId;
    supabase.from("check_jobs").select("*").eq("id", jobId).single().then(({ data }) => {
      if (data && data.status === "running") {
        setIsRunning(true);
        // Restore card statuses from DB
        supabase.from("check_results").select("*").eq("job_id", jobId).then(({ data: results }) => {
          if (results) {
            setCards(prev => prev.map(c => {
              const match = results.find((r: any) => r.card_number === c.card && r.expiry === c.expiry && r.cvv === c.cvv);
              if (match) return { ...c, status: match.status as CardResult["status"], responseCode: match.response_code || undefined, responseMessage: match.response_message || undefined };
              return c;
            }));
          }
        });
      } else if (data && ["completed", "failed", "stopped"].includes(data.status)) {
        // Restore final results
        supabase.from("check_results").select("*").eq("job_id", jobId).then(({ data: results }) => {
          if (results) {
            setCards(prev => prev.map(c => {
              const match = results.find((r: any) => r.card_number === c.card && r.expiry === c.expiry && r.cvv === c.cvv);
              if (match) return { ...c, status: match.status as CardResult["status"], responseCode: match.response_code || undefined, responseMessage: match.response_message || undefined };
              return c;
            }));
          }
        });
      }
    });
  }, [authUser]);

   // Sites are now managed by owners — fetch count for display
  const [sitesCount, setSitesCount] = useState(0);
  useEffect(() => {
    supabase.from("shopify_sites").select("id", { count: "exact", head: true }).then(({ count }) => setSitesCount(count ?? 0));
  }, []);

  const addProxies = () => {
    const lines = proxyInput
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return;
    setProxies((prev) => {
      const merged = Array.from(new Set([...prev, ...lines]));
      return merged;
    });
    setProxyInput("");
    setProxyEnabled(true);
  };

  const removeProxy = (idx: number) => {
    setProxies((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) setProxyEnabled(false);
      return next;
    });
  };

  const isDone = cards.length > 0 && !isRunning && cards
    .filter((c) => c.luhnValid)
    .every((c) => c.status === "approved" || c.status === "charged" || c.status === "declined")
    && cards.some((c) => c.luhnValid);

  const approvedAndCharged = cards.filter(
    (c) => c.status === "approved" || c.status === "charged"
  );

  const buildExportText = (subset: CardResult[]) =>
    subset
      .map((c) => `${c.card}|${c.expiry}|${c.cvv}|${c.status.toUpperCase()}${c.responseCode ? `|${c.responseCode}` : ""}`)
      .join("\n");

  const handleCopyResults = async () => {
    try {
      await navigator.clipboard.writeText(buildExportText(approvedAndCharged));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownloadResults = () => {
    const text = buildExportText(approvedAndCharged);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `approved-charged-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const MAX_CARDS = 500;

  const parseLines = (text: string): CardResult[] =>
    text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 8)
      .slice(0, MAX_CARDS)
      .map((l) => {
        const { card, expiry, cvv } = parseCardLine(l);
        return { raw: l, card, expiry, cvv, luhnValid: luhnCheck(card), status: "pending" as const };
      });

  const rawLineCount = (text: string) => text.split("\n").map((l) => l.trim()).filter((l) => l.length > 8).length;
  const [truncatedCount, setTruncatedCount] = useState(0);

  const loadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const total = rawLineCount(text);
      setTruncatedCount(total > MAX_CARDS ? total - MAX_CARDS : 0);
      setPasteText(text);
      setCards(parseLines(text));
    };
    reader.readAsText(file);
  };

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) loadFile(file);
    },
    []
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  };

  const handlePasteChange = (text: string) => {
    const total = rawLineCount(text);
    setTruncatedCount(total > MAX_CARDS ? total - MAX_CARDS : 0);
    setPasteText(text);
    setCards(parseLines(text));
  };

  // ── Realtime subscription for job updates ──
  useEffect(() => {
    if (!currentJobId) return;

    const jobChannel = supabase
      .channel(`job-${currentJobId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "check_jobs", filter: `id=eq.${currentJobId}` },
        (payload) => {
          const job = payload.new as any;
          if (job.status === "completed" || job.status === "failed" || job.status === "stopped") {
            setIsRunning(false);
            refreshProfile();
            const hits = (job.charged || 0) + (job.approved || 0);
            toast({
              title: hits > 0 ? "✅ Check Complete" : "❌ Check Complete",
              description: `${job.processed} processed · ${hits > 0
                ? `${job.approved} approved, ${job.charged} charged · ${job.declined} declined`
                : `All ${job.declined} declined`}`,
              variant: hits > 0 ? "default" : "destructive",
              duration: 5000,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "check_results", filter: `job_id=eq.${currentJobId}` },
        (payload) => {
          const result = payload.new as any;
          setCards((prev) =>
            prev.map((c) => {
              if (c.card === result.card_number && c.expiry === result.expiry && c.cvv === result.cvv) {
                return {
                  ...c,
                  status: result.status as CardResult["status"],
                  responseCode: result.response_code || undefined,
                  responseMessage: result.response_message || undefined,
                };
              }
              return c;
            })
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(jobChannel); };
  }, [currentJobId]);

  const handleRun = async () => {
    if (!isPlanActive || !activePlan) {
      toast({ title: "No active plan", description: "You need an active plan to use the checker.", variant: "destructive" });
      return;
    }

    const validCards = cards.filter((c) => c.luhnValid);
    if (!gateway || validCards.length === 0) return;

    // Enforce proxy requirement
    if (!proxyEnabled || proxies.length === 0) {
      toast({ title: "Proxies Required", description: "You must add and enable proxies before running the checker.", variant: "destructive" });
      return;
    }

    // Enforce sites requirement for shopify gateway
    if (gateway === "shopify" && sitesCount === 0) {
      toast({ title: "No Sites Available", description: "An owner must add Shopify sites before you can run the checker.", variant: "destructive" });
      return;
    }

    // Pre-check daily limit
    if (dailyRemaining === 0) {
      toast({ title: "Daily limit reached", description: `You've used all ${activePlan.dailyLimit.toLocaleString()} credits for today.`, variant: "destructive" });
      return;
    }

    const cardsToCheck = Math.min(validCards.length, dailyRemaining);
    if (cardsToCheck < validCards.length) {
      toast({ title: "Partial check", description: `Only ${cardsToCheck.toLocaleString()} of ${validCards.length.toLocaleString()} cards will be checked (daily limit).` });
    }

    // Atomically deduct credits
    if (authUser) {
      const { data } = await supabase.rpc("deduct_credits_atomic", {
        p_user_id: authUser.id,
        p_checks_requested: cardsToCheck,
        p_daily_limit: activePlan.dailyLimit,
      });
      const result = data as unknown as { success?: boolean; checks_allowed?: number; daily_used?: number; error?: string } | null;
      if (!result?.success) {
        toast({ title: "Credit check failed", description: result?.error || "Could not deduct credits.", variant: "destructive" });
        return;
      }
      setDailyUsed(result.daily_used ?? dailyUsed + cardsToCheck);
    }

    abortRef.current = false;
    setIsRunning(true);

    // Reset card statuses
    const updated = cards.map((c) => ({ ...c, status: "pending" as CardResult["status"], responseCode: undefined, responseMessage: undefined }));
    setCards(updated);

    // Create job in DB
    const cardsPayload = validCards.slice(0, cardsToCheck).map((c) => ({ card: c.card, expiry: c.expiry, cvv: c.cvv }));

    const { data: jobData, error: jobErr } = await supabase
      .from("check_jobs")
      .insert({
        user_id: authUser!.id,
        gateway,
        total_cards: cardsToCheck,
        proxies,
      })
      .select("id")
      .single();

    if (jobErr || !jobData) {
      toast({ title: "Error", description: "Failed to create check job.", variant: "destructive" });
      setIsRunning(false);
      return;
    }

    const jobId = jobData.id;
    setCurrentJobId(jobId);

    // Insert card results
    const resultRows = cardsPayload.map((c) => ({
      job_id: jobId,
      user_id: authUser!.id,
      card_number: c.card,
      expiry: c.expiry,
      cvv: c.cvv,
      status: "pending",
    }));

    await supabase.from("check_results").insert(resultRows);

    // Call edge function (sites fetched from DB by the function)
    const { error: fnErr } = await supabase.functions.invoke("checker-run", {
      body: { job_id: jobId, cards: cardsPayload, proxies },
    });

    if (fnErr) {
      console.error("Edge function error:", fnErr);
      // Job is still running on backend, don't stop
    }
  };

  const handleStop = async () => {
    if (currentJobId) {
      await supabase.from("check_jobs").update({ status: "stopped" }).eq("id", currentJobId);
    }
    abortRef.current = true;
    setIsRunning(false);
  };

  const handleClear = () => {
    setCards([]);
    setPasteText("");
    setCurrentJobId(null);
    clearSession();
  };

  const invalidCount = cards.filter((c) => !c.luhnValid).length;
  const validCount = cards.filter((c) => c.luhnValid).length;

  const stats = {
    total: cards.length,
    approved: cards.filter((c) => c.status === "approved").length,
    charged: cards.filter((c) => c.status === "charged").length,
    declined: cards.filter((c) => c.status === "declined").length,
    pending: cards.filter((c) => c.status === "pending" || c.status === "checking").length,
  };

  const progress = validCount
    ? Math.round(
        (cards.filter((c) => c.luhnValid && ["approved", "charged", "declined"].includes(c.status)).length /
          validCount) *
          100
      )
    : 0;

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page Header ── */}
      <div
        className="animate-card-entrance"
        style={{ animationDelay: "0ms", animationFillMode: "both" }}
      >
        <p className="text-sm font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>
          Mass processor,
        </p>
        <h1
          className="text-4xl font-black tracking-tight leading-none"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            color: "hsl(var(--primary))",
            textShadow: "0 0 30px hsla(315,90%,60%,0.45), 0 0 60px hsla(315,90%,50%,0.2)",
          }}
        >
          {HEADING.slice(0, typedCount)}
          <span
            style={{
              display: "inline-block",
              width: "3px",
              height: "0.75em",
              background: "hsl(var(--primary))",
              marginLeft: "4px",
              verticalAlign: "middle",
              borderRadius: "2px",
              opacity: cursorVisible ? 1 : 0,
              boxShadow: cursorVisible ? "0 0 10px hsl(var(--primary))" : "none",
              transition: "opacity 0.1s ease",
            }}
          />
        </h1>
        <p className="mt-2 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          Paste a card list or upload a file, select a gateway, add sites & proxies, then run.
        </p>

        {/* Daily credits bar */}
        {isPlanActive && activePlan && (
          <div className="mt-3 flex flex-col gap-1.5">
            <div className="flex justify-between text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
              <span className="flex items-center gap-1">
                <Zap size={11} style={{ color: "hsl(var(--primary))" }} />
                Daily Credits
              </span>
              <span style={{ color: dailyRemaining === 0 ? "hsl(0,75%,60%)" : "hsl(var(--foreground))" }}>
                {dailyUsed.toLocaleString()} / {dailyLimit.toLocaleString()} used
              </span>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ height: 5, background: "hsla(315,40%,20%,0.3)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (dailyUsed / dailyLimit) * 100)}%`,
                  background: dailyUsed / dailyLimit > 0.9
                    ? "linear-gradient(90deg, hsl(0,75%,50%), hsl(0,70%,60%))"
                    : "linear-gradient(90deg, hsl(315,95%,45%), hsl(315,90%,65%))",
                  boxShadow: "0 0 8px hsla(315,90%,55%,0.4)",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Config Card ── */}
      <div
        className="glass-card animate-card-entrance rounded-2xl overflow-hidden"
        style={{ animationDelay: "60ms", animationFillMode: "both" }}
      >
        {/* Card header */}
        <div
          className="flex items-center gap-3 px-5 py-4 border-b"
          style={{ borderColor: "hsla(315,30%,25%,0.2)" }}
        >
          <div className="rounded-xl p-2" style={{ background: "hsla(315,80%,40%,0.15)" }}>
            <Settings2 size={15} style={{ color: "hsl(var(--primary))", filter: "drop-shadow(0 0 5px hsla(315,90%,60%,0.55))" }} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
            Configuration
          </p>
        </div>

        <div className="p-5 flex flex-col gap-5">

          {/* Gateway selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
              Gateway
            </label>
            <Select value={gateway} onValueChange={setGateway}>
              <SelectTrigger
                className="rounded-xl border-0 h-12 px-4 text-sm font-medium focus:ring-0 focus:ring-offset-0"
                style={{
                  background: "hsla(330,20%,6%,0.9)",
                  border: "1px solid hsla(315,35%,35%,0.22)",
                  color: gateway ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                }}
              >
                <SelectValue placeholder="Choose a gateway…" />
              </SelectTrigger>
              <SelectContent
                style={{
                  background: "hsl(330,15%,6%)",
                  border: "1px solid hsla(315,50%,40%,0.3)",
                  backdropFilter: "blur(20px)",
                  zIndex: 100,
                }}
              >
                {[
                  { value: "shopify", emoji: "🛍️", anim: "emoji-wobble 1.8s ease-in-out infinite", label: "Shopify" },
                ].map((g) => (
                  <SelectItem key={g.value} value={g.value} style={{ color: "hsl(var(--foreground))" }}>
                    <span className="flex items-center gap-2">
                      <span style={{ display: "inline-block", animation: g.anim }}>{g.emoji}</span>
                      {g.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Sites info (owner-managed) ── */}
          {gateway === "shopify" && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{
              background: "hsla(315,30%,12%,0.5)",
              border: `1px solid ${sitesCount > 0 ? "hsla(142,60%,40%,0.3)" : "hsla(0,60%,40%,0.3)"}`,
            }}>
              <Globe size={13} style={{ color: sitesCount > 0 ? "hsl(142,70%,55%)" : "hsl(0,75%,60%)" }} />
              <span className="text-xs font-medium" style={{ color: sitesCount > 0 ? "hsl(142,70%,55%)" : "hsl(0,75%,60%)" }}>
                {sitesCount > 0
                  ? `${sitesCount} Shopify site${sitesCount === 1 ? "" : "s"} configured · rotates every 10 cards`
                  : "No sites configured — ask an owner to add sites"}
              </span>
            </div>
          )}

          {/* ── Proxy section ── */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
                Proxies <span className="text-[9px] font-bold px-1.5 py-0.5 rounded ml-1.5" style={{ background: "hsla(0,65%,30%,0.4)", color: "hsl(0,75%,65%)", border: "1px solid hsla(0,65%,50%,0.3)" }}>REQUIRED</span>
                {proxies.length > 0 && (
                  <span className="ml-2 normal-case font-normal" style={{ color: proxyEnabled ? "hsl(142,70%,55%)" : "hsl(var(--muted-foreground))", opacity: 0.8 }}>
                    {proxies.length} loaded
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                {proxies.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setProxyEnabled((e) => !e)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
                    style={{
                      background: proxyEnabled ? "linear-gradient(135deg, hsl(142,65%,28%), hsl(142,60%,38%))" : "hsla(330,20%,10%,0.7)",
                      color: proxyEnabled ? "hsl(142,70%,65%)" : "hsl(var(--muted-foreground))",
                      border: proxyEnabled ? "1px solid hsla(142,60%,45%,0.45)" : "1px solid hsla(315,25%,30%,0.2)",
                      boxShadow: proxyEnabled ? "0 0 14px hsla(142,60%,40%,0.3)" : "none",
                    }}
                  >
                    {proxyEnabled ? <><ShieldCheck size={12} /> ON</> : <><ShieldOff size={12} /> OFF</>}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setProxyOpen((o) => !o)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
                  style={{
                    background: proxyOpen ? "hsla(315,40%,15%,0.7)" : "hsla(315,30%,12%,0.6)",
                    color: proxyOpen ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                    border: proxyOpen ? "1px solid hsla(315,70%,55%,0.35)" : "1px solid hsla(315,25%,30%,0.2)",
                    boxShadow: proxyOpen ? "0 0 10px hsla(315,80%,50%,0.2)" : "none",
                  }}
                >
                  {proxyOpen ? <><X size={12} /> Close</> : <><Plus size={12} /> Add</>}
                </button>
              </div>
            </div>

            {/* Proxy input panel */}
            <div style={{ maxHeight: proxyOpen ? "320px" : "0px", opacity: proxyOpen ? 1 : 0, overflow: "hidden", transition: "max-height 0.38s cubic-bezier(0.32,0.72,0,1), opacity 0.25s ease" }}>
              <div className="flex flex-col gap-2 pt-1">
                <textarea
                  value={proxyInput}
                  onChange={(e) => setProxyInput(e.target.value)}
                  placeholder={"ip:port\nip:port:user:pass\n192.168.1.1:8080:admin:secret"}
                  rows={4}
                  className="glass-input rounded-xl px-4 py-3 text-sm font-mono w-full resize-none"
                  style={{ color: "hsl(var(--foreground))", lineHeight: 1.7 }}
                />
                <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.65 }}>
                  One proxy per line · format: <span className="font-mono">ip:port</span> or <span className="font-mono">ip:port:user:pass</span>
                </p>
                <button
                  type="button"
                  disabled={!proxyInput.trim()}
                  onClick={addProxies}
                  className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(135deg, hsl(315,95%,40%), hsl(315,85%,50%))",
                    color: "hsl(var(--primary-foreground))",
                    border: "1px solid hsla(315,80%,60%,0.3)",
                    boxShadow: proxyInput.trim() ? "0 2px 14px hsla(315,90%,50%,0.35)" : "none",
                  }}
                >
                  <Plus size={12} /> Add {proxyInput.trim().split("\n").filter((l) => l.trim()).length || ""} Prox{proxyInput.trim().split("\n").filter((l) => l.trim()).length === 1 ? "y" : "ies"}
                </button>
              </div>
            </div>

            {/* Proxy list */}
            {proxies.length > 0 && !proxyOpen && (
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  border: proxyEnabled ? "1px solid hsla(142,60%,40%,0.3)" : "1px solid hsla(315,30%,25%,0.2)",
                  background: proxyEnabled ? "hsla(142,55%,10%,0.2)" : "hsla(330,15%,8%,0.3)",
                  boxShadow: proxyEnabled ? "0 0 16px hsla(142,55%,25%,0.12)" : "none",
                  transition: "border 0.3s, box-shadow 0.3s",
                }}
              >
                <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: proxyEnabled ? "hsla(142,50%,35%,0.2)" : "hsla(315,25%,25%,0.15)" }}>
                  <Shield size={12} style={{ color: proxyEnabled ? "hsl(142,70%,55%)" : "hsl(var(--muted-foreground))", filter: proxyEnabled ? "drop-shadow(0 0 4px hsla(142,70%,50%,0.5))" : "none" }} />
                  <span className="text-xs font-semibold" style={{ color: proxyEnabled ? "hsl(142,65%,58%)" : "hsl(var(--muted-foreground))" }}>
                    {proxyEnabled ? `Rotating ${proxies.length} prox${proxies.length === 1 ? "y" : "ies"}` : `${proxies.length} prox${proxies.length === 1 ? "y" : "ies"} (disabled)`}
                  </span>
                  <button type="button" onClick={() => { setProxies([]); setProxyEnabled(false); proxyIndexRef.current = 0; }} className="ml-auto text-xs transition-opacity hover:opacity-70" style={{ color: "hsl(var(--muted-foreground))" }}>
                    Clear all
                  </button>
                </div>
                <div style={{ maxHeight: 120, overflowY: "auto" }}>
                  {proxies.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 border-b last:border-0" style={{ borderColor: "hsla(315,20%,20%,0.12)" }}>
                      <span className="text-xs font-mono shrink-0 w-5 text-right" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.5 }}>{i + 1}</span>
                      <span className="text-xs font-mono flex-1 truncate" style={{ color: "hsl(var(--foreground))", opacity: 0.85 }}>{p}</span>
                      <button type="button" onClick={() => removeProxy(i)} className="shrink-0 transition-opacity hover:opacity-70" style={{ color: "hsl(var(--muted-foreground))" }}><X size={11} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Input mode tabs ── */}
          <div className="flex gap-2">
            {(["paste", "file"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setInputMode(mode)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200"
                style={{
                  background: inputMode === mode ? "linear-gradient(135deg, hsl(315,95%,40%), hsl(315,85%,50%))" : "hsla(330,20%,8%,0.7)",
                  color: inputMode === mode ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                  border: inputMode === mode ? "1px solid hsla(315,80%,60%,0.4)" : "1px solid hsla(315,25%,25%,0.2)",
                  boxShadow: inputMode === mode ? "0 0 20px hsla(315,90%,50%,0.3)" : "none",
                }}
              >
                {mode === "paste" ? <ClipboardList size={13} /> : <Upload size={13} />}
                {mode === "paste" ? "Paste List" : "Upload File"}
              </button>
            ))}
          </div>

          {/* Paste textarea */}
          {inputMode === "paste" && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
                Card List
                <span className="ml-2 normal-case font-normal opacity-70"> format: card|expiry|cvv (one per line)</span>
              </label>
              <textarea
                value={pasteText}
                onChange={(e) => handlePasteChange(e.target.value)}
                placeholder={`4111111111111111|12/26|123\n5500005555555559|09/25|456\n378282246310005|11/27|789`}
                rows={7}
                className="glass-input rounded-xl px-4 py-3 text-sm font-mono w-full resize-none"
                style={{ color: "hsl(var(--foreground))", lineHeight: 1.7 }}
              />
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.7 }}>
                {cards.length} card{cards.length !== 1 ? "s" : ""} detected
              </p>
            </div>
          )}

          {/* File drop zone */}
          {inputMode === "file" && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 rounded-xl p-8 cursor-pointer transition-all duration-300"
              style={{
                background: isDragging ? "hsla(315,60%,20%,0.3)" : "hsla(330,20%,6%,0.5)",
                border: isDragging ? "2px dashed hsl(315,95%,55%)" : "2px dashed hsla(315,35%,40%,0.3)",
                boxShadow: isDragging ? "0 0 30px hsla(315,90%,50%,0.2)" : "none",
              }}
            >
              <div className="rounded-full p-3" style={{ background: "hsla(315,80%,40%,0.15)" }}>
                <FileText size={24} style={{ color: "hsl(var(--primary))", filter: "drop-shadow(0 0 6px hsla(315,90%,60%,0.5))" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>Drop a .txt or .csv file here</p>
                <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>or click to browse</p>
              </div>
              {cards.length > 0 && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "hsla(315,80%,40%,0.2)", color: "hsl(315,95%,70%)", border: "1px solid hsla(315,80%,55%,0.3)" }}>
                  {cards.length} cards loaded
                </span>
              )}
              <input ref={fileRef} type="file" accept=".txt,.csv" className="hidden" onChange={handleFileInput} />
            </div>
          )}

          {/* ── Run / Clear buttons ── */}
          <div className="flex gap-3 pt-1">
            <div className="relative flex-1">
              <SparklesBurst active={isDone && (stats.approved + stats.charged) > 0} />
              <button
                type="button"
                onClick={isRunning ? handleStop : handleRun}
                disabled={!gateway || validCount === 0}
                className="btn-shimmer w-full flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold tracking-wide transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: isRunning
                    ? "linear-gradient(135deg, hsl(0,75%,40%), hsl(0,70%,50%))"
                    : "linear-gradient(135deg, hsl(315,95%,45%), hsl(315,90%,55%))",
                  color: "hsl(var(--primary-foreground))",
                  boxShadow: isRunning
                    ? "0 4px 24px hsla(0,75%,50%,0.4)"
                    : "0 4px 24px hsla(315,90%,50%,0.45), 0 0 60px hsla(315,80%,45%,0.15)",
                  border: isRunning ? "1px solid hsla(0,75%,60%,0.3)" : "1px solid hsla(315,80%,60%,0.3)",
                  animation: !isRunning && gateway && validCount > 0 ? "pulse-glow 3s ease-in-out infinite" : "none",
                }}
              >
                {isRunning
                  ? <><Loader2 size={15} className="animate-spin" /> Stop</>
                  : <><Play size={15} /> Run {validCount > 0 ? `${validCount} Valid` : "Mass"} Check</>}
              </button>
            </div>
            {cards.length > 0 && !isRunning && (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
                style={{ background: "hsla(330,20%,8%,0.7)", color: "hsl(var(--muted-foreground))", border: "1px solid hsla(315,25%,25%,0.2)" }}
              >
                <Trash2 size={14} /> Clear
              </button>
            )}
          </div>

        </div>
      </div>

      {/* ── 500 card limit warning ── */}
      {truncatedCount > 0 && !isRunning && (
        <div
          className="animate-card-entrance rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ animationDelay: "60ms", animationFillMode: "both", background: "hsla(44,80%,30%,0.2)", border: "1px solid hsla(44,80%,55%,0.3)" }}
        >
          <Shield size={15} style={{ color: "hsl(48,100%,65%)", flexShrink: 0 }} />
          <p className="text-xs font-semibold" style={{ color: "hsl(48,100%,68%)" }}>
            Limit: <span className="font-black">500 cards</span> per check. {truncatedCount} extra card{truncatedCount !== 1 ? "s were" : " was"} ignored.
          </p>
        </div>
      )}

      {/* ── Luhn warning ── */}
      {cards.length > 0 && invalidCount > 0 && !isRunning && (
        <div
          className="animate-card-entrance rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ animationDelay: "80ms", animationFillMode: "both", background: "hsla(0,65%,20%,0.25)", border: "1px solid hsla(0,75%,55%,0.3)" }}
        >
          <XCircle size={15} style={{ color: "hsl(0,75%,60%)", flexShrink: 0 }} />
          <p className="text-xs font-semibold" style={{ color: "hsl(0,75%,65%)" }}>
            <span className="font-black">{invalidCount}</span> card{invalidCount !== 1 ? "s" : ""} failed Luhn validation and will be skipped.
            {validCount === 0 && " No valid cards to check."}
          </p>
        </div>
      )}

      {/* ── Stats + Progress card ── */}
      {cards.length > 0 && (
        <div
          className="glass-card animate-card-entrance rounded-2xl overflow-hidden"
          style={{ animationDelay: "100ms", animationFillMode: "both" }}
        >
          {/* Card header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "hsla(315,30%,25%,0.2)" }}>
            <div className="rounded-xl p-2" style={{ background: "hsla(315,80%,40%,0.15)" }}>
              <Zap size={15} style={{ color: "hsl(var(--primary))", filter: "drop-shadow(0 0 5px hsla(315,90%,60%,0.55))" }} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
              Live Stats
            </p>
            {isRunning && (
              <span className="ml-auto flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "hsl(var(--primary))" }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "hsl(var(--primary))" }} />
                </span>
                <span className="text-xs font-medium" style={{ color: "hsl(var(--primary))" }}>Running on backend</span>
              </span>
            )}
          </div>

          <div className="p-5 flex flex-col gap-4">
            {/* Stat row */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Total",    value: stats.total,    color: "hsl(var(--foreground))",  bg: "hsla(330,18%,6%,0.7)",       border: "hsla(315,30%,25%,0.2)" },
                { label: "Approved", value: stats.approved, color: "hsl(142,70%,55%)",        bg: "hsla(142,60%,10%,0.5)",       border: "hsla(142,60%,35%,0.25)" },
                { label: "Charged",  value: stats.charged,  color: "hsl(315,95%,65%)",        bg: "hsla(315,80%,15%,0.45)",      border: "hsla(315,70%,45%,0.25)" },
                { label: "Declined", value: stats.declined, color: "hsl(0,75%,60%)",          bg: "hsla(0,65%,12%,0.45)",        border: "hsla(0,65%,40%,0.25)" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col items-center rounded-xl py-3 px-2 transition-all duration-300"
                  style={{ background: s.bg, border: `1px solid ${s.border}` }}
                >
                  <span className="text-xl font-black tabular-nums" style={{ color: s.color, fontFamily: "'Space Grotesk', sans-serif", textShadow: `0 0 12px ${s.color}55` }}>
                    {s.value}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {(isRunning || progress > 0) && (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>Progress</span>
                  <span className="text-xs font-bold" style={{ color: "hsl(var(--primary))" }}>{progress}%</span>
                </div>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: "hsla(315,40%,20%,0.3)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      background: "linear-gradient(90deg, hsl(315,95%,45%), hsl(315,90%,65%))",
                      boxShadow: "0 0 12px hsla(315,90%,55%,0.6)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Results card ── */}
      {cards.length > 0 && (
        <div
          className="glass-card animate-card-entrance rounded-2xl overflow-hidden"
          style={{ animationDelay: "140ms", animationFillMode: "both" }}
        >
          {/* Card header */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b" style={{ borderColor: "hsla(315,30%,25%,0.2)" }}>
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2" style={{ background: "hsla(315,80%,40%,0.15)" }}>
                <CreditCard size={15} style={{ color: "hsl(var(--primary))", filter: "drop-shadow(0 0 5px hsla(315,90%,60%,0.55))" }} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
                Results — {cards.length} card{cards.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Export buttons */}
            {isDone && (
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-xs font-semibold" style={{ color: "hsl(142,70%,55%)" }}>
                  {approvedAndCharged.length} approved/charged
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyResults}
                    disabled={approvedAndCharged.length === 0}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{
                      background: copied ? "hsla(142,60%,20%,0.5)" : "hsla(142,50%,15%,0.5)",
                      color: copied ? "hsl(142,70%,65%)" : "hsl(142,70%,60%)",
                      border: copied ? "1px solid hsla(142,60%,50%,0.5)" : "1px solid hsla(142,60%,40%,0.35)",
                      boxShadow: copied ? "0 0 14px hsla(142,60%,40%,0.35)" : "0 0 8px hsla(142,60%,30%,0.2)",
                    }}
                    title="Copy approved & charged cards"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={handleDownloadResults}
                    disabled={approvedAndCharged.length === 0}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{
                      background: approvedAndCharged.length > 0 ? "linear-gradient(135deg, hsl(142,65%,32%), hsl(142,60%,42%))" : "hsla(142,40%,15%,0.4)",
                      color: "hsl(var(--primary-foreground))",
                      border: "1px solid hsla(142,65%,50%,0.4)",
                      boxShadow: approvedAndCharged.length > 0 ? "0 2px 14px hsla(142,65%,40%,0.4)" : "none",
                    }}
                    title="Download as .txt"
                  >
                    <Download size={12} /> .txt
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Results list */}
          <div className="flex flex-col divide-y" style={{ maxHeight: 420, overflowY: "auto", borderColor: "hsla(315,20%,15%,0.3)" }}>
            {cards.map((c, i) => {
              const cfg = STATUS_CONFIG[c.status];
              const isInvalid = !c.luhnValid;
              const staggerDelay = Math.min(i, 20) * 40;
              const isDone = ["approved", "charged", "declined"].includes(c.status);

              // Parse JSON response message to extract Price and Response
              let parsedPrice: string | null = null;
              let parsedResponse: string | null = null;
              if (c.responseMessage) {
                try {
                  const json = JSON.parse(c.responseMessage);
                  if (json.Price) parsedPrice = json.Price;
                  if (json.Response) parsedResponse = json.Response;
                } catch {
                  // Not JSON, use as-is
                  parsedResponse = c.responseMessage;
                }
              }

              const statusColor = c.status === "declined" ? "hsl(0,75%,60%)" : c.status === "charged" ? "hsl(315,95%,65%)" : c.status === "approved" ? "hsl(142,70%,55%)" : "hsl(var(--muted-foreground))";

              return (
                <div
                  key={i}
                  className="flex flex-col gap-2 px-5 py-3.5 transition-all duration-300"
                  style={{
                    background: isInvalid ? "hsla(0,60%,15%,0.35)" : c.status !== "pending" ? cfg.bg : "transparent",
                    borderLeft: isInvalid ? "3px solid hsla(0,75%,55%,0.7)" : c.status === "approved" ? "3px solid hsla(142,70%,50%,0.6)" : c.status === "charged" ? "3px solid hsla(315,90%,60%,0.6)" : "3px solid transparent",
                    animation: `card-entrance 0.45s cubic-bezier(0.34,1.56,0.64,1) ${staggerDelay}ms both`,
                    borderColor: "hsla(315,20%,15%,0.3)",
                  }}
                >
                  {/* Top row: icon + card + badge */}
                  <div className="flex items-center gap-3">
                    {/* Status icon */}
                    <div
                      className="shrink-0 rounded-lg p-1.5"
                      style={{
                        background: isInvalid ? "hsla(0,65%,20%,0.3)" : c.status === "pending" ? "hsla(315,30%,15%,0.3)" : cfg.bg,
                      }}
                    >
                      {isInvalid        && <XCircle    size={14} style={{ color: "hsl(0,75%,60%)",    filter: "drop-shadow(0 0 4px hsla(0,75%,55%,0.5))" }} />}
                      {!isInvalid && c.status === "checking"  && <Loader2    size={14} className="animate-spin" style={{ color: "hsl(315,95%,65%)" }} />}
                      {!isInvalid && c.status === "approved"  && <CheckCircle2 size={14} style={{ color: "hsl(142,70%,55%)", filter: "drop-shadow(0 0 4px hsla(142,70%,55%,0.6))" }} />}
                      {!isInvalid && c.status === "charged"   && <CreditCard  size={14} style={{ color: "hsl(315,95%,65%)", filter: "drop-shadow(0 0 4px hsla(315,90%,60%,0.6))" }} />}
                      {!isInvalid && c.status === "declined"  && <XCircle    size={14} style={{ color: "hsl(0,75%,60%)",    filter: "drop-shadow(0 0 4px hsla(0,75%,55%,0.6))" }} />}
                      {!isInvalid && c.status === "pending"   && <div className="w-3.5 h-3.5 rounded-full" style={{ background: "hsla(315,30%,30%,0.4)", border: "1px solid hsla(315,30%,40%,0.3)" }} />}
                    </div>

                    {/* Card info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono font-medium truncate" style={{ color: isInvalid ? "hsl(0,75%,65%)" : "hsl(var(--foreground))" }}>
                        {maskCard(c.card)}
                      </p>
                      <p className="text-xs font-mono" style={{ color: "hsl(var(--muted-foreground))" }}>
                        {c.expiry && <>{c.expiry} · {c.cvv ? "CVV ✓" : "No CVV"}</>}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span
                      className="shrink-0 text-xs font-black uppercase px-2.5 py-1 rounded-full"
                      style={{
                        color: isInvalid ? "hsl(0,75%,65%)" : cfg.color,
                        background: isInvalid ? "hsla(0,65%,20%,0.4)" : cfg.bg,
                        border: `1px solid ${isInvalid ? "hsla(0,75%,55%,0.4)" : `${cfg.color}44`}`,
                        letterSpacing: "0.08em",
                      }}
                    >
                      {isInvalid ? "Invalid" : cfg.label}
                    </span>
                  </div>

                  {/* Response row — styled 3D card */}
                  {isDone && !isInvalid && (parsedPrice || parsedResponse) && (
                    <div
                      className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 ml-8"
                      style={{
                        background: `linear-gradient(135deg, ${c.status === "declined" ? "hsla(0,50%,12%,0.6)" : c.status === "charged" ? "hsla(315,50%,15%,0.5)" : "hsla(142,50%,12%,0.5)"}, ${c.status === "declined" ? "hsla(0,40%,8%,0.7)" : c.status === "charged" ? "hsla(315,40%,10%,0.6)" : "hsla(142,40%,8%,0.6)"})`,
                        border: `1px solid ${c.status === "declined" ? "hsla(0,60%,35%,0.35)" : c.status === "charged" ? "hsla(315,60%,45%,0.35)" : "hsla(142,55%,40%,0.35)"}`,
                        boxShadow: `0 4px 16px ${c.status === "declined" ? "hsla(0,60%,20%,0.3)" : c.status === "charged" ? "hsla(315,60%,30%,0.3)" : "hsla(142,55%,25%,0.3)"}, inset 0 1px 0 ${c.status === "declined" ? "hsla(0,50%,50%,0.1)" : c.status === "charged" ? "hsla(315,50%,60%,0.1)" : "hsla(142,50%,55%,0.1)"}`,
                        transform: "perspective(600px) rotateX(1deg)",
                        animation: `card-entrance 0.5s cubic-bezier(0.34,1.56,0.64,1) ${staggerDelay + 200}ms both`,
                      }}
                    >
                      {/* Amount */}
                      {parsedPrice && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
                            Amount
                          </span>
                          <span
                            className="text-sm font-black tabular-nums"
                            style={{
                              fontFamily: "'Space Grotesk', sans-serif",
                              color: statusColor,
                              textShadow: `0 0 10px ${statusColor}55`,
                            }}
                          >
                            ${parsedPrice}
                          </span>
                        </div>
                      )}

                      {parsedPrice && parsedResponse && (
                        <span style={{ color: "hsl(var(--muted-foreground))", opacity: 0.4 }}>—</span>
                      )}

                      {/* Response code */}
                      {parsedResponse && (
                        <span
                          className="text-xs font-bold uppercase tracking-wide"
                          style={{
                            color: statusColor,
                            textShadow: `0 0 8px ${statusColor}44`,
                          }}
                        >
                          {parsedResponse}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

export default CheckerPage;
