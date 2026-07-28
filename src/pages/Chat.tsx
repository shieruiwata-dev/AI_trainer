import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUp,
  ClipboardList,
  Copy,
  Menu,
  Mic,
  MoreHorizontal,
  Pin,
  PinOff,
  Plus,
  Search,
  Settings,
  SquarePen,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useAppData } from "@/hooks/useAppData";
import { getTrainerMode, sendToTrainer } from "@/lib/trainer";
import {
  conversationToText,
  loadConversations,
  saveConversations,
  sortConversations,
  titleFrom,
  type Conversation,
} from "@/lib/conversations";
import type { ChatMessage } from "@/lib/types";
import { uid, cn } from "@/lib/utils";

const SUGGESTIONS = [
  "今日の食事メニューを提案して",
  "自宅でできる筋トレメニューは?",
  "モチベーションが下がってます…",
  "停滞期を抜けるには?",
];

export default function Chat() {
  const data = useAppData();
  const [convs, setConvs] = useState<Conversation[]>(() => loadConversations());
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const current = convs.find((c) => c.id === currentId) ?? null;
  const messages = current?.messages ?? [];

  useEffect(() => {
    saveConversations(convs);
  }, [convs]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentId, messages.length, streamingText]);

  const sorted = useMemo(() => sortConversations(convs), [convs]);
  const filtered = searchQuery.trim()
    ? sorted.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : sorted;

  function updateConv(id: string, patch: Partial<Conversation>) {
    setConvs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setShowSuggestions(false);
    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    // 会話がなければ最初のメッセージで新規作成(ChatGPTと同じ挙動)
    let conv = current;
    if (!conv) {
      conv = {
        id: uid(),
        title: titleFrom([userMsg]),
        messages: [userMsg],
        updatedAt: new Date().toISOString(),
      };
      setConvs((prev) => [conv!, ...prev]);
      setCurrentId(conv.id);
    } else {
      updateConv(conv.id, {
        messages: [...conv.messages, userMsg],
        updatedAt: new Date().toISOString(),
      });
    }

    setInput("");
    setSending(true);
    setStreamingText("");

    try {
      const reply = await sendToTrainer(
        trimmed,
        {
          profile: data.profile,
          latestWeightKg: data.latestWeightKg,
          todayCalories: data.todayCalories,
          todayWorkouts: data.todayWorkouts.length,
          streakDays: data.streakDays,
        },
        (partial) => setStreamingText(partial),
        conv.difyConversationId
      );
      const assistantMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: reply.answer,
        createdAt: new Date().toISOString(),
      };
      setConvs((prev) =>
        prev.map((c) =>
          c.id === conv!.id
            ? {
                ...c,
                messages: [...c.messages, assistantMsg],
                difyConversationId:
                  reply.difyConversationId ?? c.difyConversationId,
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      );
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error
          ? e.message
          : "送信に失敗しました。もう一度お試しください。"
      );
    } finally {
      setSending(false);
      setStreamingText(null);
    }
  }

  function newChat() {
    setCurrentId(null);
    setDrawerOpen(false);
    setMenuOpen(false);
  }

  function shareCurrent() {
    if (!current) return;
    navigator.clipboard
      ?.writeText(conversationToText(current))
      .then(() => toast("会話をコピーしました"))
      .catch(() => toast.error("コピーできませんでした"));
    setMenuOpen(false);
  }

  function togglePin() {
    if (!current) return;
    updateConv(current.id, { pinned: !current.pinned });
    setMenuOpen(false);
  }

  function deleteCurrent() {
    if (!current) return;
    if (!confirm("この会話を削除しますか?")) return;
    setConvs((prev) => prev.filter((c) => c.id !== current.id));
    setCurrentId(null);
    setMenuOpen(false);
  }

  const mode = getTrainerMode();
  const greetName = data.profile.name ? `${data.profile.name}さん` : "";

  return (
    <div className="relative h-full overflow-hidden bg-background">
      {/* ===== サイドバー(メイン画面の下に常駐) ===== */}
      <aside
        className={cn(
          "absolute inset-y-0 left-0 flex w-[85%] flex-col bg-background pt-4 transition-[transform,opacity] duration-300 ease-ios",
          drawerOpen ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0"
        )}
        aria-hidden={!drawerOpen}
      >
        <div className="flex items-center justify-between px-5">
          <p className="text-[24px] font-semibold tracking-[-0.02em]">
            FitCoach
          </p>
          <button
            aria-label="会話を検索"
            onClick={() => {
              setSearchOpen((v) => !v);
              setSearchQuery("");
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-95"
          >
            <Search className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {searchOpen && (
          <div className="animate-fade-in px-4 pt-3">
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="検索"
              className="h-10 w-full rounded-full bg-muted px-4 text-[15px] placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        )}

        <nav className="mt-4 space-y-0.5 px-3">
          <SidebarLink
            to="/log"
            icon={<ClipboardList className="h-[22px] w-[22px]" strokeWidth={1.8} />}
            label="記録"
          />
        </nav>

        <p className="mt-5 px-5 text-[14px] font-semibold text-foreground">
          最近
        </p>
        <div className="mt-1 flex-1 overflow-y-auto px-3 pb-24">
          {filtered.length === 0 && (
            <p className="px-2 py-4 text-[14px] text-muted-foreground">
              {searchQuery ? "見つかりませんでした" : "まだ会話がありません"}
            </p>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCurrentId(c.id);
                setDrawerOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-[14px] px-3 py-3 text-left text-[16px] transition-colors",
                c.id === currentId ? "bg-muted" : "hover:bg-muted/60"
              )}
            >
              <span className="min-w-0 flex-1 truncate">{c.title}</span>
              {c.pinned && (
                <Pin className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
              )}
            </button>
          ))}
        </div>

        {/* 下部フローティング: チャット + 設定 */}
        <div className="absolute inset-x-4 bottom-5 flex items-center justify-between">
          <button
            onClick={newChat}
            className="flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-[17px] font-medium text-primary-foreground transition-transform active:scale-95"
          >
            <SquarePen className="h-5 w-5" strokeWidth={2} />
            チャット
          </button>
          <Link
            to="/settings"
            aria-label="設定"
            className="flex h-12 w-12 items-center justify-center rounded-full border bg-card transition-transform active:scale-95"
          >
            <Settings className="h-[22px] w-[22px]" strokeWidth={1.8} />
          </Link>
        </div>
      </aside>

      {/* ===== メイン画面(ドロワー時に右へスライド) ===== */}
      <div
        className={cn(
          "relative flex h-full flex-col bg-card transition-[transform,border-radius] duration-300 ease-ios",
          drawerOpen &&
            "translate-x-[85%] scale-[0.98] rounded-[28px] shadow-[0_8px_40px_rgba(0,0,0,0.18)]"
        )}
      >
        {drawerOpen && (
          <button
            aria-label="メニューを閉じる"
            className="absolute inset-0 z-40 rounded-[28px]"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* ヘッダー */}
        <header className="flex items-center gap-3 px-4 py-3">
          <IconButton label="メニュー" onClick={() => setDrawerOpen(true)}>
            <Menu className="h-6 w-6" strokeWidth={1.8} />
          </IconButton>
          <h1 className="flex-1 truncate text-[20px] font-medium tracking-[-0.01em]">
            トレーナー
          </h1>
          <IconButton label="新しい会話" onClick={newChat}>
            <SquarePen className="h-6 w-6" strokeWidth={1.8} />
          </IconButton>
          <IconButton
            label="その他"
            onClick={() => {
              if (!current) {
                toast("会話を開始するとメニューを使えます");
                return;
              }
              setMenuOpen((v) => !v);
            }}
          >
            <MoreHorizontal className="h-6 w-6" strokeWidth={1.8} />
          </IconButton>
        </header>

        {/* ...メニュー(すりガラスのポップオーバー) */}
        {menuOpen && current && (
          <>
            <button
              aria-label="メニューを閉じる"
              className="absolute inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-3 top-14 z-50 w-[270px] origin-top-right animate-pop-in overflow-hidden rounded-[16px] border border-black/5 bg-card/85 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl">
              <p className="truncate border-b border-black/5 px-4 py-2.5 text-[13px] text-muted-foreground">
                {current.title}
              </p>
              <MenuItem
                label="共有する"
                icon={<Upload className="h-5 w-5" strokeWidth={1.8} />}
                onClick={shareCurrent}
              />
              <MenuItem
                label={current.pinned ? "ピン留めを解除" : "ピン留めする"}
                icon={
                  current.pinned ? (
                    <PinOff className="h-5 w-5" strokeWidth={1.8} />
                  ) : (
                    <Pin className="h-5 w-5" strokeWidth={1.8} />
                  )
                }
                onClick={togglePin}
              />
              <MenuItem
                label="削除する"
                icon={<Trash2 className="h-5 w-5" strokeWidth={1.8} />}
                destructive
                onClick={deleteCurrent}
              />
            </div>
          </>
        )}

        {/* メッセージ領域 */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-3">
          {messages.length === 0 && streamingText === null && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <h2 className="text-[24px] leading-[1.3] [text-wrap:balance]">
                こんにちは{greetName && `、${greetName}`}。
              </h2>
              <p className="text-[15px] text-muted-foreground">
                食事、筋トレ、モチベーション。
                <br />
                なんでも聞いてください。
              </p>
              {mode === "demo" && (
                <p className="text-[12px] text-muted-foreground/70">
                  (デモモードで動作中)
                </p>
              )}
            </div>
          )}

          {messages.map((m) =>
            m.role === "user" ? (
              <UserMessage key={m.id} content={m.content} />
            ) : (
              <AssistantMessage key={m.id} content={m.content} />
            )
          )}
          {streamingText !== null && (
            <AssistantMessage content={streamingText || "…"} streaming />
          )}
          <div ref={bottomRef} />
        </div>

        {/* 質問候補(+ボタンで開閉) */}
        {showSuggestions && (
          <div className="flex flex-wrap gap-2 px-4 pb-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border bg-card px-4 py-2 text-[13px] text-foreground transition-transform active:scale-[0.97]"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* 入力バー */}
        <div className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1">
          <form
            className="flex items-end gap-1 rounded-[28px] bg-muted px-2 py-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <IconButton
              label="質問の候補"
              onClick={() => setShowSuggestions((v) => !v)}
              className="mb-0.5"
            >
              <Plus className="h-6 w-6" strokeWidth={1.8} />
            </IconButton>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="トレーナーに質問する"
              rows={1}
              className="max-h-28 min-h-[40px] flex-1 resize-none self-center bg-transparent px-1 py-2 text-[17px] leading-snug text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <IconButton
              label="音声入力"
              onClick={() => toast("音声入力は今後対応予定です")}
              className="mb-0.5"
            >
              <Mic className="h-6 w-6" strokeWidth={1.8} />
            </IconButton>
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="送信"
              className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95 disabled:opacity-40"
            >
              <ArrowUp className="h-5 w-5" strokeWidth={2.2} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground transition-transform active:scale-95",
        className
      )}
    >
      {children}
    </button>
  );
}

function SidebarLink({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3.5 rounded-[14px] px-3 py-3 text-[17px] transition-colors hover:bg-muted/60"
    >
      {icon}
      {label}
    </Link>
  );
}

function MenuItem({
  label,
  icon,
  onClick,
  destructive = false,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between border-t border-black/5 px-4 py-3.5 text-left text-[16px] transition-colors active:bg-muted/60",
        destructive ? "text-destructive" : "text-foreground"
      )}
    >
      {label}
      {icon}
    </button>
  );
}

/** 自分の発言: グレーの丸いバブル(右寄せ) */
function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex animate-fade-in justify-end">
      <div className="max-w-[80%] whitespace-pre-wrap rounded-[22px] bg-muted px-5 py-2.5 text-[17px] leading-[1.5] text-foreground">
        {content}
      </div>
    </div>
  );
}

/** トレーナーの返答: バブルなしの平文 + アクションアイコン列 */
function AssistantMessage({
  content,
  streaming = false,
}: {
  content: string;
  streaming?: boolean;
}) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  function copy() {
    navigator.clipboard
      ?.writeText(content)
      .then(() => toast("コピーしました"))
      .catch(() => toast.error("コピーできませんでした"));
  }

  return (
    <div className="animate-fade-in">
      <div className="whitespace-pre-wrap text-[17px] leading-[1.6] text-foreground">
        {content}
      </div>
      {!streaming && (
        <div className="mt-2.5 flex items-center gap-4 text-muted-foreground">
          <ActionIcon label="コピー" onClick={copy}>
            <Copy className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </ActionIcon>
          <ActionIcon
            label="良い回答"
            active={feedback === "up"}
            onClick={() => setFeedback(feedback === "up" ? null : "up")}
          >
            <ThumbsUp className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </ActionIcon>
          <ActionIcon
            label="良くない回答"
            active={feedback === "down"}
            onClick={() => setFeedback(feedback === "down" ? null : "down")}
          >
            <ThumbsDown className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </ActionIcon>
        </div>
      )}
    </div>
  );
}

function ActionIcon({
  label,
  onClick,
  active = false,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "transition-[transform,color] active:scale-90",
        active ? "text-primary" : "hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
