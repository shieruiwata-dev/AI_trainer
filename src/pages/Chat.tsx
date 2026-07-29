import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUp,
  Check,
  ChevronDown,
  ClipboardList,
  Copy,
  Dumbbell,
  Menu,
  Mic,
  MoreHorizontal,
  Pin,
  PinOff,
  Plus,
  Scale,
  Search,
  Settings,
  SquarePen,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Upload,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { useAppData } from "@/hooks/useAppData";
import { getTrainerMode, sendToTrainer } from "@/lib/trainer";
import {
  confirmAction,
  isEdgeChatAvailable,
  sendAiChat,
  type UiType,
} from "@/lib/aiChat";
import { ChatActionCard } from "@/components/ChatActionCard";

import { calcMacroTargets } from "@/lib/nutrition";
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

/**
 * 閉じるときも退出アニメーションを流すためのマウント管理。
 * open=false になってから duration ms は closing 状態でマウントを維持する。
 */
function useAnimatedPresence(open: boolean, duration = 200) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const t = setTimeout(() => setMounted(false), duration);
    return () => clearTimeout(t);
  }, [open, duration]);
  return { mounted, closing: mounted && !open };
}

export default function Chat() {
  const data = useAppData();
  const [convs, setConvs] = useState<Conversation[]>(() => loadConversations());
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<{ message: string; context: string } | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logMenuOpen, setLogMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const menuPopover = useAnimatedPresence(menuOpen, 150);

  useEffect(() => {
    if (!menuOpen) setDeleteArmed(false);
  }, [menuOpen]);
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

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    console.log("chat sendMessage called", { hasMessage: true });
    setSendError(null);
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
      if (isEdgeChatAvailable) {
        // Supabase Edge Function `ai-chat` 経由
        const res = await sendAiChat({
          message: trimmed,
          imagePath: null,
          conversationId: conv.difyConversationId ?? null,
        });
        const assistantMsg: ChatMessage = {
          id: uid(),
          role: "assistant",
          content: res.message,
          createdAt: new Date().toISOString(),
          uiType: res.ui_type,
          actionData: (res.data as Record<string, unknown> | null) ?? null,
          suggestions: res.suggestions,
          safety: res.safety,
        };
        setConvs((prev) =>
          prev.map((c) =>
            c.id === conv!.id
              ? {
                  ...c,
                  messages: [...c.messages, assistantMsg],
                  difyConversationId:
                    res.conversation_id ?? c.difyConversationId,
                  updatedAt: new Date().toISOString(),
                }
              : c
          )
        );
        return;
      }

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
        uiType: "text",
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
      console.error("chat sendMessage catch", e);
      const message = getErrorMessage(e);
      const context = getErrorContext(e);
      setSendError({ message, context });
      toast.error(message);
    } finally {
      setSending(false);
      setStreamingText(null);
    }
  }

  /** 確認カードの「この内容で記録」/「キャンセル」→ confirm-action */
  async function handleDecision(
    messageId: string,
    decision: "confirm" | "reject"
  ) {
    if (!current || confirmingId) return;
    const msg = current.messages.find((m) => m.id === messageId);
    const pendingActionId = msg?.actionData?.pending_action_id as
      | string
      | undefined;
    if (!pendingActionId) {
      toast.error("この提案はすでに無効です");
      return;
    }

    setConfirmingId(messageId);
    try {
      const res = await confirmAction({
        pendingActionId,
        decision,
        overrides: {},
      });

      setConvs((prev) =>
        prev.map((c) =>
          c.id === current.id
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId ? { ...m, decision } : m
                ),
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      );

      if (decision === "confirm") {
        // 今日のPFC・履歴を最新化
        await data.reload();
        toast.success(res.message ?? "記録しました");
      } else {
        toast("キャンセルしました");
      }
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setConfirmingId(null);
    }
  }


  function newChat() {
    const hadConversation = currentId !== null;
    setCurrentId(null);
    setDrawerOpen(false);
    setMenuOpen(false);
    setInput("");
    toast(
      hadConversation
        ? "新しいチャットを開始しました"
        : "すでに新しいチャットです"
    );
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
    // confirm() はプレビュー環境でブロックされることがあるため2段階タップで確認
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }
    setConvs((prev) => prev.filter((c) => c.id !== current.id));
    setCurrentId(null);
    setMenuOpen(false);
    setDeleteArmed(false);
    toast("会話を削除しました");
  }

  const mode = getTrainerMode();
  const greetName = data.profile.name ? `${data.profile.name}さん` : "";

  return (
    <div className="relative h-full overflow-hidden bg-background">
      {/* ===== サイドバー(メイン画面の下に常駐) ===== */}
      <aside
        className={cn(
          "absolute inset-y-0 left-0 flex w-[85%] flex-col bg-background pt-[max(calc(env(safe-area-inset-top,0px)+0.75rem),1rem)] transition-[transform,opacity] duration-300 ease-ios",
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
          {/* 記録(タップで食事・筋トレ・体重のタブを展開) */}
          <button
            onClick={() => setLogMenuOpen((v) => !v)}
            className="flex w-full items-center gap-3.5 rounded-[14px] px-3 py-3 text-[17px] transition-colors hover:bg-muted/60"
          >
            <ClipboardList className="h-[22px] w-[22px]" strokeWidth={1.8} />
            <span className="flex-1 text-left">記録</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-300 ease-ios",
                logMenuOpen && "rotate-180"
              )}
              strokeWidth={2}
            />
          </button>
          <div
            className={cn(
              "grid transition-[grid-template-rows] duration-300 ease-ios",
              logMenuOpen
                ? "[grid-template-rows:1fr]"
                : "[grid-template-rows:0fr]"
            )}
          >
            <div className="overflow-hidden">
              <div className="my-0.5 ml-5 space-y-0.5 border-l pl-2.5">
                <SidebarSubLink
                  to="/log?tab=meal"
                  icon={<Utensils className="h-[18px] w-[18px]" strokeWidth={1.8} />}
                  label="食事"
                />
                <SidebarSubLink
                  to="/log?tab=workout"
                  icon={<Dumbbell className="h-[18px] w-[18px]" strokeWidth={1.8} />}
                  label="筋トレ"
                />
                <SidebarSubLink
                  to="/log?tab=weight"
                  icon={<Scale className="h-[18px] w-[18px]" strokeWidth={1.8} />}
                  label="体重"
                />
              </div>
            </div>
          </div>
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
        <div className="absolute inset-x-4 bottom-[max(calc(env(safe-area-inset-bottom,0px)+0.75rem),1.25rem)] flex items-center justify-between">
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

        {/* ヘッダー(iPhoneのノッチを避けるセーフエリア付き) */}
        <header className="flex items-center gap-3 px-4 pb-3 pt-[max(calc(env(safe-area-inset-top,0px)+0.5rem),0.75rem)]">
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

        {/* カロリーパネル(常時表示) */}
        <div className="px-3 pb-1">
          <CaloriesPanel
            todayCalories={data.todayCalories}
            targetCalories={data.profile.targetCalories}
            proteinG={data.todayProteinG}
            fatG={data.todayFatG}
            carbsG={data.todayCarbsG}
          />
        </div>

        {/* ...メニュー(すりガラスのポップオーバー) */}
        {menuPopover.mounted && current && (
          <>
            {!menuPopover.closing && (
              <button
                aria-label="メニューを閉じる"
                className="absolute inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
            )}
            <div
              className={cn(
                "absolute right-3 top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-50 w-[270px] origin-top-right overflow-hidden rounded-[16px] border border-black/5 bg-card/85 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl",
                menuPopover.closing ? "animate-pop-out" : "animate-pop-in"
              )}
            >
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
                label={deleteArmed ? "タップして完全に削除" : "削除する"}
                icon={<Trash2 className="h-5 w-5" strokeWidth={1.8} />}
                destructive
                emphasized={deleteArmed}
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
              <div key={m.id}>
                <AssistantMessage content={m.content} />
                {m.uiType && m.uiType !== "text" && (
                  <ChatActionCard
                    uiType={m.uiType as UiType}
                    actionData={m.actionData}
                    safety={m.safety}
                    decision={m.decision}
                    busy={confirmingId !== null}
                    onConfirm={() => handleDecision(m.id, "confirm")}
                    onReject={() => handleDecision(m.id, "reject")}
                  />
                )}
                {m.suggestions && m.suggestions.length > 0 && !m.decision && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {m.suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => void sendMessage(s)}
                        className="rounded-full border bg-card px-4 py-2 text-[13px] text-foreground transition-transform active:scale-[0.97]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
                onClick={() => void sendMessage(s)}
                className="rounded-full border bg-card px-4 py-2 text-[13px] text-foreground transition-transform active:scale-[0.97]"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {sendError && (
          <div
            role="alert"
            className="mx-3 mb-2 rounded-[12px] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <p className="font-semibold">送信エラー: {sendError.message}</p>
            <p className="mt-1 break-all text-xs">context: {sendError.context}</p>
          </div>
        )}

        {/* 入力バー(ホームインジケーターを避けるセーフエリア付き) */}
        <div className="px-3 pb-[max(calc(env(safe-area-inset-bottom,0px)+0.5rem),1rem)] pt-1">
          <form
            className="flex items-end gap-1 rounded-[28px] bg-muted px-2 py-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(input);
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
                  void sendMessage(input);
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
              type="button"
              onClick={() => void sendMessage(input)}
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

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "送信に失敗しました。もう一度お試しください。";
}

function getErrorContext(error: unknown): string {
  if (!error || typeof error !== "object" || !("context" in error)) return "なし";
  const context = error.context;
  if (context instanceof Response) {
    return `${context.status} ${context.statusText || "Edge Function response"}`;
  }
  if (typeof context === "string") return context;
  try {
    return JSON.stringify(context);
  } catch {
    return String(context);
  }
}

/** チャット上部に常時表示する今日の食事パネル(目標チップ + 摂取kcal + PFCゲージ) */
function CaloriesPanel({
  todayCalories,
  targetCalories,
  proteinG,
  fatG,
  carbsG,
}: {
  todayCalories: number;
  targetCalories: number | null;
  proteinG: number;
  fatG: number;
  carbsG: number;
}) {
  const hasTarget = targetCalories != null && targetCalories > 0;
  const targets = hasTarget ? calcMacroTargets(targetCalories) : null;

  return (
    <div className="rounded-[18px] border bg-card px-4 pb-3.5 pt-3.5">
      {/* 上段: 目標チップ + 摂取カロリー */}
      <div className="flex items-start justify-between px-1">
        <div className="rounded-[12px] bg-muted px-3.5 py-2">
          <p className="text-[11px] leading-none text-muted-foreground">目標</p>
          <p className="mt-1 text-[15px] font-semibold leading-none [font-variant-numeric:tabular-nums]">
            {hasTarget ? `${targetCalories} kcal` : "未設定"}
          </p>
        </div>
        <p className="text-[34px] font-bold leading-none tracking-[-0.02em] [font-variant-numeric:tabular-nums]">
          {todayCalories}
          <span className="ml-1.5 text-[15px] font-normal text-muted-foreground">
            kcal
          </span>
        </p>
      </div>

      {/* PFCゲージ */}
      <div className="mt-3 grid grid-cols-3 gap-1">
        <MacroGauge
          label="タンパク質"
          value={proteinG}
          target={targets?.proteinG ?? null}
        />
        <MacroGauge label="脂質" value={fatG} target={targets?.fatG ?? null} />
        <MacroGauge
          label="炭水化物"
          value={carbsG}
          target={targets?.carbsG ?? null}
        />
      </div>

      {!hasTarget && (
        <p className="mt-3 text-center text-[12px] text-muted-foreground">
          設定で目標カロリーを入力すると、目標量と達成度が表示されます
        </p>
      )}
    </div>
  );
}

/** 270度の円弧ゲージ(PFC 1項目分) */
function MacroGauge({
  label,
  value,
  target,
}: {
  label: string;
  value: number;
  target: number | null;
}) {
  const fmt = (n: number) => n.toFixed(1);
  const r = 33;
  const C = 2 * Math.PI * r;
  const arcLen = 0.75 * C; // 270度
  const ratio = target ? Math.min(1, value / target) : 0;

  // 達成度チップ: 80%未満=不足(グレー) / 80〜115%=範囲内(緑) / それ以上=オーバー(赤)
  const status = (() => {
    if (!target) return null;
    const p = value / target;
    if (p < 0.8)
      return { cls: "bg-muted text-muted-foreground", text: `-${fmt(target - value)}g`, check: false };
    if (p <= 1.15)
      return { cls: "bg-[#34c759]/15 text-[#248a3d]", text: "目標範囲内", check: true };
    return { cls: "bg-destructive/10 text-destructive", text: `+${fmt(value - target)}g`, check: false };
  })();

  return (
    <div className="flex flex-col items-center">
      <p className="text-[13px] font-semibold">{label}</p>
      <div className="relative mt-1 h-[70px] w-[70px]">
        <svg viewBox="0 0 80 80" className="h-full w-full">
          <g transform="rotate(135 40 40)">
            <circle
              cx="40"
              cy="40"
              r={r}
              fill="none"
              stroke="hsl(240 12% 92%)"
              strokeWidth="6.5"
              strokeLinecap="round"
              strokeDasharray={`${arcLen} ${C}`}
            />
            {target != null && ratio > 0 && (
              <circle
                cx="40"
                cy="40"
                r={r}
                fill="none"
                stroke="hsl(210 100% 40%)"
                strokeWidth="6.5"
                strokeLinecap="round"
                strokeDasharray={`${arcLen * ratio} ${C}`}
                className="transition-[stroke-dasharray] duration-500"
              />
            )}
          </g>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-[15px] font-bold text-primary [font-variant-numeric:tabular-nums]">
            {fmt(value)}
            <span className="text-[10px] font-semibold">g</span>
          </p>
        </div>
      </div>
      <p className="text-[12px] text-muted-foreground [font-variant-numeric:tabular-nums]">
        {target != null ? `/ ${fmt(target)}g` : "—"}
      </p>
      {status && (
        <span
          className={cn(
            "mt-1.5 inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-[11px] font-medium [font-variant-numeric:tabular-nums]",
            status.cls
          )}
        >
          {status.check && <Check className="h-3 w-3" strokeWidth={2.5} />}
          {status.text}
        </span>
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

function SidebarSubLink({
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
      className="flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[16px] text-foreground transition-colors hover:bg-muted/60"
    >
      <span className="text-muted-foreground">{icon}</span>
      {label}
    </Link>
  );
}

function MenuItem({
  label,
  icon,
  onClick,
  destructive = false,
  emphasized = false,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
  emphasized?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between border-t border-black/5 px-4 py-3.5 text-left text-[16px] transition-colors active:bg-muted/60",
        destructive ? "text-destructive" : "text-foreground",
        emphasized && "bg-destructive/10 font-semibold"
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
