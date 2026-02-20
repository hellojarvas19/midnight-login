
## Fix Home Page Layout & Match Card Checker Theme

### Problems Identified

**1. Stat Cards Too Cramped on Mobile**
The grid uses `grid-cols-3` always, forcing three cards side-by-side on a small screen. The labels get squished ("ADDRESSES SCANNED" overflows) and icons get pushed to the edge.

**Fix:** Change to `grid-cols-2` on mobile and `grid-cols-3` on desktop (`grid grid-cols-2 md:grid-cols-3`). Rename the third stat to something shorter like "Cards Scanned".

**2. Home Page Header Style Doesn't Match Checker**
- Checker page: `text-5xl font-black` title in magenta, acting as a bold page identifier
- Home page: `text-3xl font-extrabold` "Welcome back, 0xAdam" in plain foreground color with a small magenta name

**Fix:** Align header style — keep the welcome text but use the same Space Grotesk font, same sizing approach. Make "Welcome back" smaller/muted and "0xAdam" larger and magenta-glowing, like the Checker's title treatment.

**3. Activity Feed Language is Wrong (Blockchain, not Card Checker)**
Labels say "Wallet analysed", "Address scanned", "Contract scanned" and use fake wallet addresses like `0x71C7...3Ec1`. This is a card checker app, not a blockchain scanner.

**Fix:** Replace all seed events and live event templates with card-checker-appropriate language:
- Labels: "Card checked", "Mass run completed", "Batch processed", "Card declined", "Card approved"
- Addresses: Show masked card numbers like `•••• 4242`, `•••• 1234`, etc.

**4. Stat Labels Don't Match Card Checker Context**
- "Active Sessions" and "Addresses Scanned" are wallet/session terms
- Should be "Cards Checked", "Approved", "Cards in Queue" or similar card checker metrics

**Fix:** Rename stats to match the checker domain:
- "Total Checks" → keep
- "Active Sessions" → "Approved Today"  
- "Addresses Scanned" → "Cards Scanned"

### Files to Edit

- `src/pages/dashboard/HomePage.tsx` — fix grid layout, rename stats, fix activity feed language, align header style

### Technical Details

```text
StatCard grid:
  BEFORE: className="grid grid-cols-3 gap-4"
  AFTER:  className="grid grid-cols-2 md:grid-cols-3 gap-3"

Header:
  BEFORE: text-3xl font-extrabold (foreground) + span (primary)
  AFTER:  Muted "Welcome back," line + text-4xl font-black magenta "0xAdam" 
          matching the Checker page's Space Grotesk style

Activity feed content:
  BEFORE: "Wallet analysed", "0xFf00...1234"
  AFTER:  "Card approved", "•••• 4242" (card checker terminology)

Live events pool:
  BEFORE: LIVE_EVENTS with blockchain labels
  AFTER:  Card-checker labels (Card checked, Mass run done, etc.)
```

No new dependencies needed. Changes are isolated to `HomePage.tsx` only.
