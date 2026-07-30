import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUp,
  Camera,
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
  ImagePlus,
  Scale,
  Search,
  Settings,
  SquarePen,
  X,
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
  sanitizeAssistantText,
  sendAiChat,
  type UiType,
} from "@/lib/aiChat";
import { CameraSheet } from "@/components/CameraSheet";
import { ChatActionCard } from "@/components/ChatActionCard";
import { MealRecordPage } from "@/components/MealRecordPage";
import { CaloriesPanel } from "@/components/CaloriesPanel";
import { WorkoutSetsCard } from "@/components/WorkoutSetsCard";
import { WorkoutRecordPage } from "@/components/WorkoutRecordPage";
import { uploadChatImage } from "@/lib/uploadImage";
import {
  fetchServerMessages,
  mergeServerHistory,
} from "@/lib/serverConversations";

import { calcMacroTargets } from "@/lib/nutrition";
import {
  conversationDateLabel,
  conversationToText,
  loadConversations,
  saveConversations,
  sortConversations,
  titleFrom,
  type Conversation,
} from "@/lib/conversations";
import type { ChatMessage, Profile, WorkoutSetRecord } from "@/lib/types";
import { uid, cn } from "@/lib/utils";

const SUGGESTIONS = [
  "今日の食事メニューを提案して",
  "自宅でできる筋トレメニューは?",
  "モチベーションが下がってます…",
  "停滞期を抜けるには?",
];

/** 確認カードのボタンと重複するためチップとして表示しない候補 */
const DUPLICATE_OF_CARD_BUTTONS = [
  "この内容で記録",
  "この内容で保存",
  "このメニューで開始",
  "この目標で設定",
  "キャンセル",
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
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [cameraOpen, setCameraOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  // 上部カード → 全画面記録ページ(カードの位置から広がるアニメーション)
  const [recordPage, setRecordPage] = useState<{
    type: "meal" | "workout";
    rect: { top: number; left: number; width: number; height: number };
  } | null>(null);
  const [recordClosing, setRecordClosing] = useState(false);

  function openRecordPage(type: "meal" | "workout", cardEl: HTMLElement) {
    const container = mainRef.current;
    if (!container) return;
    const c = container.getBoundingClientRect();
    const r = cardEl.getBoundingClientRect();
    setRecordClosing(false);
    setRecordPage({
      type,
      rect: {
        top: r.top - c.top,
        left: r.left - c.left,
        width: r.width,
        height: r.height,
      },
    });
  }

  function closeRecordPage() {
    setRecordClosing(true);
    setTimeout(() => {
      setRecordPage(null);
      setRecordClosing(false);
    }, 360);
  }

  const current = convs.find((c) => c.id === currentId) ?? null;
  const messages = current?.messages ?? [];

  useEffect(() => {
    saveConversations(convs);
  }, [convs]);

  // サーバーに保存されたチャット履歴(ai_messages)を読み込み、
  // この端末に無い分をサイドバーに合成する(別デバイスで履歴が見えない問題の対策)
  useEffect(() => {
    if (!isEdgeChatAvailable) return;
    let cancelled = false;
    fetchServerMessages().then((msgs) => {
      if (cancelled || msgs.length === 0) return;
      setConvs((prev) => mergeServerHistory(prev, msgs));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!attachedFile) {
      setAttachedPreview(null);
      return;
    }
    const url = URL.createObjectURL(attachedFile);
    setAttachedPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [attachedFile]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentId, messages.length, streamingText]);

  const sorted = useMemo(() => sortConversations(convs), [convs]);
  const filtered = searchQuery.trim()
    ? sorted.filter((c) => {
        const q = searchQuery.trim().toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          conversationDateLabel(c).includes(q)
        );
      })
    : sorted;

  function updateConv(id: string, patch: Partial<Conversation>) {
    setConvs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  }

  async function sendMessage(
    text: string,
    // カメラシートなど、添付stateを経由せずに画像を直接渡す場合に使う
    override?: { file: File; previewUrl: string }
  ) {
    const trimmed = text.trim();
    const file = override?.file ?? attachedFile;
    if ((!trimmed && !file) || sending) return;

    console.log("chat sendMessage called", { hasMessage: true });
    setSendError(null);
    setShowSuggestions(false);
    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: trimmed || (file ? "(画像を送信しました)" : ""),
      createdAt: new Date().toISOString(),
      imageUrl: override?.previewUrl ?? attachedPreview ?? undefined,
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
    setAttachedFile(null);
    setSending(true);
    setStreamingText("");

    try {
      // デモビルドではアップロード先が無いためスキップ(プレビュー表示のみ)
      const imagePath =
        file && isEdgeChatAvailable ? await uploadChatImage(file) : null;

      if (isEdgeChatAvailable) {
        // Supabase Edge Function `ai-chat` 経由
        const res = await sendAiChat({
          message: trimmed,
          imagePath,
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
      console.error("ai-chat error context (dev only)", context);
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
              <span className="min-w-0 flex-1 truncate [font-variant-numeric:tabular-nums]">
                {conversationDateLabel(c)}
              </span>
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
        ref={mainRef}
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

        {/* 上部カード(スワイプで カロリーPFC ⇄ 今日の筋トレ、タップで記録ページへ) */}
        <div className="px-3 pb-1">
          <TopCards data={data} onOpen={openRecordPage} />
        </div>

        {/* 全画面の記録ページ(カードから広がる) */}
        {recordPage && (
          <RecordPageSheet
            type={recordPage.type}
            originRect={recordPage.rect}
            closing={recordClosing}
            onClose={closeRecordPage}
            data={data}
            onAskMenu={() => {
              closeRecordPage();
              // シートが閉じてからチャットに自動送信
              setTimeout(() => {
                void sendMessage("本日の献立を教えてください");
              }, 380);
            }}
          />
        )}

        {/* カメラ撮影シート(食事の写真 → グラム数任意入力 → 送信) */}
        <CameraSheet
          open={cameraOpen}
          onClose={() => setCameraOpen(false)}
          onSend={(file, previewUrl, grams) => {
            setCameraOpen(false);
            const text = grams
              ? `写真の食事を記録して。量は約${grams}gです`
              : "写真の食事を記録して";
            void sendMessage(text, { file, previewUrl });
          }}
        />

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
              <p className="truncate border-b border-black/5 px-4 py-2.5 text-[13px] text-muted-foreground [font-variant-numeric:tabular-nums]">
                {conversationDateLabel(current)}のチャット
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
              <UserMessage key={m.id} content={m.content} imageUrl={m.imageUrl} />
            ) : (
              <div key={m.id}>
                <AssistantMessage content={sanitizeAssistantText(m.content)} />
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
                    {m.suggestions
                      .filter(
                        // 確認カードのボタンと重複する候補は出さない
                        (s) =>
                          !DUPLICATE_OF_CARD_BUTTONS.some((d) => s.includes(d))
                      )
                      .map((s) => (
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
            <AssistantMessage
              content={sanitizeAssistantText(streamingText) || "…"}
              streaming
            />
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
            <p className="font-semibold">{sendError.message}</p>
          </div>
        )}

        {/* 添付画像プレビュー */}
        {attachedPreview && (
          <div className="px-4 pb-2">
            <div className="relative inline-block">
              <img
                src={attachedPreview}
                alt="添付画像のプレビュー"
                className="h-20 w-20 rounded-[12px] object-cover"
              />
              <button
                type="button"
                aria-label="添付を取り消す"
                onClick={() => setAttachedFile(null)}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                if (!f.type.startsWith("image/")) {
                  toast.error("画像ファイルを選択してください");
                  return;
                }
                if (f.size > 8 * 1024 * 1024) {
                  toast.error("画像は8MB以下にしてください");
                  return;
                }
                setAttachedFile(f);
              }}
            />
            <IconButton
              label="画像を添付"
              onClick={() => fileInputRef.current?.click()}
              className="mb-0.5"
            >
              <ImagePlus className="h-6 w-6" strokeWidth={1.8} />
            </IconButton>
            <IconButton
              label="カメラで食事を撮影"
              onClick={() => setCameraOpen(true)}
              className="mb-0.5"
            >
              <Camera className="h-6 w-6" strokeWidth={1.8} />
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
              disabled={sending || (!input.trim() && !attachedFile)}
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
  const fallback = "送信に失敗しました。もう一度お試しください。";
  if (error && typeof error === "object" && "message" in error) {
    const raw = String(error.message);
    // 技術的なJSON/スタックトレースはユーザーに見せない
    const clean = sanitizeAssistantText(raw).split("\n")[0].trim();
    return clean || fallback;
  }
  return fallback;
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

/** 上部カードのスワイプカルーセル(①カロリーPFC ②今日の筋トレ) */
function TopCards({
  data,
  onOpen,
}: {
  data: ReturnType<typeof useAppData>;
  onOpen: (type: "meal" | "workout", cardEl: HTMLElement) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstCardRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  // PFCカードの自然な高さを基準にし、筋トレカードは同じ高さ内でスクロール
  const [cardHeight, setCardHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = firstCardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCardHeight(el.offsetHeight));
    ro.observe(el);
    setCardHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  return (
    <div>
      <div
        ref={scrollRef}
        onScroll={() => {
          const el = scrollRef.current;
          if (!el) return;
          setPage(Math.round(el.scrollLeft / (el.clientWidth + 12)));
        }}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-0.5 py-1.5"
      >
        <div
          ref={firstCardRef}
          className="w-full shrink-0 cursor-pointer snap-center"
          role="button"
          aria-label="食事記録ページを開く"
          onClick={(e) => onOpen("meal", e.currentTarget)}
        >
          <CaloriesPanel
            todayCalories={data.todayCalories}
            profile={data.profile}
            proteinG={data.todayProteinG}
            fatG={data.todayFatG}
            carbsG={data.todayCarbsG}
          />
        </div>
        <div
          className="w-full shrink-0 cursor-pointer snap-center"
          role="button"
          aria-label="筋トレ記録ページを開く"
          style={cardHeight ? { height: cardHeight } : undefined}
          onClick={(e) => onOpen("workout", e.currentTarget)}
        >
          <WorkoutSetsCard sets={data.todayWorkoutSets} />
        </div>
      </div>
      {/* ページドット */}
      <div className="mt-2 flex justify-center gap-1.5">
        {[0, 1].map((i) => (
          <span
            key={i}
            className={cn(
              "h-[6px] w-[6px] rounded-full transition-colors",
              i === page ? "bg-foreground/70" : "bg-muted-foreground/30"
            )}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 全画面の記録ページ。タップしたカードの位置から全画面へ広がり、
 * 閉じるときは元のカード位置へ縮んで戻る。
 * 食事ページは実装済み。筋トレページはプレースホルダー(今後の指示で実装)。
 */
function RecordPageSheet({
  type,
  originRect,
  closing,
  onClose,
  data,
  onAskMenu,
}: {
  type: "meal" | "workout";
  originRect: { top: number; left: number; width: number; height: number };
  closing: boolean;
  onClose: () => void;
  data: ReturnType<typeof useAppData>;
  onAskMenu: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // マウント直後にカード位置→全画面へのトランジションを開始
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setExpanded(true))
    );
    return () => cancelAnimationFrame(id);
  }, []);

  const isOpen = expanded && !closing;
  const title = type === "meal" ? "食事記録" : "筋トレ記録";

  return (
    <div
      className="absolute z-[60] overflow-hidden border bg-card transition-all duration-[350ms] ease-ios"
      style={
        isOpen
          ? { top: 0, left: 0, width: "100%", height: "100%", borderRadius: 0 }
          : {
              top: originRect.top,
              left: originRect.left,
              width: originRect.width,
              height: originRect.height,
              borderRadius: 18,
            }
      }
    >
      <div
        className={cn(
          "flex h-full flex-col transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0"
        )}
      >
        {/* ヘッダー */}
        <header className="flex items-center justify-between px-5 pb-3 pt-[max(calc(env(safe-area-inset-top,0px)+0.75rem),1rem)]">
          <h2 className="text-[22px] leading-tight">{title}</h2>
          <button
            aria-label="閉じる"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition-transform active:scale-95"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </header>

        {/* 本文 */}
        {type === "meal" ? (
          <MealRecordPage data={data} onAskMenu={onAskMenu} />
        ) : (
          <WorkoutRecordPage data={data} />
        )}
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
function UserMessage({
  content,
  imageUrl,
}: {
  content: string;
  imageUrl?: string;
}) {
  return (
    <div className="flex animate-fade-in flex-col items-end gap-1.5">
      {imageUrl && (
        <img
          src={imageUrl}
          alt="送信した画像"
          className="max-h-52 max-w-[70%] rounded-[18px] object-cover"
        />
      )}
      {content && (
        <div className="max-w-[80%] whitespace-pre-wrap rounded-[22px] bg-muted px-5 py-2.5 text-[17px] leading-[1.5] text-foreground">
          {content}
        </div>
      )}
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
