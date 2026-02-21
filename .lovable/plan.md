

# Add Telegram-Style Features to Chat Page

This plan adds the most recognizable and useful Telegram group features that are currently missing from the Chat page.

---

## New Features

### 1. Member List / Info Panel (slide-out drawer)
- A toggleable side panel (or overlay on mobile) showing group info: name, description, member count, and a scrollable member list with online status dots and role badges (Admin/Member).
- Triggered by clicking the header area or a new info icon button.

### 2. Unread Messages Separator and "Scroll to Bottom" Button
- An "Unread Messages" divider bar that appears between the last-read message and new ones.
- A floating "scroll to bottom" button (with a chevron-down icon) that appears when the user scrolls up. Shows an unread count badge when there are new messages below.

### 3. Forward Message
- A new "Forward" option in the message context menu (the three-dot dropdown).
- Opens a small modal to pick a simulated channel/user to forward to, then shows a toast confirmation.

### 4. Copy Message Text
- A new "Copy" option in the message context menu that copies the text content to the clipboard and shows a brief toast/checkmark feedback.

### 5. Link Preview Cards
- When a message contains a URL, render a styled preview card below the text showing a placeholder domain, title, and description (simulated since there's no backend to fetch metadata).

### 6. Poll Creation and Voting
- A "Create Poll" button (bar-chart icon) in the input toolbar.
- Opens a small modal to enter a question and 2-4 options.
- Polls render as special message bubbles with votable option bars showing percentages and vote counts. Users can vote once per poll.

### 7. User Profile Popup
- Clicking on a user's avatar or name shows a small popover card with: avatar, username, role badge, join date, and a "Send Message" button (simulated).

### 8. Mute / Notification Toggle
- A bell/bell-off icon button in the header to toggle muted state.
- When muted, a small "Muted" badge appears next to the group name, and a toast confirms the action.

---

## Technical Details

### File Changes

**`src/pages/dashboard/ChatPage.tsx`** (sole file modified):

1. **New Types**:
   - Add `"poll"` to `MessageType`.
   - Add `PollOption` interface (`{ id, text, votes }`) and `pollData` field to `ChatMessage`.
   - Add `"forward"` action type for the context menu.

2. **New Components** (defined within the same file, following existing patterns):
   - `MemberPanel` - Slide-out overlay with member list, online indicators, role badges.
   - `ScrollToBottomButton` - Floating FAB with unread badge, appears on scroll-up.
   - `UnreadSeparator` - Thin styled divider with "Unread Messages" text.
   - `ForwardModal` - Small channel picker modal (simulated channels list).
   - `PollBubble` - Special bubble for polls with animated vote bars.
   - `PollCreateModal` - Form modal for creating polls (question + options).
   - `UserProfilePopover` - Avatar-click popover card.
   - `LinkPreviewCard` - Styled card for URL detection in text messages.

3. **State Additions** in `ChatPage`:
   - `isMuted` (boolean) for notification toggle.
   - `showMembers` (boolean) for member panel.
   - `showScrollBtn` (boolean) driven by scroll position observer.
   - `unreadCount` (number) for the scroll-to-bottom badge.
   - `forwardTarget` (ChatMessage | null) for forward modal.
   - `showPollModal` (boolean) for poll creation.
   - `profileTarget` (sender info | null) for user profile popup.

4. **Updated Components**:
   - `MessageBubble`: Add "Copy" and "Forward" to the dropdown menu. Add link detection and `LinkPreviewCard` rendering. Add `UserProfilePopover` trigger on avatar/name click.
   - Header: Add mute toggle button (Bell/BellOff icon) and info/members button.
   - Input bar: Add poll creation button (BarChart3 icon).
   - Message list wrapper: Add scroll position listener for the floating button and unread separator logic.

5. **New Icons** (from lucide-react):
   - `Bell`, `BellOff`, `BarChart3`, `Copy`, `Forward`, `ChevronDown`, `Users`, `ExternalLink`, `Info`

All new components follow the existing glassmorphism styling with `hsla()` color tokens, gold accents for admin elements, and the same animation patterns (card-entrance, reply-slide-in).

