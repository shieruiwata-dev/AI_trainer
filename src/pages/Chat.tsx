import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUp,
  ClipboardList,
  Copy,
  Menu,
  Mic,
  MoreHorizontal,
  Plus,
  Settings,
  SquarePen,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";
import { useAppData } from "@/hooks/useAppData";
import {
  getTrainerMode,
  resetConversation,
  sendToTrainer,
} from "@/lib/trainer";
import {
  clearChatHistory,
  loadChatHistory,
  saveChatHistory,
} from "@/lib/chatHistory";
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
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadChatHistory()
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

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
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setStreamingText("");

    try {
      const answer = await sendToTrainer(
        trimmed,
        {
          profile: data.profile,
          latestWeightKg: data.latestWeightKg,
          todayCalories: data.todayCalories,
          todayWorkouts: data.todayWorkouts.length,
          streakDays: data.streakDays,
        },
        (partial) => setStreamingText(partial)
      );
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content: answer,
          createdAt: new Date().toISOString(),
        },
      ]);
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

  function handleNewChat() {
    if (messages.length > 0 && !confirm("新しい会話を始めますか?")) return;
    clearChatHistory();
    resetConversation();
    setMessages([]);
  }

  const mode = getTrainerMode();
  const greetName = data.profile.name ? `${data.profile.name}さん` : "";

  return (
    <div className="relative flex h-full flex-col bg-card">
      {/* ヘッダー(ChatGPT風: メニュー / タイトル / 新規・その他) */}
      <header className="flex items-center gap-3 px-4 py-3">
        <IconButton
          label="メニュー"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu className="h-6 w-6" strokeWidth={1.8} />
        </IconButton>
        <h1 className="flex-1 text-[20px] font-medium tracking-[-0.01em]">
          トレーナー
        </h1>
        <IconButton label="新しい会話" onClick={handleNewChat}>
          <SquarePen className="h-6 w-6" strokeWidth={1.8} />
        </IconButton>
        <IconButton label="その他" onClick={() => setDrawerOpen(true)}>
          <MoreHorizontal className="h-6 w-6" strokeWidth={1.8} />
        </IconButton>
      </header>

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

      {/* 入力バー(ChatGPT風: グレーのピルに +・入力・マイク・青円ボタン) */}
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
            className="mb-0.5 text-foreground"
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
            className="mb-0.5 text-foreground"
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

      {/* 左からのドロワーメニュー */}
      {drawerOpen && (
        <div className="absolute inset-0 z-50">
          <button
            aria-label="メニューを閉じる"
            className="absolute inset-0 bg-black/30"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[75%] animate-fade-in flex-col bg-background p-5">
            <p className="text-[21px] font-semibold tracking-[-0.02em]">
              FitCoach
            </p>
            <nav className="mt-6 space-y-1">
              <DrawerLink
                to="/log"
                icon={<ClipboardList className="h-5 w-5" strokeWidth={1.8} />}
                label="記録"
                onNavigate={() => setDrawerOpen(false)}
              />
              <DrawerLink
                to="/settings"
                icon={<Settings className="h-5 w-5" strokeWidth={1.8} />}
                label="設定"
                onNavigate={() => setDrawerOpen(false)}
              />
            </nav>
            <p className="mt-auto text-[12px] text-muted-foreground">
              {mode === "demo"
                ? "デモモード(バックエンド未接続)"
                : "オンライン"}
            </p>
          </div>
        </div>
      )}
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

function DrawerLink({
  to,
  icon,
  label,
  onNavigate,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-[16px] transition-colors hover:bg-muted"
    >
      {icon}
      {label}
    </Link>
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
