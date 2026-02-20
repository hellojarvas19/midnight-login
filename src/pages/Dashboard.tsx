import { useState, useRef } from "react";
import { Menu } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import AppSidebar from "@/components/dashboard/AppSidebar";
import HomePage from "@/pages/dashboard/HomePage";
import CheckerPage from "@/pages/dashboard/CheckerPage";
import ProfilePage from "@/pages/dashboard/ProfilePage";

type Section = "home" | "checker" | "profile";

const SECTION_TITLE: Record<Section, string> = {
  home:    "Home",
  checker: "Checker",
  profile: "Profile",
};

const Dashboard = () => {
  const [active, setActive] = useState<Section>("home");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [pageKey, setPageKey] = useState(0);
  const [pageVisible, setPageVisible] = useState(true);
  const transitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigateTo = (section: Section) => {
    if (section === active) return;
    setPageVisible(false);
    if (transitionRef.current) clearTimeout(transitionRef.current);
    transitionRef.current = setTimeout(() => {
      setActive(section);
      setPageKey((k) => k + 1);
      setPageVisible(true);
    }, 180);
  };

  return (
    <div
      className="relative min-h-screen flex overflow-hidden"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* Full-page particle backdrop */}
      <ParticleBackground />

      {/* ── Mobile overlay (backdrop blur) ── */}
      <div
        className="fixed inset-0 z-30 md:hidden pointer-events-none"
        style={{
          background: mobileSidebarOpen ? "hsla(330,20%,4%,0.65)" : "transparent",
          backdropFilter: mobileSidebarOpen ? "blur(6px)" : "blur(0px)",
          WebkitBackdropFilter: mobileSidebarOpen ? "blur(6px)" : "blur(0px)",
          transition: "background 0.35s ease, backdrop-filter 0.35s ease",
          pointerEvents: mobileSidebarOpen ? "auto" : "none",
        }}
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* ── Desktop Sidebar ── */}
      <div className="hidden md:flex relative z-40 flex-col p-3">
        <div className="flex h-full" style={{ minHeight: "calc(100vh - 24px)" }}>
          <AppSidebar
            active={active}
            onNavigate={navigateTo}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((c) => !c)}
          />
        </div>
      </div>

      {/* ── Mobile Drawer ── */}
      <div
        className="fixed top-0 left-0 h-full z-40 flex flex-col p-3 md:hidden"
        style={{
          transform: mobileSidebarOpen ? "translateX(0)" : "translateX(-110%)",
          transition: "transform 0.38s cubic-bezier(0.32, 0.72, 0, 1)",
          willChange: "transform",
          filter: mobileSidebarOpen
            ? "drop-shadow(8px 0 32px hsla(315,80%,40%,0.35))"
            : "drop-shadow(0 0 0 transparent)",
        }}
      >
        <AppSidebar
          active={active}
          onNavigate={(s) => { navigateTo(s); setMobileSidebarOpen(false); }}
          collapsed={false}
          onToggleCollapse={() => setMobileSidebarOpen(false)}
        />
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-col flex-1 min-w-0">
        {/* Top bar — slide-down entrance */}
        <header
          className="animate-slide-down-fade flex items-center gap-4 px-6 py-4 border-b"
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

        {/* Page content — crossfade transition */}
        <main className="flex-1 px-4 py-5 md:p-6 overflow-y-auto">
          <div
            key={pageKey}
            style={{
              opacity: pageVisible ? 1 : 0,
              transform: pageVisible ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 0.22s ease, transform 0.22s ease",
            }}
          >
            {active === "home"    && <HomePage />}
            {active === "checker" && <CheckerPage />}
            {active === "profile" && <ProfilePage />}
          </div>
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
