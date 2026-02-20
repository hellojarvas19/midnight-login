import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle, Send, Image as ImageIcon, Mic,
  Pin, X, Play, Pause, MoreVertical, Check, CheckCheck,
  Crown, Reply,
} from "lucide-react";

/* ─── Types ─── */
type MessageType = "text" | "image" | "audio";
type SenderRole  = "user" | "admin";
type Emoji       = "👍" | "❤️" | "😂" | "🔥";

const EMOJI_LIST: Emoji[] = ["👍", "❤️", "😂", "🔥"];

interface QuotedMessage {
  id: string;
  sender: string;
  senderRole: SenderRole;
  content: string;        // truncated preview text
  type: MessageType;
}

interface ChatMessage {
  id: string;
  type: MessageType;
  content: string;
  sender: string;
  senderRole: SenderRole;
  timestamp: Date;
  pinned?: boolean;
  imagePreview?: string;
  reactions: Partial<Record<Emoji, number>>;
  myReaction?: Emoji;
  quotedMessage?: QuotedMessage;
}

/* ─── Seed messages ─── */
const SEED: ChatMessage[] = [
  {
    id: "m1", type: "text",
    content: "Welcome to the 0xAdam Checker community chat! 👾",
    sender: "0xAdam", senderRole: "admin",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    pinned: true, reactions: { "🔥": 5, "👍": 3 },
  },
  {
    id: "m2", type: "text",
    content: "Hey! Just got my Pro plan, the checker is insane 🔥",
    sender: "CryptoZero", senderRole: "user",
    timestamp: new Date(Date.now() - 1000 * 60 * 18),
    reactions: { "❤️": 2 },
  },
  {
    id: "m3", type: "text",
    content: "Glad to have you onboard. Use /help in the bot to get started.",
    sender: "0xAdam", senderRole: "admin",
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    reactions: {},
    quotedMessage: {
      id: "m2", sender: "CryptoZero", senderRole: "user",
      content: "Hey! Just got my Pro plan, the checker is insane 🔥",
      type: "text",
    },
  },
  {
    id: "m4", type: "text",
    content: "What gateways are best for EU bins?",
    sender: "NightCoder", senderRole: "user",
    timestamp: new Date(Date.now() - 1000 * 60 * 8),
    reactions: { "😂": 1 },
  },
  {
    id: "m5", type: "text",
    content: "Try Stripe or Braintree for EU — they have lower decline rates on non-3DS bins.",
    sender: "0xAdam", senderRole: "admin",
    timestamp: new Date(Date.now() - 1000 * 60 * 6),
    reactions: { "👍": 4, "🔥": 2 },
    quotedMessage: {
      id: "m4", sender: "NightCoder", senderRole: "user",
      content: "What gateways are best for EU bins?",
      type: "text",
    },
  },
];

/* ─── Helpers ─── */
function timeAgo(date: Date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

function quotePreview(msg: ChatMessage): string {
  if (msg.type === "image") return "📷 Image";
  if (msg.type === "audio") return "🎤 Voice message";
  return msg.content.length > 80 ? msg.content.slice(0, 80) + "…" : msg.content;
}

let _mid = 100;
const uid = () => `m${_mid++}`;

const IS_ADMIN = true;
const MY_NAME  = "0xAdam";

/* ─── Quote block inside a bubble ─── */
const QuoteBlock = ({
  quote,
  isOwn,
  onScrollTo,
}: {
  quote: QuotedMessage;
  isOwn: boolean;
  onScrollTo?: (id: string) => void;
}) => {
  const isAdmin = quote.senderRole === "admin";
  const accentColor = isAdmin ? "hsl(44,100%,60%)" : "hsl(315,90%,65%)";

  return (
    <button
      onClick={() => onScrollTo?.(quote.id)}
      className="w-full text-left flex gap-2.5 rounded-xl px-3 py-2 mb-2 transition-opacity hover:opacity-80 active:opacity-60"
      style={{
        background: isOwn ? "hsla(315,80%,20%,0.28)" : "hsla(330,15%,4%,0.6)",
        borderLeft: `3px solid ${accentColor}`,
      }}
    >
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-semibold mb-0.5 truncate"
          style={{ color: accentColor }}
        >
          {isAdmin ? "👑 " : ""}{quote.sender}
        </p>
        <p className="text-xs truncate" style={{ color: "hsl(var(--muted-foreground))" }}>
          {quote.type === "image" ? "📷 Image" : quote.type === "audio" ? "🎤 Voice message" : quote.content}
        </p>
      </div>
    </button>
  );
};

/* ─── Quote preview strip in input area ─── */
const QuotePreviewBar = ({
  quote,
  onCancel,
}: {
  quote: QuotedMessage;
  onCancel: () => void;
}) => {
  const isAdmin   = quote.senderRole === "admin";
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
        <p className="text-xs font-semibold truncate" style={{ color: accentColor }}>
          {isAdmin ? "👑 " : ""}{quote.sender}
        </p>
        <p className="text-xs truncate" style={{ color: "hsl(var(--muted-foreground))" }}>
          {quote.type === "image" ? "📷 Image" : quote.type === "audio" ? "🎤 Voice message" : quote.content}
        </p>
      </div>
      <button
        onClick={onCancel}
        className="rounded-full p-1 transition-opacity hover:opacity-70 active:scale-90"
        style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0 }}
        title="Cancel reply"
      >
        <X size={13} />
      </button>
    </div>
  );
};

/* ─── Emoji Picker ─── */
const EmojiPicker = ({
  visible,
  isOwn,
  myReaction,
  onPick,
}: {
  visible: boolean;
  isOwn: boolean;
  myReaction?: Emoji;
  onPick: (emoji: Emoji) => void;
}) => (
  <div
    className="absolute z-50 flex items-center gap-0.5 rounded-full px-2 py-1.5"
    style={{
      bottom: "calc(100% + 6px)",
      [isOwn ? "right" : "left"]: 0,
      background: "hsla(330,20%,7%,0.96)",
      border: "1px solid hsla(315,40%,35%,0.35)",
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
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "scale(1.25)";
          (e.currentTarget as HTMLElement).style.background = "hsla(315,50%,30%,0.25)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "scale(1)";
          (e.currentTarget as HTMLElement).style.background =
            myReaction === emoji ? "hsla(315,80%,40%,0.30)" : "transparent";
        }}
      >
        {emoji}
      </button>
    ))}
  </div>
);

/* ─── Reaction Pills ─── */
const ReactionPills = ({
  reactions, myReaction, isOwn, onPick,
}: {
  reactions: Partial<Record<Emoji, number>>;
  myReaction?: Emoji;
  isOwn: boolean;
  onPick: (emoji: Emoji) => void;
}) => {
  const entries = Object.entries(reactions) as [Emoji, number][];
  if (entries.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
      {entries.map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => onPick(emoji)}
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-all duration-200 active:scale-95"
          style={{
            background: myReaction === emoji ? "hsla(315,80%,40%,0.30)" : "hsla(330,15%,10%,0.75)",
            border: myReaction === emoji ? "1px solid hsla(315,60%,55%,0.45)" : "1px solid hsla(315,25%,30%,0.25)",
            color: myReaction === emoji ? "hsl(315,90%,72%)" : "hsl(var(--muted-foreground))",
            boxShadow: myReaction === emoji ? "0 0 8px hsla(315,80%,50%,0.25)" : "none",
            backdropFilter: "blur(8px)",
            animation: "reaction-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
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
    if (playing) {
      setPlaying(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      setPlaying(true);
      intervalRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) { setPlaying(false); clearInterval(intervalRef.current!); return 0; }
          return p + 2;
        });
      }, 60);
    }
  };
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);
  return (
    <div className="flex items-center gap-3 min-w-[160px]">
      <button
        onClick={toggle}
        className="rounded-full p-2 shrink-0 transition-transform active:scale-90"
        style={{ background: "hsla(315,80%,40%,0.25)", border: "1px solid hsla(315,60%,55%,0.25)", color: "hsl(var(--primary))" }}
      >
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <p className="text-xs font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>{label}</p>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: "hsla(315,30%,30%,0.4)" }}>
          <div className="h-full rounded-full transition-all duration-75"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg, hsl(315,95%,45%), hsl(315,90%,65%))" }} />
        </div>
      </div>
    </div>
  );
};

/* ─── Pinned banner ─── */
const PinnedBanner = ({ message, onJump }: { message: ChatMessage; onJump: () => void }) => (
  <button
    onClick={onJump}
    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-opacity hover:opacity-80"
    style={{ background: "hsla(315,80%,40%,0.12)", borderBottom: "1px solid hsla(315,60%,55%,0.15)" }}
  >
    <Pin size={12} style={{ color: "hsl(315,90%,65%)", flexShrink: 0 }} />
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: "hsl(315,90%,65%)" }}>Pinned Message</p>
      <p className="text-xs truncate" style={{ color: "hsl(var(--muted-foreground))" }}>{message.content}</p>
    </div>
  </button>
);

/* ─── Message bubble ─── */
const MessageBubble = ({
  msg, isOwn, isAdmin, onPin, onUnpin, onReact, onReply, onScrollTo, pinnedRef,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  isAdmin: boolean;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
  onReact: (id: string, emoji: Emoji) => void;
  onReply: (msg: ChatMessage) => void;
  onScrollTo: (id: string) => void;
  pinnedRef?: (el: HTMLDivElement | null) => void;
}) => {
  const [menuOpen, setMenuOpen]           = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const longPressTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerRef       = useRef<HTMLDivElement | null>(null);
  const hoverLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!pickerVisible) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerVisible(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerVisible]);

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => setPickerVisible(true), 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };
  const showPicker = () => {
    if (hoverLeaveTimer.current) clearTimeout(hoverLeaveTimer.current);
    setPickerVisible(true);
  };
  const hidePicker = () => {
    hoverLeaveTimer.current = setTimeout(() => setPickerVisible(false), 280);
  };

  const handleReact = (emoji: Emoji) => { onReact(msg.id, emoji); setPickerVisible(false); };

  const bubbleBg     = isOwn ? "hsla(315,80%,38%,0.35)" : "hsla(330,18%,8%,0.75)";
  const bubbleBorder = isOwn ? "hsla(315,60%,55%,0.30)"  : "hsla(315,30%,25%,0.22)";

  return (
    <div
      ref={pinnedRef}
      className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : "flex-row"} items-end group`}
    >
      {/* Avatar */}
      {!isOwn && (
        <div
          className="rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
          style={{
            width: 30, height: 30,
            background: msg.senderRole === "admin" ? "linear-gradient(135deg, hsl(42,100%,52%), hsl(36,90%,40%))" : "hsla(315,80%,40%,0.25)",
            border: msg.senderRole === "admin" ? "1px solid hsla(44,100%,58%,0.5)" : "1px solid hsla(315,50%,40%,0.3)",
            color: msg.senderRole === "admin" ? "hsl(330,15%,5%)" : "hsl(var(--foreground))",
            boxShadow: msg.senderRole === "admin" ? "0 0 10px hsla(44,100%,55%,0.4)" : "none",
          }}
        >
          {msg.senderRole === "admin" ? <Crown size={12} /> : msg.sender[0].toUpperCase()}
        </div>
      )}

      {/* Bubble column */}
      <div className={`flex flex-col gap-0.5 max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
        {!isOwn && (
          <p className="text-xs font-semibold px-1"
            style={{ color: msg.senderRole === "admin" ? "hsl(44,100%,65%)" : "hsl(var(--muted-foreground))" }}>
            {msg.senderRole === "admin" && "👑 "}{msg.sender}
          </p>
        )}

        {/* Hover zone — emoji picker + bubble + context menu */}
        <div
          className="relative"
          ref={pickerRef}
          onMouseEnter={showPicker}
          onMouseLeave={hidePicker}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <EmojiPicker visible={pickerVisible} isOwn={isOwn} myReaction={msg.myReaction} onPick={handleReact} />

          {/* ── Bubble ── */}
          <div
            className="rounded-2xl px-3.5 py-2.5 relative"
            style={{
              background: bubbleBg,
              border: `1px solid ${bubbleBorder}`,
              backdropFilter: "blur(16px)",
              boxShadow: isOwn ? "0 4px 20px hsla(315,80%,40%,0.25)" : "0 2px 12px hsla(330,30%,2%,0.5)",
            }}
          >
            {/* Pinned indicator */}
            {msg.pinned && (
              <div className="flex items-center gap-1 mb-1.5">
                <Pin size={9} style={{ color: "hsl(315,90%,65%)" }} />
                <span className="text-xs" style={{ color: "hsl(315,90%,65%)" }}>Pinned</span>
              </div>
            )}

            {/* ── Quoted block ── */}
            {msg.quotedMessage && (
              <QuoteBlock quote={msg.quotedMessage} isOwn={isOwn} onScrollTo={onScrollTo} />
            )}

            {msg.type === "text" && (
              <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--foreground))" }}>{msg.content}</p>
            )}
            {msg.type === "image" && (
              <div className="flex flex-col gap-1.5">
                <img src={msg.imagePreview || ""} alt="shared" className="rounded-lg max-w-[220px] max-h-[200px] object-cover" />
                {msg.content && <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{msg.content}</p>}
              </div>
            )}
            {msg.type === "audio" && <AudioPlayer label={msg.content} />}
          </div>

          {/* ⋮ menu button */}
          <button
            className="absolute top-1 right-1 rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "hsla(330,15%,5%,0.7)" }}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <MoreVertical size={11} style={{ color: "hsl(var(--muted-foreground))" }} />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div
              className="absolute z-50 rounded-xl overflow-hidden shadow-xl"
              style={{
                top: 28, right: 4, minWidth: 140,
                background: "hsla(330,20%,6%,0.97)",
                border: "1px solid hsla(315,40%,30%,0.3)",
                backdropFilter: "blur(20px)",
              }}
              onMouseLeave={() => setMenuOpen(false)}
            >
              {/* Reply */}
              <button
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-white/5 transition-colors"
                style={{ color: "hsl(200,90%,65%)" }}
                onClick={() => { onReply(msg); setMenuOpen(false); }}
              >
                <Reply size={12} /> Reply
              </button>

              {/* Pin / Unpin (admin only) */}
              {isAdmin && (
                !msg.pinned ? (
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-white/5 transition-colors"
                    style={{ color: "hsl(315,90%,65%)" }}
                    onClick={() => { onPin(msg.id); setMenuOpen(false); }}
                  >
                    <Pin size={12} /> Pin message
                  </button>
                ) : (
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-white/5 transition-colors"
                    style={{ color: "hsl(var(--muted-foreground))" }}
                    onClick={() => { onUnpin(msg.id); setMenuOpen(false); }}
                  >
                    <X size={12} /> Unpin
                  </button>
                )
              )}

              <button
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-white/5 transition-colors"
                style={{ color: "hsl(var(--muted-foreground))" }}
                onClick={() => setMenuOpen(false)}
              >
                <X size={12} /> Close
              </button>
            </div>
          )}
        </div>

        {/* Reaction pills */}
        <ReactionPills reactions={msg.reactions} myReaction={msg.myReaction} isOwn={isOwn} onPick={(e) => onReact(msg.id, e)} />

        {/* Timestamp */}
        <div className="flex items-center gap-1 px-1">
          <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.55 }}>
            {timeAgo(msg.timestamp)}
          </span>
          {isOwn && <CheckCheck size={11} style={{ color: "hsl(var(--primary))", opacity: 0.7 }} />}
        </div>
      </div>
    </div>
  );
};

/* ─── Main page ─── */
const ChatPage = () => {
  const [messages, setMessages]           = useState<ChatMessage[]>(SEED);
  const [text, setText]                   = useState("");
  const [isRecording, setIsRecording]     = useState(false);
  const [recordingMs, setRecordingMs]     = useState(0);
  const [replyTarget, setReplyTarget]     = useState<ChatMessage | null>(null);
  const bottomRef    = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recordTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const pinnedMsgRef = useRef<HTMLDivElement | null>(null);
  const textareaRef  = useRef<HTMLTextAreaElement | null>(null);
  /* map of messageId → DOM element for scroll-to-quote */
  const msgRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const pinnedMessage = messages.find((m) => m.pinned) ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* Focus textarea when reply is set */
  useEffect(() => {
    if (replyTarget) textareaRef.current?.focus();
  }, [replyTarget]);

  /* Send */
  const sendText = () => {
    const t = text.trim();
    if (!t) return;
    const quoted: QuotedMessage | undefined = replyTarget
      ? {
          id:         replyTarget.id,
          sender:     replyTarget.sender,
          senderRole: replyTarget.senderRole,
          content:    quotePreview(replyTarget),
          type:       replyTarget.type,
        }
      : undefined;
    setMessages((prev) => [
      ...prev,
      {
        id: uid(), type: "text", content: t,
        sender: MY_NAME, senderRole: IS_ADMIN ? "admin" : "user",
        timestamp: new Date(), reactions: {},
        quotedMessage: quoted,
      },
    ]);
    setText("");
    setReplyTarget(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); }
    if (e.key === "Escape") setReplyTarget(null);
  };

  /* Image */
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const quoted: QuotedMessage | undefined = replyTarget
        ? { id: replyTarget.id, sender: replyTarget.sender, senderRole: replyTarget.senderRole, content: quotePreview(replyTarget), type: replyTarget.type }
        : undefined;
      setMessages((prev) => [
        ...prev,
        {
          id: uid(), type: "image", content: file.name,
          sender: MY_NAME, senderRole: IS_ADMIN ? "admin" : "user",
          timestamp: new Date(), reactions: {},
          imagePreview: ev.target?.result as string,
          quotedMessage: quoted,
        },
      ]);
      setReplyTarget(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  /* Audio */
  const startRecording = () => {
    setIsRecording(true);
    setRecordingMs(0);
    recordTimer.current = setInterval(() => setRecordingMs((ms) => ms + 100), 100);
  };
  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    if (recordTimer.current) clearInterval(recordTimer.current);
    const duration = (recordingMs / 1000).toFixed(1);
    const quoted: QuotedMessage | undefined = replyTarget
      ? { id: replyTarget.id, sender: replyTarget.sender, senderRole: replyTarget.senderRole, content: quotePreview(replyTarget), type: replyTarget.type }
      : undefined;
    setMessages((prev) => [
      ...prev,
      {
        id: uid(), type: "audio", content: `Voice message (${duration}s)`,
        sender: MY_NAME, senderRole: IS_ADMIN ? "admin" : "user",
        timestamp: new Date(), reactions: {},
        quotedMessage: quoted,
      },
    ]);
    setRecordingMs(0);
    setReplyTarget(null);
  };

  /* Pin / Unpin */
  const pinMessage   = (id: string) => setMessages((prev) => prev.map((m) => ({ ...m, pinned: m.id === id ? true  : m.pinned })));
  const unpinMessage = (id: string) => setMessages((prev) => prev.map((m) => ({ ...m, pinned: m.id === id ? false : m.pinned })));

  /* React */
  const reactToMessage = useCallback((msgId: string, emoji: Emoji) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const prev_r  = m.myReaction;
        const nr      = { ...m.reactions };
        if (prev_r && prev_r !== emoji) {
          nr[prev_r] = Math.max((nr[prev_r] ?? 1) - 1, 0);
          if (nr[prev_r] === 0) delete nr[prev_r];
        }
        if (prev_r === emoji) {
          nr[emoji] = Math.max((nr[emoji] ?? 1) - 1, 0);
          if (nr[emoji] === 0) delete nr[emoji];
          return { ...m, reactions: nr, myReaction: undefined };
        }
        nr[emoji] = (nr[emoji] ?? 0) + 1;
        return { ...m, reactions: nr, myReaction: emoji };
      })
    );
  }, []);

  /* Scroll to quoted message */
  const scrollToMessage = (id: string) => {
    const el = msgRefs.current.get(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    /* quick flash highlight */
    el.style.transition = "background 0.15s ease";
    el.style.background = "hsla(315,80%,40%,0.18)";
    setTimeout(() => { el.style.background = ""; }, 900);
  };

  const scrollToPinned = () => pinnedMsgRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div className="flex flex-col h-full" style={{ height: "calc(100vh - 160px)" }}>
      <div
        className="glass-card animate-card-entrance rounded-2xl overflow-hidden flex flex-col"
        style={{ animationDelay: "0ms", animationFillMode: "both", flex: 1, minHeight: 0 }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-4 border-b shrink-0"
          style={{ borderColor: "hsla(315,30%,25%,0.2)" }}
        >
          <div className="rounded-xl p-2" style={{ background: "hsla(315,80%,40%,0.15)" }}>
            <MessageCircle size={15} style={{ color: "hsl(var(--primary))", filter: "drop-shadow(0 0 5px hsla(315,90%,60%,0.55))" }} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>
            Community Chat
          </p>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "hsl(142,70%,55%)" }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "hsl(142,70%,55%)" }} />
            </span>
            <span className="text-xs font-medium" style={{ color: "hsl(142,70%,55%)" }}>24 online</span>
          </div>
        </div>

        {/* Pinned banner */}
        {pinnedMessage && <PinnedBanner message={pinnedMessage} onJump={scrollToPinned} />}

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 min-h-0"
          style={{ scrollbarWidth: "thin", scrollbarColor: "hsla(315,40%,30%,0.3) transparent" }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              ref={(el) => {
                if (el) msgRefs.current.set(msg.id, el);
                else msgRefs.current.delete(msg.id);
                if (msg.pinned && el) pinnedMsgRef.current = el;
              }}
              style={{ borderRadius: 16, transition: "background 0.6s ease" }}
            >
              <MessageBubble
                msg={msg}
                isOwn={msg.sender === MY_NAME}
                isAdmin={IS_ADMIN}
                onPin={pinMessage}
                onUnpin={unpinMessage}
                onReact={reactToMessage}
                onReply={setReplyTarget}
                onScrollTo={scrollToMessage}
              />
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="px-4 pb-3 pt-2 border-t shrink-0" style={{ borderColor: "hsla(315,30%,25%,0.2)" }}>
          {/* Reply preview strip */}
          {replyTarget && !isRecording && (
            <QuotePreviewBar quote={{
              id: replyTarget.id, sender: replyTarget.sender,
              senderRole: replyTarget.senderRole,
              content: quotePreview(replyTarget), type: replyTarget.type,
            }} onCancel={() => setReplyTarget(null)} />
          )}

          {isRecording ? (
            <div className="flex items-center gap-3">
              <div
                className="flex-1 flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ background: "hsla(315,80%,30%,0.18)", border: "1px solid hsla(315,70%,55%,0.3)" }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "hsl(0,80%,60%)" }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "hsl(0,80%,60%)" }} />
                </span>
                <span className="text-sm font-mono" style={{ color: "hsl(var(--foreground))" }}>
                  Recording… {(recordingMs / 1000).toFixed(1)}s
                </span>
              </div>
              <button
                onClick={stopRecording}
                className="rounded-xl p-3 transition-transform active:scale-95"
                style={{
                  background: "linear-gradient(135deg, hsl(315,95%,45%), hsl(315,85%,55%))",
                  boxShadow: "0 0 16px hsla(315,90%,55%,0.45)",
                }}
              >
                <Check size={16} style={{ color: "#fff" }} />
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl p-2.5 shrink-0 transition-all active:scale-90 hover:opacity-80"
                style={{
                  background: "hsla(315,60%,30%,0.2)",
                  border: "1px solid hsla(315,40%,40%,0.2)",
                  color: "hsl(var(--muted-foreground))",
                }}
                title="Share image"
              >
                <ImageIcon size={16} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={replyTarget ? `Replying to ${replyTarget.sender}…` : "Type a message…"}
                rows={1}
                className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm leading-relaxed glass-input"
                style={{ color: "hsl(var(--foreground))", minHeight: 42, maxHeight: 100, fontFamily: "inherit" }}
              />

              <button
                onMouseDown={startRecording}
                onTouchStart={startRecording}
                className="rounded-xl p-2.5 shrink-0 transition-all active:scale-90 hover:opacity-80"
                style={{
                  background: "hsla(315,60%,30%,0.2)",
                  border: "1px solid hsla(315,40%,40%,0.2)",
                  color: "hsl(var(--muted-foreground))",
                }}
                title="Hold to record audio"
              >
                <Mic size={16} />
              </button>

              <button
                onClick={sendText}
                disabled={!text.trim()}
                className="rounded-xl p-2.5 shrink-0 transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: text.trim()
                    ? "linear-gradient(135deg, hsl(315,95%,45%), hsl(315,85%,58%))"
                    : "hsla(315,40%,20%,0.3)",
                  border: "1px solid hsla(315,60%,55%,0.25)",
                  boxShadow: text.trim() ? "0 0 14px hsla(315,90%,55%,0.4)" : "none",
                  color: "#fff",
                }}
              >
                <Send size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
