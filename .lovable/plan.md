
## Add Animations Across the Website

### Current Animation State
The app already has:
- `animate-card-entrance` (fade + scale up) on page sections
- `animate-ping` live dot on the Home page
- Animated counter / progress bar on stat cards
- CSS keyframes for float orbs, particle drift, pulse glow, water ripple

### What's Missing / Where to Add Polish
The request is broad — "add animations to the website." Based on the UI structure, here are the high-impact additions across all three pages and the shared layout:

---

### 1. Dashboard Layout — Staggered Header Entrance
The top bar (hamburger + title + badge) currently has no entrance animation. Add a slide-down + fade-in so the header appears smoothly when the dashboard loads.

### 2. Dashboard — Page Transition Fade
When switching between Home / Checker / Profile via the sidebar, the new page content just snaps in. Add a quick `opacity` + `translateY` crossfade transition (using a `key`-driven re-render with CSS transition) so pages slide-in smoothly.

### 3. Home Page — Stat Cards Hover Lift
The three stat cards have entrance animations but no hover interactivity. Add a `translateY(-4px)` lift + subtle magenta glow intensification on hover using inline `onMouseEnter`/`onMouseLeave` state.

### 4. Home Page — Activity Feed Row Slide-In
New live activity entries currently use `card-entrance` but appear abruptly. Enhance to slide in from the top with a smooth `max-height` + `opacity` transition so new entries push the list down gracefully.

### 5. Checker Page — Run Button Pulse
The "Run" button has no idle animation. Add a slow `animate-pulse-glow` (already defined in CSS) that runs when the button is ready-to-run (gateway selected + cards loaded), drawing attention to the CTA.

### 6. Checker Page — Result Row Slide-In
Each card result row appears instantly. Add a staggered `card-entrance` animation with an `animationDelay` based on the row index (capped at ~20 rows to avoid delay overload).

### 7. Profile Page — Avatar Ring Pulse
The profile avatar has a static magenta border. Add the existing `logo-ring-pulse` keyframe as a continuous animation so the border slowly breathes in and out, giving a "live presence" feel.

### 8. Profile Page — Credits Bar Animated Fill
The credit usage bar currently has `transition: width 1s` but only fills on mount. Trigger the fill via an `IntersectionObserver`-style `useEffect` + a small `useState` so it animates from 0% to 7% when the card enters the viewport.

### 9. AppSidebar — Nav Item Hover Glow
Navigation items in the sidebar have hover color changes but no glow effect. Add a `box-shadow` glow transition on hover so the active/hovered nav item radiates magenta light.

---

### Technical Plan

**Files to edit:**
- `src/pages/Dashboard.tsx` — header slide-down, page transition fade
- `src/pages/dashboard/HomePage.tsx` — stat card hover lift, activity row slide-in
- `src/pages/dashboard/CheckerPage.tsx` — run button pulse, result row staggered entrance
- `src/pages/dashboard/ProfilePage.tsx` — avatar ring pulse, credits bar animated fill
- `src/components/dashboard/AppSidebar.tsx` — nav item hover glow

**New CSS (added to `src/index.css`):**
- `@keyframes slide-down-fade` — for the header entrance
- `@keyframes nav-glow-pulse` — for sidebar hover state

All other animations reuse existing keyframes already defined in `index.css`.
