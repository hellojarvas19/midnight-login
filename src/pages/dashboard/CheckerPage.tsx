import { useState } from "react";
import { Search } from "lucide-react";

const CheckerPage = () => {
  const [address, setAddress] = useState("");

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div
        className="animate-card-entrance"
        style={{ animationDelay: "0ms", animationFillMode: "both" }}
      >
        <h1
          className="text-3xl font-extrabold tracking-tight text-glow"
          style={{ color: "hsl(var(--foreground))" }}
        >
          <span style={{ color: "hsl(var(--primary))" }}>Checker</span>
        </h1>
        <p className="mt-1 text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          Enter a wallet address or contract to begin analysis.
        </p>
      </div>

      {/* Input panel */}
      <div
        className="glass-card animate-card-entrance rounded-2xl p-6 flex flex-col gap-4"
        style={{ animationDelay: "60ms", animationFillMode: "both" }}
      >
        <label
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          Address / Contract
        </label>

        <div className="flex gap-3">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            className="glass-input flex-1 rounded-xl px-4 py-3 text-sm font-mono"
            style={{ color: "hsl(var(--foreground))" }}
          />
          <button
            type="button"
            className="btn-shimmer flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, hsl(315,95%,45%), hsl(315,90%,55%))",
              color: "hsl(var(--primary-foreground))",
              boxShadow:
                "0 4px 24px hsla(315,90%,50%,0.45), 0 0 60px hsla(315,80%,45%,0.15)",
              border: "1px solid hsla(315,80%,60%,0.3)",
              whiteSpace: "nowrap",
            }}
          >
            <Search size={16} />
            Run Check
          </button>
        </div>
      </div>

      {/* Results panel */}
      <div
        className="glass-card animate-card-entrance rounded-2xl p-6"
        style={{ animationDelay: "120ms", animationFillMode: "both" }}
      >
        <h2
          className="text-xs font-semibold uppercase tracking-wider mb-4"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          Results
        </h2>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div
            className="rounded-full p-4"
            style={{ background: "hsla(315, 80%, 45%, 0.12)" }}
          >
            <Search
              size={28}
              style={{
                color: "hsl(var(--primary))",
                filter: "drop-shadow(0 0 8px hsla(315,90%,60%,0.6))",
              }}
            />
          </div>
          <p
            className="text-sm font-medium"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Enter an address to begin.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckerPage;
