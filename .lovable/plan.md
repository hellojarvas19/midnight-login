

# Telegram-Only Authentication

Replace the current email/password login with **Telegram Login Widget** as the sole authentication method, and display real Telegram profile data (photo, name, username, user ID) on the Profile page.

---

## How It Works

1. User clicks **"Continue with Telegram"** on the login page
2. Telegram Login Widget opens a popup for authorization
3. Telegram returns signed user data (id, first_name, last_name, username, photo_url, hash)
4. A backend function **verifies the hash** using the Bot Token, then creates or signs in the user
5. Profile is auto-populated with Telegram data (avatar, name, username, Telegram ID)
6. User lands on the dashboard with their real Telegram profile displayed

---

## What You Need

- A **Telegram Bot Token** (from @BotFather on Telegram). You'll be prompted to enter it securely.

---

## Database Changes

- Add `first_name` and `last_name` columns to the `profiles` table
- Update the `handle_new_user()` trigger to include these new fields

---

## Backend Function

Create a `telegram-auth` function that:
- Receives the Telegram login widget callback data
- Verifies the data hash using HMAC-SHA256 with the bot token
- Creates a new user (or finds existing) using the Telegram ID as identifier
- Stores Telegram profile data (photo, name, username) in the `profiles` table
- Returns a valid session for the frontend

---

## UI Changes

### AuthCard (Login Page)
- Remove email/password fields, signup toggle, and forgot-password link
- Show only the branded **"Continue with Telegram"** button
- On click, open the Telegram Login Widget popup
- On successful callback, send data to the backend function and log in

### ProfilePage
- Display real Telegram data: profile photo, first + last name, @username, Telegram user ID
- Remove all mock/fallback data references

### Cleanup
- Remove the `/reset-password` route and `ResetPassword.tsx` page (no longer needed)
- Simplify `AuthContext` to remove `signUp` and email-based `signIn`

---

## Technical Details

### Telegram Login Widget Integration
- Embed the Telegram Login Widget script (`https://telegram.org/js/telegram-widget.js`)
- Configure with the bot username and a JS callback function
- The widget returns: `id`, `first_name`, `last_name`, `username`, `photo_url`, `auth_date`, `hash`

### Hash Verification (in edge function)
```
secret_key = SHA256(bot_token)
data_check_string = sorted key=value pairs (excluding hash)
verify HMAC-SHA256(secret_key, data_check_string) === hash
```

### User Creation Strategy
- Use `supabase.auth.admin.createUser()` with a deterministic email like `tg_{telegram_id}@telegram.user`
- If user already exists, sign them in using `admin.generateLink()` or a custom approach
- Store all Telegram fields in `profiles` table

### Files Modified
- `src/components/AuthCard.tsx` -- Telegram button only
- `src/contexts/AuthContext.tsx` -- Add `signInWithTelegram()`, remove email methods
- `src/pages/dashboard/ProfilePage.tsx` -- Use real Telegram profile data
- `src/App.tsx` -- Remove reset-password route

### Files Created
- `supabase/functions/telegram-auth/index.ts` -- Verify and authenticate

### Files Deleted
- `src/pages/ResetPassword.tsx`

### Migration
- Add `first_name text`, `last_name text` columns to `profiles`

