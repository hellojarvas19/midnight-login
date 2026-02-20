import { Home, CreditCard, ChevronLeft, ChevronRight, Crown } from "lucide-react";
import { LogoMark } from "@/components/LogoMark";
import logoCharacter from "@/assets/logo-character.jpg";

type Section = "home" | "checker" | "profile";

interface AppSidebarProps {
  active: Section;
  onNavigate: (section: Section) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const NAV_ITEMS: { id: Section; label: string; Icon: typeof Home }[] = [
  { id: "home",    label: "Home",    Icon: Home        },
  { id: "checker", label: "Checker", Icon: CreditCard  },
  { id: "profile", label: "Profile", Icon: Crown       },
];

const AppSidebar = ({ active, onNavigate, collapsed, onToggleCollapse }: AppSidebarProps) => {
  return (
    <aside
      className="relative flex flex-col h-full glass-card rounded-2xl overflow-visible"
      style={{
        width: collapsed ? 64 : 220,
        minWidth: collapsed ? 64 : 220,
        transition: "width 0.3s cubic-bezier(0.4,0,0.2,1), min-width 0.3s cubic-bezier(0.4,0,0.2,1)",
        flexShrink: 0,
        borderRadius: 18,
      }}
    >
      {/* Logo section */}
      <div
        className="flex flex-col items-center pt-6 pb-4"
        style={{ overflow: "hidden" }}
      >
        {/* Scaled-down LogoMark wrapper */}
        <div style={{ transform: "scale(0.48)", transformOrigin: "top center", height: 52, marginBottom: 2 }}>
          <LogoMark />
        </div>

        {!collapsed && (
          <div className="flex items-center gap-2 mt-1">
            {/* Mini avatar */}
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                padding: 2,
                flexShrink: 0,
                background: "linear-gradient(135deg, hsl(48,100%,68%) 0%, hsl(42,100%,50%) 40%, hsl(52,100%,76%) 70%, hsl(36,90%,42%) 100%)",
                boxShadow: "0 0 8px 2px hsla(44,100%,55%,0.55)",
                animation: "avatar-ring-breathe 2.8s ease-in-out infinite",
              }}
            >
              <img
                src={logoCharacter}
                alt="0xAdam avatar"
                style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", display: "block" }}
              />
            </div>

            {/* Gold shimmer name */}
            <p
              className="text-xs font-bold tracking-widest uppercase"
              style={{
                whiteSpace: "nowrap",
                opacity: 1,
                transition: "opacity 0.2s ease",
                background: "linear-gradient(90deg, hsl(42,100%,52%) 0%, hsl(52,100%,78%) 30%, hsl(45,100%,65%) 50%, hsl(36,90%,45%) 70%, hsl(48,100%,70%) 85%, hsl(42,100%,52%) 100%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "gold-shimmer 2.8s linear infinite",
                filter: "drop-shadow(0 0 6px hsla(44,100%,58%,0.5))",
              }}
            >
              0xAdam
            </p>
          </div>
        )}
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          margin: "0 12px 8px",
          background: "linear-gradient(90deg, transparent 0%, hsl(42,100%,52%) 25%, hsl(52,100%,78%) 50%, hsl(42,100%,52%) 75%, transparent 100%)",
          boxShadow: "0 0 8px 1px hsla(44,100%,58%,0.45)",
        }}
      />

      {/* Nav items */}
      <nav className="flex flex-col gap-1 px-2 flex-1">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 group"
              style={{
                justifyContent: collapsed ? "center" : "flex-start",
                background: isActive
                  ? id === "profile"
                    ? "linear-gradient(135deg, hsla(45, 90%, 45%, 0.28), hsla(45, 80%, 35%, 0.15))"
                    : "linear-gradient(135deg, hsla(315, 80%, 45%, 0.35), hsla(315, 70%, 35%, 0.2))"
                  : "transparent",
                color: isActive
                  ? id === "profile"
                    ? "hsl(45, 100%, 68%)"
                    : "hsl(var(--primary))"
                  : "hsl(var(--sidebar-foreground))",
                boxShadow: isActive
                  ? id === "profile"
                    ? "0 0 20px hsla(45, 90%, 55%, 0.30), inset 0 0 0 1px hsla(45, 90%, 55%, 0.22)"
                    : "0 0 20px hsla(315, 90%, 55%, 0.35), inset 0 0 0 1px hsla(315, 80%, 55%, 0.25)"
                  : "none",
                border: isActive
                  ? id === "profile"
                    ? "1px solid hsla(45, 85%, 55%, 0.35)"
                    : "1px solid hsla(315, 70%, 50%, 0.3)"
                  : "1px solid transparent",
                transition: "all 0.2s ease, box-shadow 0.25s ease",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 0 14px hsla(315, 90%, 55%, 0.22), inset 0 0 0 1px hsla(315, 80%, 55%, 0.12)";
                  (e.currentTarget as HTMLElement).style.background =
                    "hsla(315, 60%, 30%, 0.12)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }
              }}
              title={collapsed ? label : undefined}
            >
              <Icon
                size={18}
                style={{
                  flexShrink: 0,
                  color: isActive
                    ? id === "profile"
                      ? "hsl(45, 100%, 65%)"
                      : "hsl(var(--primary))"
                    : "hsl(var(--sidebar-foreground))",
                  filter: isActive
                    ? id === "profile"
                      ? "drop-shadow(0 0 6px hsla(45,100%,60%,0.85))"
                      : "drop-shadow(0 0 6px hsla(315,90%,60%,0.7))"
                    : id === "profile"
                      ? "drop-shadow(0 0 3px hsla(45,100%,60%,0.4))"
                      : "none",
                  animation: id === "profile" ? "gold-crown-pulse 2.4s ease-in-out infinite" : "none",
                  transition: "filter 0.2s ease, color 0.2s ease",
                }}
              />
              {!collapsed && (
                <span className="flex items-center gap-2" style={{ whiteSpace: "nowrap", overflow: "hidden" }}>
                  {label}
                  {id === "profile" && (
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: "hsl(48,100%,65%)",
                        boxShadow: "0 0 6px 2px hsla(44,100%,58%,0.75), 0 0 12px 3px hsla(44,100%,52%,0.4)",
                        animation: "gold-dot-pulse 2.2s ease-in-out infinite",
                        display: "inline-block",
                      }}
                    />
                  )}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle — sits at bottom */}
      <div className="pb-4 px-2">
        <div
          style={{
            height: 1,
            margin: "0 4px 12px",
            background: "hsla(315, 60%, 55%, 0.12)",
          }}
        />
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex items-center justify-center w-full rounded-xl py-2 transition-all duration-200"
          style={{
            background: "hsla(315, 30%, 20%, 0.3)",
            border: "1px solid hsla(315, 40%, 40%, 0.2)",
            color: "hsl(var(--muted-foreground))",
          }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
