import { useState, useRef } from "react";
import { Menu, ChevronRight } from "lucide-react";
import ParticleBackground from "@/components/ParticleBackground";
import AppSidebar from "@/components/dashboard/AppSidebar";
import HomePage from "@/pages/dashboard/HomePage";
import CheckerPage from "@/pages/dashboard/CheckerPage";
import ProfilePage from "@/pages/dashboard/ProfilePage";

type Section = "home" | "checker" | "profile";

const SECTION_ORDER: Section[] = ["home", "checker", "profile"];

const SECTION_TITLE: Record<Section, string> = {
  home:    "Home",
  checker: "Checker",
  profile: "Profile",
};

const SWIPE_THRESHOLD = 60; // px leftward to trigger close

// Transition states
type TransitionPhase = "idle" | "exit" | "enter";

const Dashboard = () => {
  const [active, setActive]                   = useState<Section>("home");
  const [collapsed, setCollapsed]             = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [pageKey, setPageKey]                 = useState(0);
  const [phase, setPhase]                     = useState<TransitionPhase>("idle");
  const [direction, setDirection]             = useState<1 | -1>(1); // 1 = forward, -1 = backward
  const transitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Swipe-to-close state
  const touchStartX = useRef<number | null>(null);
  const [drawerDx, setDrawerDx] = useState(0);
  const isDragging = useRef(false);

  const navigateTo = (section: Section) => {
    if (section === active) return;
    const fromIdx = SECTION_ORDER.indexOf(active);
    const toIdx   = SECTION_ORDER.indexOf(section);
    const dir: 1 | -1 = toIdx > fromIdx ? 1 : -1;
    setDirection(dir);
    setPhase("exit");
    if (transitionRef.current) clearTimeout(transitionRef.current);
    transitionRef.current = setTimeout(() => {
      setActive(section);
      setPageKey((k) => k + 1);
      setPhase("enter");
      // After enter animation completes, go idle
      transitionRef.current = setTimeout(() => setPhase("idle"), 300);
    }, 200);
  };

  /* ── Touch handlers ── */
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    // Only allow leftward drag (negative)
    setDrawerDx(Math.min(0, dx));
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const endX = e.changedTouches[0].clientX;
    const dx = endX - (touchStartX.current ?? endX);
    touchStartX.current = null;
    setDrawerDx(0);
    if (dx < -SWIPE_THRESHOLD) {
      setMobileSidebarOpen(false);
    }
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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: mobileSidebarOpen
            ? `translateX(${drawerDx}px)`
            : "translateX(-110%)",
          transition: isDragging.current ? "none" : "transform 0.38s cubic-bezier(0.32, 0.72, 0, 1)",
          willChange: "transform",
          filter: mobileSidebarOpen
            ? "drop-shadow(8px 0 32px hsla(315,80%,40%,0.35))"
            : "drop-shadow(0 0 0 transparent)",
          opacity: mobileSidebarOpen ? Math.max(0.2, 1 + drawerDx / 200) : 1,
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

          {/* Animated breadcrumb */}
          <nav className="flex items-center gap-1.5" aria-label="Breadcrumb">
            {/* Root crumb */}
            <span
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: "hsl(var(--muted-foreground))", opacity: 0.55 }}
            >
              0xAdam
            </span>

            {/* Separator */}
            <ChevronRight
              size={12}
              style={{
                color: "hsl(var(--muted-foreground))",
                opacity: 0.4,
                flexShrink: 0,
              }}
            />

            {/* Active section — re-mounts on every navigation to trigger animation */}
            <span
              key={pageKey}
              className="text-xs font-bold tracking-widest uppercase"
              style={{
                color: "hsl(var(--foreground))",
                animation: "breadcrumb-slide-in 0.28s cubic-bezier(0.22,1,0.36,1) both",
              }}
            >
              {SECTION_TITLE[active]}
            </span>
          </nav>

          <div className="flex-1" />

          {/* Badge */}
          <div
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              background: "hsla(44, 80%, 40%, 0.15)",
              border: "1px solid hsla(44, 80%, 55%, 0.3)",
              backgroundClip: "padding-box",
            }}
          >
            <span
              style={{
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
            </span>
          </div>
        </header>

        {/* Page content — directional slide transition */}
        <main className="flex-1 px-4 py-5 md:p-6 overflow-y-auto">
          <div
            key={pageKey}
            style={{
              opacity:   phase === "exit" ? 0 : 1,
              transform: phase === "exit"
                ? `translateX(${direction * -40}px)`
                : phase === "enter"
                  ? `translateX(${direction * 32}px)`
                  : "translateX(0)",
              transition: phase === "enter"
                ? "opacity 0.28s cubic-bezier(0.22,1,0.36,1), transform 0.28s cubic-bezier(0.22,1,0.36,1)"
                : "opacity 0.18s ease, transform 0.18s ease",
              willChange: "opacity, transform",
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
