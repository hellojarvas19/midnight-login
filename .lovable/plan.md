
# Dashboard Page with Glassmorphism Sidebar

## Overview

Build a `/dashboard` route that users land on after clicking "Continue with Telegram". It features a collapsible glassmorphism sidebar with **Home** and **Checker** navigation items, the same dark magenta visual theme, and page content for each section.

## What Gets Built

### New Files
1. **`src/pages/Dashboard.tsx`** — Main dashboard layout wrapping sidebar + content area
2. **`src/components/dashboard/AppSidebar.tsx`** — Glassmorphism sidebar with logo, Home & Checker nav items, collapse toggle
3. **`src/pages/dashboard/HomePage.tsx`** — Home tab content (welcome card + stats placeholders)
4. **`src/pages/dashboard/CheckerPage.tsx`** — Checker tab content (input tool panel)

### Modified Files
1. **`src/App.tsx`** — Add `/dashboard` route
2. **`src/components/AuthCard.tsx`** — Wire the Telegram button to navigate to `/dashboard` on click (simulated login)

---

## Technical Architecture

```text
/dashboard
├── AppSidebar (left, collapsible)
│   ├── LogoMark + "0xAdam"
│   ├── Nav: Home (House icon)
│   ├── Nav: Checker (Search icon)
│   └── Collapse toggle button
└── Main content area (right)
    ├── Top bar (hamburger trigger + page title)
    ├── <HomePage />  when Home is active
    └── <CheckerPage /> when Checker is active
```

The sidebar uses internal React state (`useState`) for active section and collapse — no extra library needed (avoids SidebarProvider complexity for this two-item nav).

---

## Sidebar Design

- **Width**: 220px expanded, 64px collapsed (icon-only mini mode)
- **Style**: `glass-card` background with magenta border, same backdrop blur as auth card
- **Logo section**: `LogoMark` image (small, 48px) + "0xAdam Checker" text (hidden when collapsed)
- **Nav items**: Magenta active highlight with glow, icon + label. Label hidden in collapsed state
- **Collapse button**: Chevron arrow at bottom of sidebar, always visible

---

## Page Content

### Home Page
- Large welcome header: "Welcome back, 0xAdam" with `text-glow`
- 3 glass stat cards (placeholders): Total Checks, Active Sessions, Last Login
- A "Recent Activity" glass panel (empty state with magenta icon)

### Checker Page
- A glass panel with a text input (styled with `glass-input`) and a magenta "Run Check" button
- Results area below (empty state initially: "Enter an address to begin")

---

## Navigation Flow

```text
/ (Login page)
  └── [Continue with Telegram] → navigate("/dashboard")

/dashboard
  ├── Sidebar: Home (default active)
  └── Sidebar: Checker
```

The Telegram button gets an `onClick` with `useNavigate("/dashboard")` — simulating post-auth redirect until real Telegram OAuth is connected.

---

## Styling Consistency

- All panels use the existing `glass-card` utility class
- Inputs use the existing `glass-input` utility class
- Buttons use the existing `btn-shimmer` + magenta gradient pattern
- `ParticleBackground` reused as the full-page backdrop on the dashboard
- Animations: `animate-card-entrance` on content panels for smooth mount transitions
- Active sidebar items glow with `box-shadow: 0 0 20px hsla(315, 90%, 55%, 0.35)`
