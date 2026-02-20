
# Checker Page Redesign

## Overview
Overhaul `src/pages/dashboard/CheckerPage.tsx` with three major changes:
1. Font update to Space Grotesk (already global, but explicitly apply it to headers)
2. Replace "Address / Contract" input section with a **Select Gateway** dropdown + card input form
3. Replace the Results empty state with three animated result states

---

## What Gets Changed

### Single File Modified: `src/pages/dashboard/CheckerPage.tsx`

---

## Section 1 — Header Font
The "Checker" heading gets `font-family: 'Space Grotesk'` explicitly applied with a larger, bolder weight (`text-5xl font-black`) for a stronger visual presence matching the screenshot.

---

## Section 2 — Input Panel Redesign

Replace the current `ADDRESS / CONTRACT` label + text input with:

**Select Gateway** (label)
- A styled dropdown using Radix `Select` component with three options:
  - `Stripe Charge` — processes a payment charge
  - `Stripe Auth` — authorizes without charging
  - `Shopify` — Shopify order lookup

**Card Details Form** (shown below the gateway selector):
- Card Number input (formatted `•••• •••• •••• 1234`, font-mono)
- Expiry + CVV in a 2-column row
- Cardholder Name input
- All inputs styled with `glass-input` matching the existing theme

**Run Check** button stays at the bottom of the panel (full width, magenta shimmer)

---

## Section 3 — Results Panel with Animated States

The results area will have 4 states driven by a `resultState` enum: `idle | loading | charged | approved | declined`

### State: `idle`
Current empty state (Search icon + "Enter details to begin")

### State: `loading`
Spinning magenta ring animation while check is processing

### State: `charged` — Animated Diamond + CC Details
- A rotating/pulsing **diamond shape** (CSS clip-path or SVG) in magenta with a shimmer sweep animation
- Below the diamond: a glass card showing CC details:
  - Masked card number: `•••• •••• •••• 1234`
  - Gateway used (e.g. "Stripe Charge")
  - Status badge: `CHARGED` in magenta
  - Amount field

### State: `approved` — Animated Green Checkmark
- A large animated green circle with a drawing checkmark (SVG stroke-dashoffset animation)
- Text: "Approved" in green with a glow
- Subtle green particle burst (CSS box-shadow pulse on rings)

### State: `declined` — Animated Red X
- A large animated red circle with an X drawn via SVG stroke animation
- Text: "Declined" in red with a glow
- Subtle red pulse ring animation

---

## New Animations Added to `src/index.css`

```text
@keyframes diamond-spin     — slow 360° rotate on the diamond shape
@keyframes diamond-shimmer  — shimmer sweep across the diamond face
@keyframes check-draw       — already exists, reused for green checkmark
@keyframes x-draw           — SVG stroke draw for the red X lines
@keyframes result-pop       — scale-in bounce for result icons
@keyframes ring-pulse-green — green glow ring expand + fade
@keyframes ring-pulse-red   — red glow ring expand + fade
```

---

## Interaction Flow

```text
User fills card details → selects gateway → clicks "Run Check"
  → resultState = "loading" (spinner)
  → after 1.5s simulated delay → randomly sets to charged / approved / declined
     (for demo purposes — real integration would replace this)
```

For demo, the result is determined by a simple simulation:
- If card number ends in even digit → `approved`
- If card number ends in odd digit → `declined`
- If gateway is "Stripe Charge" → `charged` (shows CC details card)

---

## Technical Details

- Uses `useState` for: `gateway`, `cardNumber`, `expiry`, `cvv`, `name`, `resultState`
- Radix `Select` component from `src/components/ui/select.tsx` (already installed)
- SVG animations use `stroke-dasharray` / `stroke-dashoffset` for draw-on effects
- Diamond shape built with CSS `clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)`
- All result panels use `animate-card-entrance` for smooth entry
- New keyframes added to `src/index.css` for diamond spin and X draw
