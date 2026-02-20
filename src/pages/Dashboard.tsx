import { useState } from "react";
import { Menu } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import AppSidebar from "@/components/dashboard/AppSidebar";
import HomePage from "@/pages/dashboard/HomePage";
import CheckerPage from "@/pages/dashboard/CheckerPage";

type Section = "home" | "checker";

const SECTION_TITLE: Record<Section, string> = {
  home: "Home",
  checker: "Checker",
};

const Dashboard = () => {
  const [active, setActive] = useState<Section>("home");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div
      className="relative min-h-screen flex overflow-hidden"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* Full-page particle backdrop */}
      <ParticleBackground />

      {/* ── Mobile overlay ── */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <div
        className="relative z-40 flex flex-col p-3"
        style={{
          /* on mobile: fixed drawer; on md+: static */
          position: undefined,
        }}
      >
        {/* Desktop sidebar */}
        <div className="hidden md:flex h-full" style={{ minHeight: "calc(100vh - 24px)" }}>
          <AppSidebar
            active={active}
            onNavigate={setActive}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((c) => !c)}
          />
        </div>

        {/* Mobile drawer */}
        <div
          className="fixed top-0 left-0 h-full z-40 md:hidden flex flex-col p-3"
          style={{
            transform: mobileSidebarOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <AppSidebar
            active={active}
            onNavigate={(s) => { setActive(s); setMobileSidebarOpen(false); }}
            collapsed={false}
            onToggleCollapse={() => setMobileSidebarOpen(false)}
          />
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <header
          className="flex items-center gap-4 px-6 py-4 border-b"
          style={{ borderColor: "hsla(315, 40%, 30%, 0.2)" }}
        >
          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden flex items-center justify-center rounded-xl p-2 transition-colors"
            style={{
              background: "hsla(315, 40%, 20%, 0.3)",
              border: "1px solid hsla(315, 40%, 40%, 0.2)",
              color: "hsl(var(--foreground))",
            }}
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu size={18} />
          </button>

          <h1
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            {SECTION_TITLE[active]}
          </h1>

          <div className="flex-1" />

          {/* Badge */}
          <div
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              background: "hsla(315, 80%, 45%, 0.18)",
              color: "hsl(var(--primary))",
              border: "1px solid hsla(315, 60%, 50%, 0.25)",
            }}
          >
            0xAdam
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {active === "home" && <HomePage />}
          {active === "checker" && <CheckerPage />}
        </main>

        {/* Footer */}
        <footer
          className="px-6 py-3 text-center text-xs"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          © 2026 0xAdam Checker · All rights reserved
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;
