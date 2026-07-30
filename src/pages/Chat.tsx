import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUp,
  Camera,
  Copy,
  Dumbbell,
  Menu,
  Mic,
  ImagePlus,
  Scale,
  Settings,
  X,
  ThumbsDown,
  ThumbsUp,
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
import SettingsPage from "@/pages/Settings";
import { CameraSheet } from "@/components/CameraSheet";
import { ChatActionCard } from "@/components/ChatActionCard";
import { MealRecordPage } from "@/components/MealRecordPage";
import { CaloriesPanel } from "@/components/CaloriesPanel";
import { WorkoutSetsCard } from "@/components/WorkoutSetsCard";
import { WorkoutRecordPage } from "@/components/WorkoutRecordPage";
import { composeImages } from "@/lib/composeImages";
import { uploadChatImage } from "@/lib/uploadImage";
import {
  fetchServerMessages,
  mergeServerMessages,
} from "@/lib/serverConversations";

import {
  dayLabel,
  isSameDay,
  loadThread,
  saveThread,
  type ChatThread,
} from "@/lib/thread";
import type { ChatMessage } from "@/lib/types";
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
  // カード内で直接編集できるようになったため候補チップには出さない
  "量を修正",
  "食品を追加",
  "食材を追加",
];

/** 一度に描画する件数。上端までスクロールしたら過去分を追加表示する */
const INITIAL_VISIBLE = 40;
const LOAD_CHUNK = 40;

export default function Chat() {
  const data = useAppData();
  const [thread, setThread] = useState<ChatThread>(() => loadThread());
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  // 入力欄に添付中の画像(カメラ撮影 / ライブラリ選択)。送信で消費する
  const [attachments, setAttachments] = useState<
    { id: string; file: File; url: string }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sendError, setSendError] = useState<{ message: string; context: string } | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  // 設定オーバーレイ: 歯車の位置から円形に広がる(閉じると逆再生)
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsShown, setSettingsShown] = useState(false);
  const [settingsMounted, setSettingsMounted] = useState(false);
  useEffect(() => {
    if (settingsOpen) {
      setSettingsMounted(true);
      const t = setTimeout(() => setSettingsShown(true), 20);
      return () => clearTimeout(t);
    }
    setSettingsShown(false);
    const t = setTimeout(() => setSettingsMounted(false), 720);
    return () => clearTimeout(t);
  }, [settingsOpen]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  // メッセージ領域のスクロール管理(過去分の遅延表示用)
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  /** 過去分を上に足す直前の「下端からの距離」。復元してスクロール位置を維持する */
  const prependAnchor = useRef<number | null>(null);
  const didFirstScroll = useRef(false);

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

  const messages = thread.messages;

  useEffect(() => {
    saveThread(thread);
  }, [thread]);

  // サーバーに保存されたチャット履歴(ai_messages)を読み込み、
  // この端末に無い分をスレッドへ合成する(別デバイスで履歴が見えない問題の対策)
  useEffect(() => {
    if (!isEdgeChatAvailable) return;
    let cancelled = false;
    fetchServerMessages().then((msgs) => {
      if (cancelled || msgs.length === 0) return;
      setThread((prev) => {
        const merged = mergeServerMessages(prev.messages, msgs);
        return merged === prev.messages ? prev : { ...prev, messages: merged };
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 新着時は最下部へ。初回は履歴の途中を見せないよう瞬間移動、以降はスムーズに
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: didFirstScroll.current ? "smooth" : "auto",
    });
    didFirstScroll.current = true;
  }, [messages.length, streamingText]);

  // 過去分を上へ足したときは、直前に見ていた位置(下端からの距離)を維持する
  useLayoutEffect(() => {
    const el = scrollAreaRef.current;
    if (el && prependAnchor.current !== null) {
      el.scrollTop = el.scrollHeight - prependAnchor.current;
    }
    prependAnchor.current = null;
  }, [visibleCount]);

  const visibleMessages = messages.slice(-visibleCount);
  const hasOlder = messages.length > visibleMessages.length;

  /** 上端に近づいたら過去のメッセージを追加表示(LINEで上へ遡るのと同じ) */
  function maybeLoadOlder() {
    const el = scrollAreaRef.current;
    if (!el || !hasOlder || prependAnchor.current !== null) return;
    if (el.scrollTop > 80) return;
    prependAnchor.current = el.scrollHeight - el.scrollTop;
    setVisibleCount((c) => c + LOAD_CHUNK);
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || sending) return;

    console.log("chat sendMessage called", { hasMessage: true });
    setSendError(null);
    setShowSuggestions(false);
    setSending(true);

    // 複数枚の添付は1枚に合成してから送る(ai-chatが受け取れる画像は1枚のため)
    let attachment: { file: File; url: string } | null = null;
    if (attachments.length === 1) {
      attachment = attachments[0];
    } else if (attachments.length > 1) {
      try {
        attachment = await composeImages(attachments);
      } catch {
        toast.error("画像の準備に失敗しました。もう一度お試しください");
        setSending(false);
        return;
      }
    }

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: trimmed || (attachment ? "(画像を送信しました)" : ""),
      createdAt: new Date().toISOString(),
      imageUrl: attachment?.url,
    };

    // 直前の更新(カードの無効化など)を消さないよう、常に最新の状態に追記する
    setThread((prev) => ({ ...prev, messages: [...prev.messages, userMsg] }));

    setInput("");
    setAttachments([]);
    setStreamingText("");

    try {
      // デモビルドではアップロード先が無いためスキップ(プレビュー表示のみ)
      const imagePath =
        attachment && isEdgeChatAvailable
          ? await uploadChatImage(attachment.file)
          : null;

      if (isEdgeChatAvailable) {
        // Supabase Edge Function `ai-chat` 経由
        const res = await sendAiChat({
          message: trimmed,
          imagePath,
          conversationId: thread.difyConversationId ?? null,
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
        setThread((prev) => ({
          ...prev,
          messages: [...prev.messages, assistantMsg],
          difyConversationId: res.conversation_id ?? prev.difyConversationId,
        }));
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
        thread.difyConversationId
      );
      const assistantMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: reply.answer,
        createdAt: new Date().toISOString(),
        uiType: "text",
      };
      setThread((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMsg],
        difyConversationId:
          reply.difyConversationId ?? prev.difyConversationId,
      }));

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

  /**
   * 食事カードで食材の量を修正 → 修正内容をチャットで送り直し、
   * AIにカロリー・PFCを計算し直してもらう。元のカードは無効化する。
   */
  function recalculateMeal(messageId: string, message: string) {
    if (sending) return;
    setThread((prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m.id === messageId ? { ...m, superseded: true } : m
      ),
    }));
    void sendMessage(message);
  }

  /** 確認カードの「この内容で記録」/「キャンセル」→ confirm-action */
  async function handleDecision(
    messageId: string,
    decision: "confirm" | "reject"
  ) {
    if (confirmingId) return;
    const msg = messages.find((m) => m.id === messageId);
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

      setThread((prev) => ({
        ...prev,
        messages: prev.messages.map((m) =>
          m.id === messageId ? { ...m, decision } : m
        ),
      }));

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
        </div>

        {/* 記録への大きなナビボタン(食事・筋トレ・体重) */}
        <nav className="mt-5 space-y-3 px-4">
          <SidebarBigLink
            to="/log?tab=meal"
            icon={<Utensils className="h-7 w-7" strokeWidth={1.8} />}
            label="食事"
          />
          <SidebarBigLink
            to="/log?tab=workout"
            icon={<Dumbbell className="h-7 w-7" strokeWidth={1.8} />}
            label="筋トレ"
          />
          <SidebarBigLink
            to="/log?tab=weight"
            icon={<Scale className="h-7 w-7" strokeWidth={1.8} />}
            label="体重"
          />
        </nav>

        <div className="flex-1" />
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
          {/* 歯車: タップで回転しながら設定が広がる。オーバーレイより上に置く */}
          <button
            type="button"
            aria-label={settingsOpen ? "設定を閉じる" : "設定"}
            onClick={() => {
              if (settingsOpen) {
                setSettingsOpen(false);
                // 設定で目標等が変わった可能性があるので閉じたら再読込
                void data.reload();
              } else {
                setSettingsOpen(true);
              }
            }}
            className="relative z-50 -m-1 flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-transform active:scale-90"
          >
            <Settings
              className={cn(
                "h-6 w-6 transition-transform duration-[700ms] ease-ios",
                settingsOpen && "rotate-180"
              )}
              strokeWidth={1.8}
            />
          </button>
        </header>

        {/* 設定オーバーレイ(歯車位置からの円形リビール) */}
        {settingsMounted && (
          <div
            className="absolute inset-0 z-40 overflow-y-auto bg-background"
            style={{
              clipPath: settingsShown
                ? "circle(142% at calc(100% - 2rem) calc(max(env(safe-area-inset-top, 0px) + 0.5rem, 0.75rem) + 1.25rem))"
                : "circle(0% at calc(100% - 2rem) calc(max(env(safe-area-inset-top, 0px) + 0.5rem, 0.75rem) + 1.25rem))",
              transition: "clip-path 700ms cubic-bezier(0.32, 0.72, 0, 1)",
            }}
          >
            <div
              style={{
                paddingTop:
                  "calc(max(env(safe-area-inset-top, 0px) + 0.5rem, 0.75rem) + 3rem)",
              }}
            >
              <SettingsPage embedded />
            </div>
          </div>
        )}

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

        {/* カメラ撮影シート(撮影 → 追加撮影 → 入力欄に添付) */}
        <CameraSheet
          open={cameraOpen}
          onClose={() => setCameraOpen(false)}
          onAdd={(shots) => {
            setCameraOpen(false);
            setAttachments((prev) => [
              ...prev,
              ...shots.map((s) => ({ id: uid(), ...s })),
            ]);
          }}
        />

        {/* メッセージ領域(全履歴が1本のスレッドとして積み重なる) */}
        <div
          ref={scrollAreaRef}
          onScroll={maybeLoadOlder}
          className="flex-1 space-y-5 overflow-y-auto px-5 py-3"
        >
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

          {visibleMessages.map((m, i) => (
            <Fragment key={m.id}>
              {/* 日付が変わる箇所にLINE風のセパレーターを挟む */}
              {(i === 0 ||
                !isSameDay(visibleMessages[i - 1].createdAt, m.createdAt)) && (
                <DaySeparator label={dayLabel(m.createdAt)} />
              )}
              {m.role === "user" ? (
                <UserMessage content={m.content} imageUrl={m.imageUrl} />
              ) : (
                <div>
                  <AssistantMessage content={sanitizeAssistantText(m.content)} />
                  {m.uiType && m.uiType !== "text" && (
                    <ChatActionCard
                      uiType={m.uiType as UiType}
                      actionData={m.actionData}
                      safety={m.safety}
                      decision={m.decision}
                      superseded={m.superseded}
                      busy={confirmingId !== null}
                      onConfirm={() => handleDecision(m.id, "confirm")}
                      onReject={() => handleDecision(m.id, "reject")}
                      onRecalculate={(message) => recalculateMeal(m.id, message)}
                    />
                  )}
                  {/* 候補チップは最新メッセージにだけ出す(過去の履歴に残さない) */}
                  {m.suggestions &&
                    m.suggestions.length > 0 &&
                    !m.decision &&
                    m.id === messages[messages.length - 1]?.id && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {m.suggestions
                          .filter(
                            // 確認カードのボタンと重複する候補は出さない
                            (s) =>
                              !DUPLICATE_OF_CARD_BUTTONS.some((d) =>
                                s.includes(d)
                              )
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
              )}
            </Fragment>
          ))}

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

        {/* 添付画像プレビュー(入力欄の上。メッセージと一緒に送信される) */}
        {attachments.length > 0 && (
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 pt-1">
            {attachments.map((a, i) => (
              <div key={a.id} className="relative shrink-0 animate-pop-in">
                <img
                  src={a.url}
                  alt={`添付画像 ${i + 1}枚目`}
                  className="h-20 w-20 rounded-[12px] border object-cover"
                />
                <button
                  type="button"
                  aria-label={`${i + 1}枚目の添付を取り消す`}
                  onClick={() =>
                    setAttachments((prev) => {
                      URL.revokeObjectURL(a.url);
                      return prev.filter((x) => x.id !== a.id);
                    })
                  }
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              </div>
            ))}
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
                setAttachments((prev) => [
                  ...prev,
                  { id: uid(), file: f, url: URL.createObjectURL(f) },
                ]);
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
              disabled={sending || (!input.trim() && attachments.length === 0)}
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

/** サイドバーの大きな記録ナビボタン(カード型・タップで各記録ページへ) */
function SidebarBigLink({
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
      className="flex w-full items-center gap-4 rounded-[18px] border bg-card px-5 py-5 text-[19px] font-medium text-foreground transition-transform ease-ios active:scale-[0.97]"
    >
      <span className="text-primary">{icon}</span>
      {label}
    </Link>
  );
}

/** LINE風の日付セパレーター(その日の最初のメッセージの上に出るチップ) */
function DaySeparator({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-1">
      <span className="rounded-full bg-muted px-3.5 py-1 text-[12px] text-muted-foreground [font-variant-numeric:tabular-nums]">
        {label}
      </span>
    </div>
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
