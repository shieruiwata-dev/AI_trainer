import { useEffect, useRef, useState } from "react";
import { ArrowUp, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
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

  function handleReset() {
    if (!confirm("会話履歴をリセットしますか?")) return;
    clearChatHistory();
    resetConversation();
    setMessages([]);
  }

  const mode = getTrainerMode();
  const greetName = data.profile.name ? `${data.profile.name}さん` : "";

  return (
    <div className="flex h-full flex-col bg-card">
      {/* フロストガラスのヘッダー */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-card/80 px-5 py-3 backdrop-blur-xl">
        <div>
          <h1 className="text-[21px] leading-tight">トレーナー</h1>
          <p className="text-xs text-muted-foreground">
            {mode === "demo" ? "デモモード" : "オンライン"}
          </p>
        </div>
        <button
          onClick={handleReset}
          aria-label="会話をリセット"
          className="flex h-9 w-9 items-center justify-center rounded-full text-primary transition-transform active:scale-95 hover:bg-muted"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </header>

      <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
        {messages.length === 0 && streamingText === null && (
          <div className="flex h-full flex-col justify-end gap-8 pb-4">
            <div className="space-y-2 px-1 text-center">
              <h2 className="text-[28px] leading-[1.2] [text-wrap:balance]">
                こんにちは{greetName && `、${greetName}`}。
              </h2>
              <p className="text-[15px] text-muted-foreground">
                食事、筋トレ、モチベーション。
                <br />
                なんでも相談してください。
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border bg-card px-5 py-3 text-left text-[15px] text-primary transition-transform active:scale-[0.97]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} />
        ))}
        {streamingText !== null && (
          <MessageBubble role="assistant" content={streamingText || "…"} />
        )}
        <div ref={bottomRef} />
      </div>

      {/* iMessage風の入力バー */}
      <div className="border-t bg-card/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <Textarea
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
            placeholder="メッセージ"
            rows={1}
            className="max-h-28 min-h-[44px] flex-1 resize-none"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="送信"
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95 disabled:opacity-40 mb-[3px]"
          >
            <ArrowUp className="h-5 w-5" strokeWidth={2.2} />
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  const isUser = role === "user";
  return (
    <div
      className={cn(
        "flex animate-fade-in",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap rounded-[18px] px-4 py-2 text-[16px] leading-[1.4]",
          isUser
            ? "rounded-br-[5px] bg-primary text-primary-foreground"
            : "rounded-bl-[5px] bg-muted text-foreground"
        )}
      >
        {content}
      </div>
    </div>
  );
}
