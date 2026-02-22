import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  MessageCircle, Send, Image as ImageIcon, Mic,
  Pin, X, Play, Pause, MoreVertical, Check, CheckCheck,
  Crown, Reply, Search, ChevronUp, ChevronDown, Trash2, Pencil,
  Bell, BellOff, Copy, Users, ExternalLink, Info,
} from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/* ─── Types ─── */
type MessageType = "text" | "image" | "audio";
type SenderRole  = "user" | "admin" | "owner";
type Emoji       = "👍" | "❤️" | "😂" | "🔥";

const EMOJI_LIST: Emoji[] = ["👍", "❤️", "😂", "🔥"];

interface QuotedMessage {
  id: string;
  sender: string;
  senderRole: SenderRole;
  content: string;
  type: MessageType;
  deleted?: boolean;
}

interface ChatMessage {
  id: string;
  type: MessageType;
  content: string;
  sender: string;
  senderRole: SenderRole;
  senderId: string;
  senderAvatar?: string;
  timestamp: Date;
  pinned?: boolean;
  deleted?: boolean;
  edited?: boolean;
  imagePreview?: string;
  reactions: Partial<Record<Emoji, number>>;
  myReaction?: Emoji;
  quotedMessage?: QuotedMessage;
}

/* ─── Helpers ─── */
function timeAgo(date: Date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function quotePreview(msg: ChatMessage): string {
  if (msg.type === "image") return "📷 Image";
  if (msg.type === "audio") return "🎤 Voice message";
  return msg.content.length > 80 ? msg.content.slice(0, 80) + "…" : msg.content;
}

const URL_REGEX = /https?:\/\/[^\s]+/g;

function extractUrls(text: string): string[] {
  return text.match(URL_REGEX) || [];
}

function getDomain(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

/* ─── Link Preview Card ─── */
const LinkPreviewCard = ({ url }: { url: string }) => {
  const domain = getDomain(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 rounded-xl px-3 py-2.5 mt-2 transition-opacity hover:opacity-80"
      style={{
        background: "hsla(330,15%,6%,0.8)",
        border: "1px solid hsla(315,30%,25%,0.25)",
      }}
    >
      <div
        className="w-1 rounded-full shrink-0"
        style={{ background: "hsl(200,90%,55%)" }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: "hsl(200,90%,65%)" }}>
          {domain}
        </p>
        <p className="text-xs mt-0.5 truncate" style={{ color: "hsl(var(--foreground))" }}>
          {domain.replace("www.", "").split(".")[0].charAt(0).toUpperCase() + domain.replace("www.", "").split(".")[0].slice(1)} — Official Site
        </p>
        <p className="text-xs mt-0.5 truncate" style={{ color: "hsl(var(--muted-foreground))" }}>
          Visit {domain} for more information
        </p>
      </div>
      <ExternalLink size={12} className="shrink-0 mt-1" style={{ color: "hsl(200,90%,65%)" }} />
    </a>
  );
};

/* ─── Member Panel ─── */
const MemberPanel = ({ members, onClose }: { members: { name: string; role: SenderRole; online: boolean; avatar?: string }[]; onClose: () => void }) => (
  <div
    className="fixed inset-0 z-[55] flex justify-end"
    onClick={onClose}
  >
    <div className="absolute inset-0" style={{ background: "hsla(0,0%,0%,0.5)" }} />
    <div
      onClick={(e) => e.stopPropagation()}
      className="relative w-full max-w-xs h-full flex flex-col overflow-y-auto"
      style={{
        background: "hsla(330,20%,5%,0.98)",
        borderLeft: "1px solid hsla(315,40%,30%,0.3)",
        backdropFilter: "blur(24px)",
        animation: "slide-in-right 0.3s ease-out both",
      }}
    >
      <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: "hsla(315,30%,25%,0.2)" }}>
        <p className="text-sm font-bold" style={{ color: "hsl(var(--foreground))" }}>Group Info</p>
        <button onClick={onClose} className="p-1 rounded-md hover:opacity-70"><X size={14} style={{ color: "hsl(var(--muted-foreground))" }} /></button>
      </div>
      <div className="px-4 py-3 border-b" style={{ borderColor: "hsla(315,30%,25%,0.15)" }}>
        <p className="text-xs font-semibold" style={{ color: "hsl(var(--foreground))" }}>0xAdam Community</p>
        <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Official community chat for 0xAdam Checker users. Ask questions, share tips, and connect.</p>
        <p className="text-xs mt-2 font-medium" style={{ color: "hsl(315,90%,65%)" }}>{members.length} members</p>
      </div>
      <div className="flex-1 px-2 py-2">
        {members.map((m) => (
          <div key={m.name} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/5 transition-colors">
            <div className="relative">
              <div
                className="rounded-full flex items-center justify-center text-xs font-bold overflow-hidden"
                style={{
                  width: 32, height: 32,
                  background: m.role === "admin" ? "linear-gradient(135deg, hsl(42,100%,52%), hsl(36,90%,40%))" : "hsla(315,80%,40%,0.25)",
                  border: m.role === "admin" ? "1px solid hsla(44,100%,58%,0.5)" : "1px solid hsla(315,50%,40%,0.3)",
                  color: m.role === "admin" ? "hsl(330,15%,5%)" : "hsl(var(--foreground))",
                }}
              >
                {m.avatar ? (
                  <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                ) : m.role === "admin" ? <Crown size={12} /> : m.name[0].toUpperCase()}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: m.role === "admin" ? "hsl(44,100%,65%)" : "hsl(var(--foreground))" }}>
                {m.role === "admin" && "👑 "}{m.name}
              </p>
            </div>
            {m.role === "admin" && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "hsla(44,100%,55%,0.15)", color: "hsl(44,100%,65%)", border: "1px solid hsla(44,100%,55%,0.25)" }}>Admin</span>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ─── Scroll To Bottom Button ─── */
const ScrollToBottomButton = ({ unreadCount, onClick }: { unreadCount: number; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="absolute bottom-20 right-4 z-30 rounded-full p-2.5 shadow-lg transition-all active:scale-90 hover:opacity-90"
    style={{
      background: "hsla(330,20%,8%,0.95)",
      border: "1px solid hsla(315,40%,30%,0.4)",
      backdropFilter: "blur(16px)",
      boxShadow: "0 4px 20px hsla(330,30%,2%,0.6)",
      animation: "scale-in 0.2s ease-out both",
    }}
  >
    <ChevronDown size={16} style={{ color: "hsl(var(--foreground))" }} />
    {unreadCount > 0 && (
      <span
        className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-xs font-bold px-1"
        style={{ background: "hsl(315,90%,50%)", color: "#fff", fontSize: 10 }}
      >
        {unreadCount}
      </span>
    )}
  </button>
);

/* ─── User Profile Popover ─── */
const UserProfilePopover = ({ name, role, avatar, children }: { name: string; role: SenderRole; avatar?: string; children: React.ReactNode }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-56 p-0 border-0"
        style={{
          background: "hsla(330,20%,6%,0.98)",
          border: "1px solid hsla(315,40%,30%,0.35)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 12px 40px hsla(330,30%,2%,0.7)",
        }}
      >
        <div className="p-4 flex flex-col items-center gap-2">
          <div
            className="rounded-full flex items-center justify-center text-sm font-bold overflow-hidden"
            style={{
              width: 48, height: 48,
              background: role === "admin" ? "linear-gradient(135deg, hsl(42,100%,52%), hsl(36,90%,40%))" : "hsla(315,80%,40%,0.25)",
              border: role === "admin" ? "2px solid hsla(44,100%,58%,0.5)" : "2px solid hsla(315,50%,40%,0.3)",
              color: role === "admin" ? "hsl(330,15%,5%)" : "hsl(var(--foreground))",
            }}
          >
            {avatar ? (
              <img src={avatar} alt={name} className="w-full h-full object-cover" />
            ) : role === "admin" ? <Crown size={18} /> : name[0].toUpperCase()}
          </div>
          <p className="text-sm font-bold" style={{ color: role === "admin" ? "hsl(44,100%,65%)" : "hsl(var(--foreground))" }}>
            {role === "admin" && "👑 "}{name}
          </p>
          {role === "admin" && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "hsla(44,100%,55%,0.15)", color: "hsl(44,100%,65%)", border: "1px solid hsla(44,100%,55%,0.25)" }}>Admin</span>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

/* ─── Quote block inside a bubble ─── */
const QuoteBlock = ({
  quote, isOwn, onScrollTo, isDeleted = false,
}: {
  quote: QuotedMessage; isOwn: boolean; onScrollTo?: (id: string) => void; isDeleted?: boolean;
}) => {
  const isAdmin = quote.senderRole === "admin";
  const accentColor = isDeleted ? "hsl(var(--muted-foreground))" : isAdmin ? "hsl(44,100%,60%)" : "hsl(315,90%,65%)";
  return (
    <button
      onClick={() => !isDeleted && onScrollTo?.(quote.id)}
      className="w-full text-left flex gap-2.5 rounded-xl px-3 py-2 mb-2 transition-opacity hover:opacity-80 active:opacity-60"
      style={{
        background: isOwn ? "hsla(315,80%,20%,0.28)" : "hsla(330,15%,4%,0.6)",
        borderLeft: `3px solid ${accentColor}`,
        cursor: isDeleted ? "default" : "pointer",
      }}
    >
      <div className="flex-1 min-w-0">
        {!isDeleted && (
          <p className="text-xs font-semibold mb-0.5 truncate" style={{ color: accentColor }}>
            {isAdmin ? "👑 " : ""}{quote.sender}
          </p>
        )}
        <p className="text-xs truncate italic" style={{ color: "hsl(var(--muted-foreground))", opacity: isDeleted ? 0.6 : 1 }}>
          {isDeleted ? "🗑️ Message deleted" : quote.type === "image" ? "📷 Image" : quote.type === "audio" ? "🎤 Voice message" : quote.content}
        </p>
      </div>
    </button>
  );
};

/* ─── Quote preview strip in input area ─── */
const QuotePreviewBar = ({ quote, onCancel }: { quote: QuotedMessage; onCancel: () => void }) => {
  const isAdmin = quote.senderRole === "admin";
  const accentColor = isAdmin ? "hsl(44,100%,60%)" : "hsl(315,90%,65%)";
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3 py-2 mb-2"
      style={{
        background: "hsla(330,18%,6%,0.85)",
        border: "1px solid hsla(315,35%,30%,0.25)",
        borderLeft: `3px solid ${accentColor}`,
        animation: "reply-slide-in 0.22s cubic-bezier(0.34,1.56,0.64,1) both",
      }}
    >
      <Reply size={13} style={{ color: accentColor, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: accentColor }}>{isAdmin ? "👑 " : ""}{quote.sender}</p>
        <p className="text-xs truncate" style={{ color: "hsl(var(--muted-foreground))" }}>
          {quote.type === "image" ? "📷 Image" : quote.type === "audio" ? "🎤 Voice message" : quote.content}
        </p>
      </div>
      <button onClick={onCancel} className="rounded-full p-1 transition-opacity hover:opacity-70 active:scale-90" style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0 }} title="Cancel reply">
        <X size={13} />
      </button>
    </div>
  );
};

/* ─── Emoji Picker ─── */
const EmojiPicker = ({ visible, isOwn, myReaction, onPick }: { visible: boolean; isOwn: boolean; myReaction?: Emoji; onPick: (emoji: Emoji) => void }) => (
  <div
    className="absolute z-50 flex items-center gap-0.5 rounded-full px-2 py-1.5"
    style={{
      bottom: "calc(100% + 6px)", [isOwn ? "right" : "left"]: 0,
      background: "hsla(330,20%,7%,0.96)", border: "1px solid hsla(315,40%,35%,0.35)",
      backdropFilter: "blur(20px)",
      boxShadow: "0 8px 32px hsla(330,30%,2%,0.7), 0 0 0 1px hsla(315,80%,55%,0.08) inset",
      opacity: visible ? 1 : 0,
      transform: visible ? "scale(1) translateY(0)" : "scale(0.85) translateY(6px)",
      pointerEvents: visible ? "auto" : "none",
      transformOrigin: isOwn ? "bottom right" : "bottom left",
      transition: "opacity 0.18s ease, transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",
    }}
  >
    {EMOJI_LIST.map((emoji) => (
      <button
        key={emoji}
        onClick={(e) => { e.stopPropagation(); onPick(emoji); }}
        className="flex items-center justify-center rounded-full transition-all duration-150 active:scale-90"
        style={{
          width: 34, height: 34, fontSize: 18, lineHeight: 1,
          background: myReaction === emoji ? "hsla(315,80%,40%,0.30)" : "transparent",
          border: myReaction === emoji ? "1px solid hsla(315,60%,55%,0.45)" : "1px solid transparent",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.25)"; (e.currentTarget as HTMLElement).style.background = "hsla(315,50%,30%,0.25)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.background = myReaction === emoji ? "hsla(315,80%,40%,0.30)" : "transparent"; }}
      >
        {emoji}
      </button>
    ))}
  </div>
);

/* ─── Reaction Pills ─── */
const ReactionPills = ({ reactions, myReaction, isOwn, onPick }: { reactions: Partial<Record<Emoji, number>>; myReaction?: Emoji; isOwn: boolean; onPick: (emoji: Emoji) => void }) => {
  const entries = Object.entries(reactions) as [Emoji, number][];
  if (entries.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
      {entries.map(([emoji, count]) => (
        <button
          key={emoji} onClick={() => onPick(emoji)}
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-all duration-200 active:scale-95"
          style={{
            background: myReaction === emoji ? "hsla(315,80%,40%,0.30)" : "hsla(330,15%,10%,0.75)",
            border: myReaction === emoji ? "1px solid hsla(315,60%,55%,0.45)" : "1px solid hsla(315,25%,30%,0.25)",
            color: myReaction === emoji ? "hsl(315,90%,72%)" : "hsl(var(--muted-foreground))",
            boxShadow: myReaction === emoji ? "0 0 8px hsla(315,80%,50%,0.25)" : "none",
            backdropFilter: "blur(8px)", animation: "reaction-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
          }}
        >
          <span style={{ fontSize: 13 }}>{emoji}</span>
          <span className="font-semibold tabular-nums">{count}</span>
        </button>
      ))}
    </div>
  );
};

/* ─── Audio player ─── */
const AudioPlayer = ({ label }: { label: string }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toggle = () => {
    if (playing) { setPlaying(false); if (intervalRef.current) clearInterval(intervalRef.current); }
    else { setPlaying(true); intervalRef.current = setInterval(() => { setProgress((p) => { if (p >= 100) { setPlaying(false); clearInterval(intervalRef.current!); return 0; } return p + 2; }); }, 60); }
  };
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);
  return (
    <div className="flex items-center gap-3 min-w-[160px]">
      <button onClick={toggle} className="rounded-full p-2 shrink-0 transition-transform active:scale-90" style={{ background: "hsla(315,80%,40%,0.25)", border: "1px solid hsla(315,60%,55%,0.25)", color: "hsl(var(--primary))" }}>
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <p className="text-xs font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>{label}</p>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: "hsla(315,30%,30%,0.4)" }}>
          <div className="h-full rounded-full transition-all duration-75" style={{ width: `${progress}%`, background: "linear-gradient(90deg, hsl(315,95%,45%), hsl(315,90%,65%))" }} />
        </div>
      </div>
    </div>
  );
};

/* ─── Pinned banner ─── */
const PinnedBanner = ({ message, onJump }: { message: ChatMessage; onJump: () => void }) => (
  <button onClick={onJump} className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-opacity hover:opacity-80" style={{ background: "hsla(315,80%,40%,0.12)", borderBottom: "1px solid hsla(315,60%,55%,0.15)" }}>
    <Pin size={12} style={{ color: "hsl(315,90%,65%)", flexShrink: 0 }} />
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: "hsl(315,90%,65%)" }}>Pinned Message</p>
      <p className="text-xs truncate" style={{ color: "hsl(var(--muted-foreground))" }}>{message.content}</p>
    </div>
  </button>
);

/* ─── Message bubble ─── */
const MessageBubble = ({
  msg, isOwn, isAdmin, isOwnerUser = false, onPin, onUnpin, onReact, onReply, onScrollTo, onDelete, onEdit, pinnedRef, searchQuery = "",
}: {
  msg: ChatMessage; isOwn: boolean; isAdmin: boolean; isOwnerUser?: boolean;
  onPin: (id: string) => void; onUnpin: (id: string) => void;
  onReact: (id: string, emoji: Emoji) => void; onReply: (msg: ChatMessage) => void;
  onScrollTo: (id: string) => void; onDelete: (id: string) => void;
  onEdit: (id: string, newContent: string) => void;
  pinnedRef?: (el: HTMLDivElement | null) => void; searchQuery?: string;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  const editRef = useRef<HTMLTextAreaElement | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const hoverLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!pickerVisible) return;
    const handler = (e: MouseEvent) => { if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerVisible(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerVisible]);

  const handleTouchStart = () => { longPressTimer.current = setTimeout(() => setPickerVisible(true), 500); };
  const handleTouchEnd = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };
  const showPicker = () => { if (hoverLeaveTimer.current) clearTimeout(hoverLeaveTimer.current); setPickerVisible(true); };
  const hidePicker = () => { hoverLeaveTimer.current = setTimeout(() => setPickerVisible(false), 280); };
  const handleReact = (emoji: Emoji) => { onReact(msg.id, emoji); setPickerVisible(false); };

  const openEdit = () => { setEditDraft(msg.content); setIsEditing(true); setMenuOpen(false); setTimeout(() => { editRef.current?.focus(); editRef.current?.setSelectionRange(msg.content.length, msg.content.length); }, 30); };
  const saveEdit = () => { const trimmed = editDraft.trim(); if (trimmed && trimmed !== msg.content) onEdit(msg.id, trimmed); setIsEditing(false); };
  const cancelEdit = () => setIsEditing(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content).then(() => toast.success("Copied to clipboard"));
    setMenuOpen(false);
  };

  const isOwnerMsg = isOwnerUser || msg.senderRole === "owner";
  const bubbleBg = isOwnerMsg && isOwn ? "hsla(42,40%,12%,0.45)" : isOwn ? "hsla(315,80%,38%,0.35)" : isOwnerMsg ? "hsla(42,30%,8%,0.55)" : "hsla(330,18%,8%,0.75)";
  const bubbleBorder = isOwnerMsg ? "hsla(42,60%,40%,0.3)" : isOwn ? "hsla(315,60%,55%,0.30)" : "hsla(315,30%,25%,0.22)";
  const effectiveRole = isOwnerMsg ? "owner" : msg.senderRole;
  const urls = msg.type === "text" ? extractUrls(msg.content) : [];

  return (
    <div ref={pinnedRef} className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : "flex-row"} items-end group`}>
      {/* Avatar with profile popover */}
      {!isOwn && (
        <UserProfilePopover name={msg.sender} role={effectiveRole} avatar={msg.senderAvatar}>
          <button
            className="rounded-full flex items-center justify-center shrink-0 text-xs font-bold cursor-pointer transition-transform hover:scale-105 overflow-hidden"
            style={{
              width: 30, height: 30,
              background: effectiveRole === "owner" ? "linear-gradient(135deg, hsl(42,70%,45%), hsl(36,60%,32%))" : effectiveRole === "admin" ? "linear-gradient(135deg, hsl(42,100%,52%), hsl(36,90%,40%))" : "hsla(315,80%,40%,0.25)",
              border: effectiveRole === "owner" ? "1.5px solid hsla(42,70%,50%,0.5)" : effectiveRole === "admin" ? "1px solid hsla(44,100%,58%,0.5)" : "1px solid hsla(315,50%,40%,0.3)",
              color: (effectiveRole === "owner" || effectiveRole === "admin") ? "hsl(330,15%,5%)" : "hsl(var(--foreground))",
              boxShadow: effectiveRole === "owner" ? "0 0 12px hsla(42,70%,40%,0.3)" : effectiveRole === "admin" ? "0 0 10px hsla(44,100%,55%,0.4)" : "none",
            }}
          >
            {msg.senderAvatar ? (
              <img src={msg.senderAvatar} alt={msg.sender} className="w-full h-full object-cover" />
            ) : (effectiveRole === "admin" || effectiveRole === "owner") ? <Crown size={12} /> : msg.sender[0].toUpperCase()}
          </button>
        </UserProfilePopover>
      )}

      {/* Bubble column */}
      <div className={`flex flex-col gap-0.5 max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
        {/* Sender name + badge */}
        {!isOwn && (
          <div className="flex items-center gap-1.5 px-1">
            <UserProfilePopover name={msg.sender} role={effectiveRole} avatar={msg.senderAvatar}>
              <button className="text-xs font-semibold cursor-pointer hover:underline" style={{ color: effectiveRole === "owner" ? "hsl(42,75%,60%)" : effectiveRole === "admin" ? "hsl(44,100%,65%)" : "hsl(var(--muted-foreground))" }}>
                {(effectiveRole === "owner" || effectiveRole === "admin") && "👑 "}{msg.sender}
              </button>
            </UserProfilePopover>
            {effectiveRole === "owner" && (
              <span
                className="text-[9px] font-black uppercase tracking-wider rounded-full px-2 py-0.5 leading-none flex items-center gap-1"
                style={{
                  background: "linear-gradient(135deg, hsla(42,60%,20%,0.5), hsla(36,50%,15%,0.5))",
                  border: "1px solid hsla(42,70%,45%,0.35)",
                  color: "hsl(42,75%,60%)",
                  boxShadow: "0 0 10px hsla(42,70%,40%,0.15)",
                }}
              >
                <Crown size={8} style={{ filter: "drop-shadow(0 0 3px hsla(42,80%,55%,0.4))" }} />
                Owner
              </span>
            )}
            {effectiveRole === "admin" && (
              <span
                className="text-[9px] font-black uppercase tracking-wider rounded-full px-1.5 py-0.5 leading-none"
                style={{
                  background: "hsla(44,100%,50%,0.18)",
                  border: "1px solid hsla(44,100%,58%,0.4)",
                  color: "hsl(48,100%,70%)",
                  boxShadow: "0 0 6px hsla(44,100%,55%,0.2)",
                }}
              >
                Admin
              </span>
            )}
          </div>
        )}

        {/* Hover zone */}
        <div className="relative" ref={pickerRef} onMouseEnter={showPicker} onMouseLeave={hidePicker} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <EmojiPicker visible={pickerVisible} isOwn={isOwn} myReaction={msg.myReaction} onPick={handleReact} />

          <div className="rounded-2xl px-3.5 py-2.5 relative" style={{ background: bubbleBg, border: `1px solid ${bubbleBorder}`, backdropFilter: "blur(16px)", boxShadow: isOwnerMsg ? "0 2px 16px hsla(42,60%,35%,0.15)" : isOwn ? "0 4px 20px hsla(315,80%,40%,0.25)" : "0 2px 12px hsla(330,30%,2%,0.5)" }}>
            {msg.pinned && (
              <div className="flex items-center gap-1 mb-1.5">
                <Pin size={9} style={{ color: "hsl(315,90%,65%)" }} />
                <span className="text-xs" style={{ color: "hsl(315,90%,65%)" }}>Pinned</span>
              </div>
            )}
            {msg.quotedMessage && <QuoteBlock quote={msg.quotedMessage} isOwn={isOwn} onScrollTo={onScrollTo} isDeleted={msg.quotedMessage.deleted} />}

            {msg.deleted ? (
              <p className="text-sm italic" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.55 }}>🗑️ Message deleted</p>
            ) : isEditing && msg.type === "text" ? (
              <div className="flex flex-col gap-2" style={{ animation: "reply-slide-in 0.2s cubic-bezier(0.34,1.56,0.64,1) both" }}>
                <textarea ref={editRef} value={editDraft} onChange={(e) => setEditDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === "Escape") cancelEdit(); }}
                  rows={2} className="w-full resize-none rounded-xl px-3 py-2 text-sm leading-relaxed outline-none"
                  style={{ background: "hsla(330,20%,4%,0.85)", border: "1px solid hsla(315,70%,55%,0.5)", color: "hsl(var(--foreground))", fontFamily: "inherit", boxShadow: "0 0 0 3px hsla(315,80%,55%,0.12)" }}
                />
                <div className={`flex gap-1.5 ${isOwn ? "justify-end" : "justify-start"}`}>
                  <button onClick={saveEdit} disabled={!editDraft.trim()} className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all active:scale-95 disabled:opacity-30" style={{ background: "linear-gradient(135deg, hsl(315,95%,45%), hsl(315,85%,58%))", color: "#fff", boxShadow: "0 0 10px hsla(315,90%,55%,0.35)" }}>
                    <Check size={11} /> Save
                  </button>
                  <button onClick={cancelEdit} className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all active:scale-95" style={{ background: "hsla(330,15%,12%,0.8)", color: "hsl(var(--muted-foreground))", border: "1px solid hsla(315,25%,25%,0.3)" }}>
                    <X size={11} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {msg.type === "text" && (
                  <>
                    <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--foreground))" }}>
                      <HighlightText text={msg.content} query={searchQuery} />
                    </p>
                    {urls.map((url, i) => <LinkPreviewCard key={i} url={url} />)}
                  </>
                )}
                {msg.type === "image" && (
                  <div className="flex flex-col gap-1.5">
                    <img src={msg.imagePreview || ""} alt="shared" className="rounded-lg max-w-[220px] max-h-[200px] object-cover" />
                    {msg.content && <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{msg.content}</p>}
                  </div>
                )}
                {msg.type === "audio" && <AudioPlayer label={msg.content} />}
              </>
            )}
          </div>

          {/* ⋮ menu */}
          <button className="absolute top-1 right-1 rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "hsla(330,15%,5%,0.7)" }} onClick={() => setMenuOpen((o) => !o)}>
            <MoreVertical size={11} style={{ color: "hsl(var(--muted-foreground))" }} />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div className="absolute z-50 rounded-xl overflow-hidden shadow-xl" style={{ top: 28, right: 4, minWidth: 140, background: "hsla(330,20%,6%,0.97)", border: "1px solid hsla(315,40%,30%,0.3)", backdropFilter: "blur(20px)" }} onMouseLeave={() => setMenuOpen(false)}>
              <button className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-white/5 transition-colors" style={{ color: "hsl(200,90%,65%)" }} onClick={() => { onReply(msg); setMenuOpen(false); }}>
                <Reply size={12} /> Reply
              </button>
              {msg.type === "text" && !msg.deleted && (
                <button className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-white/5 transition-colors" style={{ color: "hsl(170,70%,60%)" }} onClick={handleCopy}>
                  <Copy size={12} /> Copy
                </button>
              )}
              {isAdmin && (
                !msg.pinned ? (
                  <button className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-white/5 transition-colors" style={{ color: "hsl(315,90%,65%)" }} onClick={() => { onPin(msg.id); setMenuOpen(false); }}>
                    <Pin size={12} /> Pin message
                  </button>
                ) : (
                  <button className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-white/5 transition-colors" style={{ color: "hsl(var(--muted-foreground))" }} onClick={() => { onUnpin(msg.id); setMenuOpen(false); }}>
                    <X size={12} /> Unpin
                  </button>
                )
              )}
              {isOwn && msg.type === "text" && !msg.deleted && (
                <button className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-white/5 transition-colors" style={{ color: "hsl(44,100%,65%)" }} onClick={openEdit}>
                  <Pencil size={12} /> Edit
                </button>
              )}
              {(isOwn || isAdmin) && (
                <button className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-white/5 transition-colors" style={{ color: "hsl(0,75%,62%)" }} onClick={() => { onDelete(msg.id); setMenuOpen(false); }}>
                  <Trash2 size={12} /> Delete
                </button>
              )}
              <button className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-white/5 transition-colors" style={{ color: "hsl(var(--muted-foreground))" }} onClick={() => setMenuOpen(false)}>
                <X size={12} /> Close
              </button>
            </div>
          )}
        </div>

        <ReactionPills reactions={msg.reactions} myReaction={msg.myReaction} isOwn={isOwn} onPick={(e) => onReact(msg.id, e)} />

        <div className="flex items-center gap-1.5 px-1">
          {msg.edited && !msg.deleted && <span className="text-xs italic" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.5 }}>edited</span>}
          <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.55 }}>{timeAgo(msg.timestamp)}</span>
          {isOwn && <CheckCheck size={11} style={{ color: "hsl(var(--primary))", opacity: 0.7 }} />}
        </div>
      </div>
    </div>
  );
};

/* ─── Highlight helper ─── */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} style={{ background: "hsla(44,100%,58%,0.35)", color: "hsl(44,100%,80%)", borderRadius: 3, padding: "0 2px" }}>{part}</mark>
        ) : ( part )
      )}
    </>
  );
}

/* ─── Search bar ─── */
const SearchBar = ({ value, onChange, onClose, onPrev, onNext, matchIndex, matchCount, inputRef }: {
  value: string; onChange: (v: string) => void; onClose: () => void; onPrev: () => void; onNext: () => void; matchIndex: number; matchCount: number; inputRef: React.RefObject<HTMLInputElement>;
}) => (
  <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0" style={{ borderColor: "hsla(315,30%,25%,0.2)", background: "hsla(330,20%,4%,0.7)", animation: "reply-slide-in 0.22s cubic-bezier(0.34,1.56,0.64,1) both" }}>
    <Search size={13} style={{ color: "hsl(315,90%,65%)", flexShrink: 0 }} />
    <input ref={inputRef} value={value} onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") { e.shiftKey ? onPrev() : onNext(); } if (e.key === "Escape") onClose(); }}
      placeholder="Search messages…" className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-40" style={{ color: "hsl(var(--foreground))" }}
    />
    {value && <span className="text-xs tabular-nums shrink-0" style={{ color: "hsl(var(--muted-foreground))" }}>{matchCount === 0 ? "No results" : `${matchIndex + 1} / ${matchCount}`}</span>}
    <button onClick={onPrev} disabled={matchCount === 0} className="rounded-md p-1 transition-opacity hover:opacity-80 disabled:opacity-30" style={{ color: "hsl(var(--muted-foreground))" }} title="Previous match"><ChevronUp size={14} /></button>
    <button onClick={onNext} disabled={matchCount === 0} className="rounded-md p-1 transition-opacity hover:opacity-80 disabled:opacity-30" style={{ color: "hsl(var(--muted-foreground))" }} title="Next match"><ChevronDown size={14} /></button>
    <button onClick={onClose} className="rounded-md p-1 transition-opacity hover:opacity-80" style={{ color: "hsl(var(--muted-foreground))" }} title="Close search"><X size={14} /></button>
  </div>
);

/* ─── DB row → ChatMessage mapper ─── */
function dbRowToMessage(row: any, quotedRow?: any): ChatMessage {
  return {
    id: row.id,
    type: (row.type || "text") as MessageType,
    content: row.content || "",
    sender: row.sender_name,
    senderRole: (row.sender_role || "user") as SenderRole,
    senderId: row.user_id,
    senderAvatar: row.sender_avatar_url || undefined,
    timestamp: new Date(row.created_at),
    pinned: row.pinned || false,
    deleted: row.deleted || false,
    edited: row.edited || false,
    imagePreview: row.image_url || undefined,
    reactions: {},
    quotedMessage: quotedRow ? {
      id: quotedRow.id,
      sender: quotedRow.sender_name,
      senderRole: (quotedRow.sender_role || "user") as SenderRole,
      content: quotedRow.content || "",
      type: (quotedRow.type || "text") as MessageType,
      deleted: quotedRow.deleted || false,
    } : undefined,
  };
}

/* ═══════════════════════════════════════════════════════════ */
const ChatPage = () => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchIdx, setSearchMatchIdx] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [ownerUserIds, setOwnerUserIds] = useState<Set<string>>(new Set());

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pinnedMsgRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const msgRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const myName = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ""}`
    : profile?.username || "User";
  const myId = user?.id || "";

  const pinnedMessage = messages.find((m) => m.pinned && !m.deleted) ?? null;

  // Derive unique members from messages
  const chatMembers = useMemo(() => {
    const seen = new Map<string, { name: string; role: SenderRole; online: boolean; avatar?: string }>();
    messages.forEach((m) => {
      if (!seen.has(m.senderId)) {
        seen.set(m.senderId, { name: m.sender, role: m.senderRole, online: true, avatar: m.senderAvatar });
      }
    });
    return Array.from(seen.values());
  }, [messages]);

  /* ── Check admin & owner role ── */
  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      setIsAdmin(!!data);
    });
    (async () => {
      const { data: ownerRole } = await supabase.rpc("has_role", { _user_id: user.id, _role: "owner" });
      const { data: isPrimary } = await supabase.rpc("is_primary_owner", { _user_id: user.id });
      setIsOwner(!!ownerRole || !!isPrimary);
    })();
  }, [user]);

  /* ── Fetch all owner user IDs for badge display ── */
  const senderIds = useMemo(() => {
    const ids = new Set(messages.map((m) => m.senderId));
    if (user) ids.add(user.id);
    return Array.from(ids);
  }, [messages.length, user]);

  useEffect(() => {
    if (senderIds.length === 0) return;
    (async () => {
      const ids = new Set<string>();
      // Get users with owner role
      const { data: ownerRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "owner");
      (ownerRoles || []).forEach((r: any) => ids.add(r.user_id));

      // Check remaining senders for primary owner
      const remaining = senderIds.filter((id) => !ids.has(id));
      const checks = await Promise.all(
        remaining.map((id) => supabase.rpc("is_primary_owner", { _user_id: id }).then(({ data }) => ({ id, isPrimary: !!data })))
      );
      checks.forEach(({ id, isPrimary }) => { if (isPrimary) ids.add(id); });
      setOwnerUserIds(ids);
    })();
  }, [senderIds.join(",")]);

  /* ── Load messages from DB ── */
  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      // Load messages with a manual join for quoted messages
      const { data: rows, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) {
        console.error("Failed to load messages:", error);
        setLoading(false);
        return;
      }

      if (!rows || rows.length === 0) {
        setMessages([]);
        setLoading(false);
        return;
      }

      // Build a map for quoted messages
      const rowMap = new Map<string, any>();
      rows.forEach((r: any) => rowMap.set(r.id, r));

      const mapped = rows.map((r: any) => {
        const quotedRow = r.quoted_message_id ? rowMap.get(r.quoted_message_id) : undefined;
        return dbRowToMessage(r, quotedRow);
      });

      setMessages(mapped);
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "auto" }), 100);
    };

    loadMessages();
  }, []);

  /* ── Realtime subscription ── */
  useEffect(() => {
    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as any;
          // Don't add if we already have it (optimistic)
          setMessages((prev) => {
            if (prev.find((m) => m.id === row.id)) return prev;
            const msg = dbRowToMessage(row);
            // Try to resolve quoted message from existing messages
            if (row.quoted_message_id) {
              const quoted = prev.find((m) => m.id === row.quoted_message_id);
              if (quoted) {
                msg.quotedMessage = {
                  id: quoted.id,
                  sender: quoted.sender,
                  senderRole: quoted.senderRole,
                  content: quoted.content,
                  type: quoted.type,
                  deleted: quoted.deleted,
                };
              }
            }
            return [...prev, msg];
          });
          // Increment unread if scrolled up
          if (showScrollBtn && row.user_id !== myId) {
            setUnreadCount((c) => c + 1);
          }
          setTimeout(() => {
            if (!showScrollBtn) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 50);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as any;
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === row.id) {
                return { ...m, content: row.content, deleted: row.deleted, edited: row.edited, pinned: row.pinned };
              }
              // Update quoted references
              if (m.quotedMessage?.id === row.id) {
                return { ...m, quotedMessage: { ...m.quotedMessage, content: row.content, deleted: row.deleted } };
              }
              return m;
            })
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        (payload) => {
          const oldRow = payload.old as any;
          setMessages((prev) => prev.filter((m) => m.id !== oldRow.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myId, showScrollBtn]);

  /* ── Scroll listener ── */
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handler = () => {
      const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollBtn(distFromBottom > 200);
      if (distFromBottom <= 200) setUnreadCount(0);
    };
    container.addEventListener("scroll", handler);
    return () => container.removeEventListener("scroll", handler);
  }, []);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setUnreadCount(0);
  };

  /* ── Search ── */
  const matchIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [] as string[];
    return messages.filter((m) => m.type === "text" && !m.deleted && m.content.toLowerCase().includes(q)).map((m) => m.id);
  }, [messages, searchQuery]);

  useEffect(() => {
    if (matchIds.length === 0) return;
    const id = matchIds[searchMatchIdx];
    const el = msgRefs.current.get(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [matchIds, searchMatchIdx]);

  const openSearch = () => { setSearchOpen(true); setSearchQuery(""); setSearchMatchIdx(0); setTimeout(() => searchInputRef.current?.focus(), 60); };
  const closeSearch = () => { setSearchOpen(false); setSearchQuery(""); setSearchMatchIdx(0); };
  const searchNext = () => { if (matchIds.length) setSearchMatchIdx((i) => (i + 1) % matchIds.length); };
  const searchPrev = () => { if (matchIds.length) setSearchMatchIdx((i) => (i - 1 + matchIds.length) % matchIds.length); };
  useEffect(() => { setSearchMatchIdx(0); }, [searchQuery]);

  useEffect(() => { if (replyTarget) textareaRef.current?.focus(); }, [replyTarget]);

  /* ── Mute toggle ── */
  const toggleMute = () => {
    setIsMuted((m) => {
      toast(m ? "🔔 Notifications unmuted" : "🔕 Notifications muted");
      return !m;
    });
  };

  /* ── Send text ── */
  const sendText = async () => {
    const t = text.trim();
    if (!t || !user) return;

    const senderRole: SenderRole = isOwner ? "owner" : isAdmin ? "admin" : "user";
    const quotedId = replyTarget?.id || null;

    setText("");
    setReplyTarget(null);

    const { data: inserted, error } = await supabase.from("messages").insert({
      user_id: user.id,
      content: t,
      type: "text",
      sender_name: myName,
      sender_role: senderRole,
      sender_avatar_url: profile?.avatar_url || null,
      quoted_message_id: quotedId,
    } as any).select().single();

    if (error) {
      toast.error("Failed to send message");
      console.error(error);
    } else if (inserted) {
      // Immediately add the message to state so it shows without waiting for realtime
      setMessages((prev) => {
        if (prev.find((m) => m.id === (inserted as any).id)) return prev;
        const msg = dbRowToMessage(inserted, replyTarget ? {
          id: replyTarget.id,
          sender_name: replyTarget.sender,
          sender_role: replyTarget.senderRole,
          content: replyTarget.content,
          type: replyTarget.type,
          deleted: replyTarget.deleted,
        } : undefined);
        return [...prev, msg];
      });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); }
    if (e.key === "Escape") setReplyTarget(null);
  };

  /* Image — still client-side for now */
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const imageData = ev.target?.result as string;
      const senderRole: SenderRole = isAdmin ? "admin" : "user";
      const { data: inserted, error } = await supabase.from("messages").insert({
        user_id: user.id,
        content: file.name,
        type: "image",
        image_url: imageData,
        sender_name: myName,
        sender_role: senderRole,
        sender_avatar_url: profile?.avatar_url || null,
        quoted_message_id: replyTarget?.id || null,
      } as any).select().single();
      if (!error && inserted) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === (inserted as any).id)) return prev;
          return [...prev, dbRowToMessage(inserted)];
        });
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
      setReplyTarget(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  /* Audio */
  const startRecording = () => { setIsRecording(true); setRecordingMs(0); recordTimer.current = setInterval(() => setRecordingMs((ms) => ms + 100), 100); };
  const stopRecording = async () => {
    if (!isRecording || !user) return;
    setIsRecording(false);
    if (recordTimer.current) clearInterval(recordTimer.current);
    const duration = (recordingMs / 1000).toFixed(1);
    const senderRole: SenderRole = isAdmin ? "admin" : "user";
    await supabase.from("messages").insert({
      user_id: user.id,
      content: `Voice message (${duration}s)`,
      type: "audio",
      sender_name: myName,
      sender_role: senderRole,
      sender_avatar_url: profile?.avatar_url || null,
      quoted_message_id: replyTarget?.id || null,
    } as any);
    setRecordingMs(0);
    setReplyTarget(null);
  };

  /* Pin / Unpin — DB update */
  const pinMessage = async (id: string) => {
    await supabase.from("messages").update({ pinned: true } as any).eq("id", id);
  };
  const unpinMessage = async (id: string) => {
    await supabase.from("messages").update({ pinned: false } as any).eq("id", id);
  };

  /* Delete — soft delete in DB */
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const deleteMessage = useCallback(async (id: string) => {
    setDeletingIds((prev) => new Set([...prev, id]));
    setTimeout(async () => {
      setDeletingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      await supabase.from("messages").update({ deleted: true, pinned: false } as any).eq("id", id);
    }, 350);
  }, []);

  /* Edit — DB update */
  const editMessage = useCallback(async (id: string, newContent: string) => {
    await supabase.from("messages").update({ content: newContent, edited: true } as any).eq("id", id);
  }, []);

  /* React — client-side only for now */
  const reactToMessage = useCallback((msgId: string, emoji: Emoji) => {
    setMessages((prev) => prev.map((m) => {
      if (m.id !== msgId) return m;
      const prev_r = m.myReaction; const nr = { ...m.reactions };
      if (prev_r && prev_r !== emoji) { nr[prev_r] = Math.max((nr[prev_r] ?? 1) - 1, 0); if (nr[prev_r] === 0) delete nr[prev_r]; }
      if (prev_r === emoji) { nr[emoji] = Math.max((nr[emoji] ?? 1) - 1, 0); if (nr[emoji] === 0) delete nr[emoji]; return { ...m, reactions: nr, myReaction: undefined }; }
      nr[emoji] = (nr[emoji] ?? 0) + 1; return { ...m, reactions: nr, myReaction: emoji };
    }));
  }, []);

  /* Scroll to quoted message */
  const scrollToMessage = (id: string) => {
    const el = msgRefs.current.get(id); if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.style.transition = "background 0.15s ease";
    el.style.background = "hsla(315,80%,40%,0.18)";
    setTimeout(() => { el.style.background = ""; }, 900);
  };

  const scrollToPinned = () => pinnedMsgRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div className="flex flex-col h-full" style={{ height: "100%" }}>
      <div className="overflow-hidden flex flex-col relative" style={{ flex: 1, minHeight: 0, background: "hsla(330,18%,4%,0.6)", borderBottom: "1px solid hsla(315,30%,25%,0.2)" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b shrink-0" style={{ borderColor: "hsla(315,30%,25%,0.2)" }}>
          <div className="rounded-xl p-2" style={{ background: "hsla(315,80%,40%,0.15)" }}>
            <MessageCircle size={15} style={{ color: "hsl(var(--primary))", filter: "drop-shadow(0 0 5px hsla(315,90%,60%,0.55))" }} />
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
              Community Chat
            </p>
            {isMuted && (
              <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: "hsla(0,0%,50%,0.15)", color: "hsl(var(--muted-foreground))", fontSize: 10 }}>
                Muted
              </span>
            )}
          </div>
          <div className="flex-1" />

          <button onClick={toggleMute} className="rounded-xl p-2 transition-all hover:opacity-80 active:scale-90" style={{ background: isMuted ? "hsla(0,0%,50%,0.15)" : "transparent", border: "1px solid transparent", color: "hsl(var(--muted-foreground))" }} title={isMuted ? "Unmute" : "Mute"}>
            {isMuted ? <BellOff size={14} /> : <Bell size={14} />}
          </button>

          <button onClick={searchOpen ? closeSearch : openSearch} className="rounded-xl p-2 transition-all hover:opacity-80 active:scale-90" style={{ background: searchOpen ? "hsla(315,80%,40%,0.25)" : "transparent", border: searchOpen ? "1px solid hsla(315,60%,55%,0.35)" : "1px solid transparent", color: searchOpen ? "hsl(315,90%,65%)" : "hsl(var(--muted-foreground))" }} title="Search messages">
            <Search size={14} />
          </button>

          <button onClick={() => setShowMembers(true)} className="rounded-xl p-2 transition-all hover:opacity-80 active:scale-90" style={{ background: "transparent", border: "1px solid transparent", color: "hsl(var(--muted-foreground))" }} title="Group info">
            <Users size={14} />
          </button>

          <div className="flex items-center gap-1.5 ml-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "hsl(142,70%,55%)" }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "hsl(142,70%,55%)" }} />
            </span>
            <span className="text-xs font-medium" style={{ color: "hsl(142,70%,55%)" }}>{chatMembers.length} online</span>
          </div>
        </div>

        {/* Search bar */}
        {searchOpen && <SearchBar value={searchQuery} onChange={setSearchQuery} onClose={closeSearch} onPrev={searchPrev} onNext={searchNext} matchIndex={searchMatchIdx} matchCount={matchIds.length} inputRef={searchInputRef} />}

        {/* Pinned banner */}
        {pinnedMessage && <PinnedBanner message={pinnedMessage} onJump={scrollToPinned} />}

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 min-h-0"
          style={{ scrollbarWidth: "thin", scrollbarColor: "hsla(315,40%,30%,0.3) transparent" }}
        >
          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="flex items-center gap-3">
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{ display: "block", width: 8, height: 8, borderRadius: "50%", background: "hsl(315,90%,65%)", animation: `typing-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
                <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Loading messages…</span>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3">
              <MessageCircle size={40} style={{ color: "hsl(var(--muted-foreground))", opacity: 0.3 }} />
              <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMatch = matchIds.includes(msg.id);
              const isActive = isMatch && matchIds[searchMatchIdx] === msg.id;
              return (
                <div key={msg.id}>
                  <div
                    ref={(el) => {
                      if (el) msgRefs.current.set(msg.id, el); else msgRefs.current.delete(msg.id);
                      if (msg.pinned && el) pinnedMsgRef.current = el;
                    }}
                    style={{
                      borderRadius: 16, transition: "background 0.4s ease, box-shadow 0.3s ease",
                      ...(deletingIds.has(msg.id) ? { animation: "msg-delete-out 0.35s cubic-bezier(0.4,0,1,1) both", pointerEvents: "none" as const } : {}),
                      ...(isActive ? { boxShadow: "0 0 0 2px hsl(44,100%,58%), 0 0 18px hsla(44,100%,55%,0.25)" } : isMatch ? { boxShadow: "0 0 0 1.5px hsla(44,100%,58%,0.45)" } : {}),
                    }}
                  >
                    <MessageBubble
                      msg={msg} isOwn={msg.senderId === myId} isAdmin={isAdmin}
                      isOwnerUser={ownerUserIds.has(msg.senderId)}
                      onPin={pinMessage} onUnpin={unpinMessage} onReact={reactToMessage}
                      onReply={setReplyTarget} onScrollTo={scrollToMessage}
                      onDelete={deleteMessage} onEdit={editMessage}
                      searchQuery={searchOpen ? searchQuery : ""}
                    />
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Scroll to bottom FAB */}
        {showScrollBtn && <ScrollToBottomButton unreadCount={unreadCount} onClick={scrollToBottom} />}

        {/* Input bar */}
        <div className="px-4 pb-3 pt-2 border-t shrink-0" style={{ borderColor: "hsla(315,30%,25%,0.2)" }}>
          {replyTarget && !isRecording && (
            <QuotePreviewBar quote={{ id: replyTarget.id, sender: replyTarget.sender, senderRole: replyTarget.senderRole, content: quotePreview(replyTarget), type: replyTarget.type }} onCancel={() => setReplyTarget(null)} />
          )}

          {isRecording ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "hsla(315,80%,30%,0.18)", border: "1px solid hsla(315,70%,55%,0.3)" }}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "hsl(0,80%,60%)" }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "hsl(0,80%,60%)" }} />
                </span>
                <span className="text-sm font-mono" style={{ color: "hsl(var(--foreground))" }}>Recording… {(recordingMs / 1000).toFixed(1)}s</span>
              </div>
              <button onClick={stopRecording} className="rounded-xl p-3 transition-transform active:scale-95" style={{ background: "linear-gradient(135deg, hsl(315,95%,45%), hsl(315,85%,55%))", boxShadow: "0 0 16px hsla(315,90%,55%,0.45)" }}>
                <Check size={16} style={{ color: "#fff" }} />
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="rounded-xl p-2.5 shrink-0 transition-all active:scale-90 hover:opacity-80" style={{ background: "hsla(315,60%,30%,0.2)", border: "1px solid hsla(315,40%,40%,0.2)", color: "hsl(var(--muted-foreground))" }} title="Share image">
                <ImageIcon size={16} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

              <textarea ref={textareaRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={replyTarget ? `Replying to ${replyTarget.sender}…` : "Type a message…"} rows={1}
                className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm leading-relaxed glass-input" style={{ color: "hsl(var(--foreground))", minHeight: 42, maxHeight: 100, fontFamily: "inherit" }}
              />

              <button onMouseDown={startRecording} onTouchStart={startRecording} className="rounded-xl p-2.5 shrink-0 transition-all active:scale-90 hover:opacity-80" style={{ background: "hsla(315,60%,30%,0.2)", border: "1px solid hsla(315,40%,40%,0.2)", color: "hsl(var(--muted-foreground))" }} title="Hold to record audio">
                <Mic size={16} />
              </button>

              <button onClick={sendText} disabled={!text.trim()} className="rounded-xl p-2.5 shrink-0 transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: text.trim() ? "linear-gradient(135deg, hsl(315,95%,45%), hsl(315,85%,58%))" : "hsla(315,40%,20%,0.3)", border: "1px solid hsla(315,60%,55%,0.25)", boxShadow: text.trim() ? "0 0 14px hsla(315,90%,55%,0.4)" : "none", color: "#fff" }}>
                <Send size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals & Panels */}
      {showMembers && <MemberPanel members={chatMembers} onClose={() => setShowMembers(false)} />}
    </div>
  );
};

export default ChatPage;
