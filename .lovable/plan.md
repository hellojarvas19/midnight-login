

# Persist Plans and Credits to Database

Currently, the plan selection is stored only in React state (PlanContext) and resets on every page refresh. This plan will move it to the database so it persists across sessions.

---

## Database Changes

Add a `plan` column to the existing `profiles` table:

```text
profiles table:
  + plan text NOT NULL DEFAULT 'free'    -- stores 'free', 'pro', or 'enterprise'
```

The `credits` column already exists (integer, default 0), so no change needed there.

---

## Backend Changes

No new backend functions needed. The existing RLS policies on `profiles` already allow users to read and update their own profile, which is sufficient.

---

## Frontend Changes

### 1. Update PlanContext to use the database
- On load, read the user's `plan` and `credits` from `profiles` (via AuthContext's existing profile data)
- When `setPlanId()` is called, update the `profiles` table and refresh the local state
- Remove the hardcoded default of `"pro"` -- default to whatever is in the database

### 2. Update AuthContext Profile type
- Add `plan` field to the `Profile` interface (it will come from the database automatically since we already `SELECT *`)

### 3. Update PlansPage
- No major changes needed -- it already calls `setPlanId()` from PlanContext, which will now persist to the database

### 4. Update ProfilePage
- The plan badge already reads from `activePlan` via `usePlan()`, so it will automatically reflect the persisted value

---

## Technical Details

### Migration SQL
```sql
ALTER TABLE public.profiles 
ADD COLUMN plan text NOT NULL DEFAULT 'free';
```

### PlanContext rewrite
- Accept `profile` from AuthContext to initialize the plan
- `setPlanId` will call `supabase.from('profiles').update({ plan }).eq('id', user.id)` then refresh the profile
- Export a loading state so the UI doesn't flash the wrong plan

### Files Modified
- `src/contexts/PlanContext.tsx` -- Read/write plan from database via Supabase
- `src/contexts/AuthContext.tsx` -- Add `plan` to Profile interface

### Files Unchanged
- `src/pages/dashboard/PlansPage.tsx` -- Already uses `usePlan()` correctly
- `src/pages/dashboard/ProfilePage.tsx` -- Already uses `usePlan()` correctly

