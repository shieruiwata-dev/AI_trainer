import { useEffect, useRef, useState } from "react";
import { Dumbbell, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
        e instanceof Error ? e.message : "送信に失敗しました。もう一度お試しください。"
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

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b bg-card/60 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Dumbbell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold">AIトレーナー</h1>
            <p className="text-[11px] text-muted-foreground">
              {mode === "demo"
                ? "デモモード(バックエンド未接続)"
                : "オンライン"}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleReset} aria-label="会話をリセット">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && streamingText === null && (
          <div className="space-y-4 pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              食事・筋トレ・モチベーションのことなら
              <br />
              なんでも相談してください💪
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
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
          <MessageBubble
            role="assistant"
            content={streamingText || "…"}
          />
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t bg-card/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="メッセージを入力…"
            rows={1}
            className="max-h-28 min-h-[44px] flex-1 resize-none"
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || !input.trim()}
            aria-label="送信"
            className="h-11 w-11 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
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
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border bg-card"
        )}
      >
        {content}
      </div>
    </div>
  );
}
