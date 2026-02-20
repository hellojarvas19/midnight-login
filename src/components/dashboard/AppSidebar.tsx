import { Home, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { LogoMark } from "@/components/LogoMark";

type Section = "home" | "checker";

interface AppSidebarProps {
  active: Section;
  onNavigate: (section: Section) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const NAV_ITEMS: { id: Section; label: string; Icon: typeof Home }[] = [
  { id: "home", label: "Home", Icon: Home },
  { id: "checker", label: "Checker", Icon: Search },
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
          <p
            className="text-xs font-bold tracking-widest uppercase mt-1 text-glow"
            style={{
              color: "hsl(var(--primary))",
              whiteSpace: "nowrap",
              opacity: collapsed ? 0 : 1,
              transition: "opacity 0.2s ease",
            }}
          >
            0xAdam
          </p>
        )}
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          margin: "0 12px 8px",
          background: "hsla(315, 60%, 55%, 0.18)",
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
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200"
              style={{
                justifyContent: collapsed ? "center" : "flex-start",
                background: isActive
                  ? "linear-gradient(135deg, hsla(315, 80%, 45%, 0.35), hsla(315, 70%, 35%, 0.2))"
                  : "transparent",
                color: isActive
                  ? "hsl(var(--primary))"
                  : "hsl(var(--sidebar-foreground))",
                boxShadow: isActive
                  ? "0 0 20px hsla(315, 90%, 55%, 0.35), inset 0 0 0 1px hsla(315, 80%, 55%, 0.25)"
                  : "none",
                border: isActive
                  ? "1px solid hsla(315, 70%, 50%, 0.3)"
                  : "1px solid transparent",
              }}
              title={collapsed ? label : undefined}
            >
              <Icon
                size={18}
                style={{
                  flexShrink: 0,
                  color: isActive ? "hsl(var(--primary))" : "hsl(var(--sidebar-foreground))",
                  filter: isActive ? "drop-shadow(0 0 6px hsla(315,90%,60%,0.7))" : "none",
                }}
              />
              {!collapsed && (
                <span style={{ whiteSpace: "nowrap", overflow: "hidden" }}>{label}</span>
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
