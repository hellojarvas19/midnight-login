import React, { useState, useRef, useEffect, useCallback } from "react";
import { Menu, ChevronRight, Home, CreditCard, Crown } from "lucide-react";
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

const SECTION_ICON: Record<Section, typeof Home> = {
  home:    Home,
  checker: CreditCard,
  profile: Crown,
};

const SWIPE_THRESHOLD = 60; // px leftward to trigger close

// Transition states
type TransitionPhase = "idle" | "exit" | "enter";

const PAGE_NODE: Record<Section, React.ReactNode> = {
  home:    <HomePage />,
  checker: <CheckerPage />,
  profile: <ProfilePage />,
};

const Dashboard = () => {
  const [active, setActive]                   = useState<Section>("home");
  const [collapsed, setCollapsed]             = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [pageKey, setPageKey]                 = useState(0);
  const [phase, setPhase]                     = useState<TransitionPhase>("idle");
  const [direction, setDirection]             = useState<1 | -1>(1);
  const [exitContent, setExitContent]         = useState<React.ReactNode>(null);
  const transitionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainRef       = useRef<HTMLElement | null>(null);

  // Swipe-to-close state
  const touchStartX = useRef<number | null>(null);
  const [drawerDx, setDrawerDx] = useState(0);
  const isDragging = useRef(false);

  const navigateTo = (section: Section) => {
    if (section === active) return;
    const fromIdx = SECTION_ORDER.indexOf(active);
    const toIdx   = SECTION_ORDER.indexOf(section);
    const dir: 1 | -1 = toIdx > fromIdx ? 1 : -1;

    // Snapshot the leaving page so we can animate it out as a ghost
    setExitContent(PAGE_NODE[active]);
    setDirection(dir);
    setPhase("exit");

    if (transitionRef.current) clearTimeout(transitionRef.current);
    transitionRef.current = setTimeout(() => {
      setActive(section);
      setPageKey((k) => k + 1);
      setPhase("enter");
      setExitContent(null);
      // After enter animation completes, go idle
      transitionRef.current = setTimeout(() => setPhase("idle"), 350);
    }, 220);
  };

  /* ── Sidebar swipe-to-close handlers ── */
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
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

  /* ── Main content swipe-to-navigate handlers ── */
  const contentSwipeStartX = useRef<number | null>(null);
  const contentSwipeStartY = useRef<number | null>(null);
  const contentSwipeAxis   = useRef<"h" | "v" | null>(null); // locked axis

  const handleContentTouchStart = (e: React.TouchEvent) => {
    contentSwipeStartX.current = e.touches[0].clientX;
    contentSwipeStartY.current = e.touches[0].clientY;
    contentSwipeAxis.current   = null;
  };


  const handleContentTouchEnd = (e: React.TouchEvent) => {
    if (
      contentSwipeStartX.current === null ||
      contentSwipeAxis.current !== "h" ||
      phase !== "idle" // don't queue during an ongoing transition
    ) {
      contentSwipeStartX.current = null;
      contentSwipeStartY.current = null;
      contentSwipeAxis.current   = null;
      return;
    }

    const dx = e.changedTouches[0].clientX - contentSwipeStartX.current;
    contentSwipeStartX.current = null;
    contentSwipeStartY.current = null;
    contentSwipeAxis.current   = null;

    const CONTENT_SWIPE_THRESHOLD = 55;
    const currentIdx = SECTION_ORDER.indexOf(active);

    if (dx < -CONTENT_SWIPE_THRESHOLD && currentIdx < SECTION_ORDER.length - 1) {
      // Swipe left → go forward
      navigateTo(SECTION_ORDER[currentIdx + 1]);
    } else if (dx > CONTENT_SWIPE_THRESHOLD && currentIdx > 0) {
      // Swipe right → go backward
      navigateTo(SECTION_ORDER[currentIdx - 1]);
    }
  };

  // Attach non-passive touchmove to main so we can call preventDefault()
  // when the gesture locks to horizontal (prevents page scroll during swipe)
  const stableHandleContentTouchMove = useCallback(
    (e: TouchEvent) => {
      if (contentSwipeStartX.current === null || contentSwipeStartY.current === null) return;
      const dx = Math.abs(e.touches[0].clientX - contentSwipeStartX.current);
      const dy = Math.abs(e.touches[0].clientY - contentSwipeStartY.current);
      if (contentSwipeAxis.current === null && (dx > 10 || dy > 10)) {
        contentSwipeAxis.current = dx > dy ? "h" : "v";
      }
      if (contentSwipeAxis.current === "h") e.preventDefault();
    },
    [] // refs are stable — no deps needed
  );

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    el.addEventListener("touchmove", stableHandleContentTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", stableHandleContentTouchMove);
  }, [stableHandleContentTouchMove]);


  return (
    <div
      className="relative h-screen flex overflow-hidden"
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
      <div className="relative z-10 flex flex-col flex-1 min-w-0 overflow-hidden">
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
              style={{ color: "hsl(var(--muted-foreground))", opacity: 0.4, flexShrink: 0 }}
            />

            {/* Active section — re-mounts on every navigation to trigger animation */}
            {(() => {
              const SectionIcon = SECTION_ICON[active];
              const isProfile = active === "profile";
              return (
                <span
                  key={pageKey}
                  className="flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase"
                  style={{
                    color: isProfile ? "hsl(48,100%,68%)" : "hsl(var(--foreground))",
                    animation: "breadcrumb-slide-in 0.28s cubic-bezier(0.22,1,0.36,1) both",
                  }}
                >
                  <SectionIcon
                    size={13}
                    style={{
                      flexShrink: 0,
                      color: isProfile ? "hsl(48,100%,65%)" : "hsl(var(--primary))",
                      filter: isProfile
                        ? "drop-shadow(0 0 4px hsla(44,100%,58%,0.7))"
                        : "drop-shadow(0 0 4px hsla(315,90%,60%,0.55))",
                    }}
                  />
                  {SECTION_TITLE[active]}
                </span>
              );
            })()}
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

        {/* Page content — directional slide transition + swipe navigation */}
        <main
          ref={mainRef}
          className="relative flex-1 px-4 py-5 md:p-6 overflow-y-auto overflow-x-hidden"
          onTouchStart={handleContentTouchStart}
          onTouchEnd={handleContentTouchEnd}
        >
          {/* Exit ghost: absolute overlay that plays the exit animation before unmounting */}
          {phase === "exit" && exitContent && (
            <div
              key={`exit-${pageKey}`}
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                padding: "inherit",
                pointerEvents: "none",
                willChange: "opacity, transform, filter",
                animation: direction === 1
                  ? "page-exit-forward  0.22s cubic-bezier(0.4,0,1,1) both"
                  : "page-exit-backward 0.22s cubic-bezier(0.4,0,1,1) both",
              }}
            >
              {exitContent}
            </div>
          )}
          {/* Entering page */}
          <div
            key={pageKey}
            style={{
              willChange: "opacity, transform, filter",
              animation: phase !== "idle"
                ? direction === 1
                  ? "page-enter-forward  0.32s cubic-bezier(0.22,1,0.36,1) both"
                  : "page-enter-backward 0.32s cubic-bezier(0.22,1,0.36,1) both"
                : undefined,
            }}
          >
            {active === "home"    && <HomePage />}
            {active === "checker" && <CheckerPage />}
            {active === "profile" && <ProfilePage />}
          </div>
        </main>

        {/* ── Section dot indicator ── */}
        <div className="flex items-center justify-center gap-2 py-2">
          {SECTION_ORDER.map((section, i) => {
            const isActive = section === active;
            return (
              <button
                key={section}
                type="button"
                aria-label={`Go to ${SECTION_TITLE[section]}`}
                onClick={() => navigateTo(section)}
                style={{
                  width:  isActive ? 20 : 6,
                  height: 6,
                  borderRadius: 999,
                  border: "none",
                  padding: 0,
                  cursor: isActive ? "default" : "pointer",
                  background: isActive
                    ? section === "profile"
                      ? "linear-gradient(90deg, hsl(42,100%,52%), hsl(52,100%,72%))"
                      : "hsl(var(--primary))"
                    : "hsla(315,30%,40%,0.35)",
                  boxShadow: isActive
                    ? section === "profile"
                      ? "0 0 8px hsla(44,100%,55%,0.55)"
                      : "0 0 8px hsla(315,90%,60%,0.55)"
                    : "none",
                  transition: "width 0.3s cubic-bezier(0.34,1.56,0.64,1), background 0.3s ease, box-shadow 0.3s ease",
                }}
              />
            );
          })}
        </div>

        {/* Footer */}
        <footer
          className="px-6 pb-3 text-center text-xs"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          © 2026 0xAdam Checker · All rights reserved
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;
