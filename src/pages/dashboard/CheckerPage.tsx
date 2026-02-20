import { useState, useRef, useCallback } from "react";
import { Upload, Play, Loader2, CheckCircle2, XCircle, CreditCard, Trash2, FileText, ClipboardList } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CardResult = {
  raw: string;
  card: string;
  expiry: string;
  cvv: string;
  status: "pending" | "checking" | "charged" | "approved" | "declined";
};

const parseCardLine = (line: string): { card: string; expiry: string; cvv: string } => {
  const clean = line.trim();
  // Support formats: 4111111111111111|12/26|123 or 4111|12/26|123 or 4111:12/26:123
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

const simulateResult = (card: string, gateway: string): CardResult["status"] => {
  const digits = card.replace(/\D/g, "");
  const last = parseInt(digits[digits.length - 1] || "0", 10);
  if (gateway === "stripe-charge") return "charged";
  return last % 2 === 0 ? "approved" : "declined";
};

const STATUS_CONFIG = {
  pending:  { label: "Pending",  color: "hsl(var(--muted-foreground))", bg: "hsla(330,15%,15%,0.5)", icon: null },
  checking: { label: "Checking…", color: "hsl(315,95%,65%)", bg: "hsla(315,80%,30%,0.2)", icon: null },
  charged:  { label: "Charged",  color: "hsl(315,95%,70%)", bg: "hsla(315,80%,30%,0.2)", icon: "charge" },
  approved: { label: "Approved", color: "hsl(142,70%,55%)", bg: "hsla(142,60%,20%,0.25)", icon: "check" },
  declined: { label: "Declined", color: "hsl(0,75%,60%)",   bg: "hsla(0,65%,20%,0.25)",  icon: "x" },
};

const CheckerPage = () => {
  const [gateway, setGateway] = useState("");
  const [inputMode, setInputMode] = useState<"paste" | "file">("paste");
  const [pasteText, setPasteText] = useState("");
  const [cards, setCards] = useState<CardResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  const parseLines = (text: string): CardResult[] =>
    text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 8)
      .map((l) => {
        const { card, expiry, cvv } = parseCardLine(l);
        return { raw: l, card, expiry, cvv, status: "pending" as const };
      });

  const loadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
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
    setPasteText(text);
    setCards(parseLines(text));
  };

  const handleRun = async () => {
    if (!gateway || cards.length === 0) return;
    abortRef.current = false;
    setIsRunning(true);

  const updated: CardResult[] = cards.map((c) => ({ ...c, status: "pending" as CardResult["status"] }));
    setCards([...updated]);

    for (let i = 0; i < updated.length; i++) {
      if (abortRef.current) break;
      updated[i] = { ...updated[i], status: "checking" as CardResult["status"] };
      setCards([...updated]);

      await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));

      if (abortRef.current) break;
      updated[i] = {
        ...updated[i],
        status: simulateResult(updated[i].card, gateway) as CardResult["status"],
      };
      setCards([...updated]);
    }

    setIsRunning(false);
  };

  const handleStop = () => {
    abortRef.current = true;
    setIsRunning(false);
  };

  const handleClear = () => {
    setCards([]);
    setPasteText("");
  };

  const stats = {
    total: cards.length,
    approved: cards.filter((c) => c.status === "approved").length,
    charged: cards.filter((c) => c.status === "charged").length,
    declined: cards.filter((c) => c.status === "declined").length,
    pending: cards.filter((c) => c.status === "pending" || c.status === "checking").length,
  };

  const progress = cards.length
    ? Math.round(
        (cards.filter((c) => ["approved", "charged", "declined"].includes(c.status)).length /
          cards.length) *
          100
      )
    : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
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
          Mass card checker — paste a list or upload a file, then run.
        </p>
      </div>

      {/* Config Panel */}
      <div
        className="glass-card animate-card-entrance rounded-2xl p-6 flex flex-col gap-5"
        style={{ animationDelay: "60ms", animationFillMode: "both" }}
      >
        {/* Gateway */}
        <div className="flex flex-col gap-2">
          <label
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Select Gateway
          </label>
          <Select value={gateway} onValueChange={setGateway}>
            <SelectTrigger
              className="rounded-xl border-0 h-12 px-4 text-sm font-medium focus:ring-0 focus:ring-offset-0"
              style={{
                background: "hsla(330, 20%, 6%, 0.85)",
                border: "1px solid hsla(315, 35%, 35%, 0.22)",
                color: gateway ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
              }}
            >
              <SelectValue placeholder="Choose a gateway…" />
            </SelectTrigger>
            <SelectContent
              style={{
                background: "hsl(330, 15%, 6%)",
                border: "1px solid hsla(315, 50%, 40%, 0.3)",
                backdropFilter: "blur(20px)",
                zIndex: 100,
              }}
            >
              <SelectItem value="stripe-charge" style={{ color: "hsl(var(--foreground))" }}>
                💳 Stripe Charge
              </SelectItem>
              <SelectItem value="stripe-auth" style={{ color: "hsl(var(--foreground))" }}>
                🔐 Stripe Auth
              </SelectItem>
              <SelectItem value="shopify" style={{ color: "hsl(var(--foreground))" }}>
                🛍️ Shopify
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2">
          {(["paste", "file"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setInputMode(mode)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background:
                  inputMode === mode
                    ? "linear-gradient(135deg, hsl(315,95%,40%), hsl(315,85%,50%))"
                    : "hsla(330, 20%, 8%, 0.7)",
                color:
                  inputMode === mode
                    ? "hsl(var(--primary-foreground))"
                    : "hsl(var(--muted-foreground))",
                border:
                  inputMode === mode
                    ? "1px solid hsla(315,80%,60%,0.4)"
                    : "1px solid hsla(315,25%,25%,0.2)",
                boxShadow:
                  inputMode === mode
                    ? "0 0 20px hsla(315,90%,50%,0.3)"
                    : "none",
              }}
            >
              {mode === "paste" ? <ClipboardList size={14} /> : <Upload size={14} />}
              {mode === "paste" ? "Paste List" : "Upload File"}
            </button>
          ))}
        </div>

        {/* Paste input */}
        {inputMode === "paste" && (
          <div className="flex flex-col gap-2">
            <label
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              Card List
              <span className="ml-2 normal-case font-normal" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.7 }}>
                format: card|expiry|cvv (one per line)
              </span>
            </label>
            <textarea
              value={pasteText}
              onChange={(e) => handlePasteChange(e.target.value)}
              placeholder={`4111111111111111|12/26|123\n5500005555555559|09/25|456\n378282246310005|11/27|789`}
              rows={7}
              className="glass-input rounded-xl px-4 py-3 text-sm font-mono w-full resize-none"
              style={{
                color: "hsl(var(--foreground))",
                lineHeight: 1.7,
              }}
            />
            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.7 }}>
              {cards.length} card{cards.length !== 1 ? "s" : ""} detected
            </p>
          </div>
        )}

        {/* File upload drop zone */}
        {inputMode === "file" && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 rounded-xl p-8 cursor-pointer transition-all duration-300"
            style={{
              background: isDragging
                ? "hsla(315, 60%, 20%, 0.3)"
                : "hsla(330, 20%, 6%, 0.5)",
              border: isDragging
                ? "2px dashed hsl(315, 95%, 55%)"
                : "2px dashed hsla(315, 35%, 40%, 0.3)",
              boxShadow: isDragging
                ? "0 0 30px hsla(315,90%,50%,0.2)"
                : "none",
            }}
          >
            <div
              className="rounded-full p-3"
              style={{ background: "hsla(315, 80%, 40%, 0.15)" }}
            >
              <FileText
                size={24}
                style={{ color: "hsl(var(--primary))", filter: "drop-shadow(0 0 6px hsla(315,90%,60%,0.5))" }}
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                Drop a .txt or .csv file here
              </p>
              <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                or click to browse
              </p>
            </div>
            {cards.length > 0 && (
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{
                  background: "hsla(315,80%,40%,0.2)",
                  color: "hsl(315,95%,70%)",
                  border: "1px solid hsla(315,80%,55%,0.3)",
                }}
              >
                {cards.length} cards loaded
              </span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.csv"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={isRunning ? handleStop : handleRun}
            disabled={!gateway || cards.length === 0}
            className="btn-shimmer flex-1 flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              background: isRunning
                ? "linear-gradient(135deg, hsl(0,75%,40%), hsl(0,70%,50%))"
                : "linear-gradient(135deg, hsl(315,95%,45%), hsl(315,90%,55%))",
              color: "hsl(var(--primary-foreground))",
              boxShadow: isRunning
                ? "0 4px 24px hsla(0,75%,50%,0.4)"
                : "0 4px 24px hsla(315,90%,50%,0.45), 0 0 60px hsla(315,80%,45%,0.15)",
              border: isRunning
                ? "1px solid hsla(0,75%,60%,0.3)"
                : "1px solid hsla(315,80%,60%,0.3)",
            }}
          >
            {isRunning ? (
              <><Loader2 size={15} className="animate-spin" /> Stop</>
            ) : (
              <><Play size={15} /> Run Mass Check</>
            )}
          </button>

          {cards.length > 0 && !isRunning && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: "hsla(330,20%,8%,0.7)",
                color: "hsl(var(--muted-foreground))",
                border: "1px solid hsla(315,25%,25%,0.2)",
              }}
            >
              <Trash2 size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Progress + Stats (shown when cards loaded) */}
      {cards.length > 0 && (
        <div
          className="glass-card animate-card-entrance rounded-2xl p-5 flex flex-col gap-4"
          style={{ animationDelay: "100ms", animationFillMode: "both" }}
        >
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total", value: stats.total, color: "hsl(var(--foreground))" },
              { label: "Approved", value: stats.approved, color: "hsl(142,70%,55%)" },
              { label: "Charged", value: stats.charged, color: "hsl(315,95%,65%)" },
              { label: "Declined", value: stats.declined, color: "hsl(0,75%,60%)" },
            ].map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center rounded-xl py-3 px-2"
                style={{ background: "hsla(330,18%,6%,0.7)", border: "1px solid hsla(315,30%,25%,0.2)" }}
              >
                <span className="text-xl font-black" style={{ color: s.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {s.value}
                </span>
                <span className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {isRunning || progress > 0 ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Progress
                </span>
                <span className="text-xs font-bold" style={{ color: "hsl(var(--primary))" }}>
                  {progress}%
                </span>
              </div>
              <div
                className="w-full rounded-full overflow-hidden"
                style={{ height: 6, background: "hsla(315,40%,20%,0.3)" }}
              >
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
          ) : null}
        </div>
      )}

      {/* Results list */}
      {cards.length > 0 && (
        <div
          className="glass-card animate-card-entrance rounded-2xl overflow-hidden"
          style={{ animationDelay: "140ms", animationFillMode: "both" }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: "hsla(315,30%,25%,0.2)" }}>
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
              Results — {cards.length} card{cards.length !== 1 ? "s" : ""}
            </h2>
          </div>

          <div className="flex flex-col divide-y" style={{ maxHeight: 420, overflowY: "auto" }}>
            {cards.map((c, i) => {
              const cfg = STATUS_CONFIG[c.status];
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 px-5 py-3 transition-all duration-300"
                  style={{ background: c.status !== "pending" ? cfg.bg : "transparent" }}
                >
                  {/* Icon */}
                  <div className="shrink-0">
                    {c.status === "checking" && (
                      <Loader2 size={16} className="animate-spin" style={{ color: "hsl(315,95%,65%)" }} />
                    )}
                    {c.status === "approved" && (
                      <CheckCircle2 size={16} style={{ color: "hsl(142,70%,55%)", filter: "drop-shadow(0 0 4px hsla(142,70%,55%,0.6))" }} />
                    )}
                    {c.status === "charged" && (
                      <CreditCard size={16} style={{ color: "hsl(315,95%,65%)", filter: "drop-shadow(0 0 4px hsla(315,90%,60%,0.6))" }} />
                    )}
                    {c.status === "declined" && (
                      <XCircle size={16} style={{ color: "hsl(0,75%,60%)", filter: "drop-shadow(0 0 4px hsla(0,75%,55%,0.6))" }} />
                    )}
                    {c.status === "pending" && (
                      <div className="w-4 h-4 rounded-full" style={{ background: "hsla(315,30%,30%,0.4)", border: "1px solid hsla(315,30%,40%,0.3)" }} />
                    )}
                  </div>

                  {/* Card info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>
                      {maskCard(c.card)}
                    </p>
                    {c.expiry && (
                      <p className="text-xs font-mono" style={{ color: "hsl(var(--muted-foreground))" }}>
                        {c.expiry} · {c.cvv ? "CVV ✓" : "No CVV"}
                      </p>
                    )}
                  </div>

                  {/* Status badge */}
                  <span
                    className="shrink-0 text-xs font-black uppercase px-2.5 py-1 rounded-full"
                    style={{
                      color: cfg.color,
                      background: cfg.bg,
                      border: `1px solid ${cfg.color}44`,
                      letterSpacing: "0.08em",
                    }}
                  >
                    {cfg.label}
                  </span>
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
