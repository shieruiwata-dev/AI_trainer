import type { ChatMessage } from "@/lib/types";

/**
 * LINE型の単一チャットスレッド管理。
 * 以前は「新規チャット」で会話を切り替える方式(fitcoach.conversations に複数会話)
 * だったが、1本の会話にすべてのメッセージを積み重ねる方式へ移行した。
 * サーバー(ai_messages)は元々1つの会話に積み続ける構造なので、これで一致する。
 */

export interface ChatThread {
  messages: ChatMessage[];
  /** Dify 側の会話ID(コンテキスト継続用) */
  difyConversationId?: string;
}

const KEY = "fitcoach.thread";
const LEGACY_CONVS_KEY = "fitcoach.conversations";
const LEGACY_HISTORY_KEY = "fitcoach.chat_history";
const LEGACY_DIFY_KEY = "fitcoach.dify_conversation_id";
const MAX_MESSAGES = 2000;

export function loadThread(): ChatThread {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as ChatThread;
    return migrateLegacy();
  } catch {
    return { messages: [] };
  }
}

export function saveThread(thread: ChatThread) {
  const messages = thread.messages.slice(-MAX_MESSAGES);
  localStorage.setItem(KEY, JSON.stringify({ ...thread, messages }));
}

/**
 * 旧形式(複数会話リスト / さらに古い単一履歴)を1本のスレッドへ統合する。
 * 旧データは復旧用にそのまま残す(KEY が保存された後は再実行されない)。
 */
function migrateLegacy(): ChatThread {
  interface LegacyConversation {
    messages?: ChatMessage[];
    difyConversationId?: string;
    updatedAt?: string;
  }
  const messages: ChatMessage[] = [];
  let difyConversationId: string | undefined;

  const rawConvs = localStorage.getItem(LEGACY_CONVS_KEY);
  if (rawConvs) {
    const convs = JSON.parse(rawConvs) as LegacyConversation[];
    // Dify会話IDは最後に使っていた会話のものを引き継ぐ
    const withDify = convs
      .filter((c) => c.difyConversationId)
      .sort((a, b) => (a.updatedAt ?? "").localeCompare(b.updatedAt ?? ""));
    difyConversationId = withDify[withDify.length - 1]?.difyConversationId;
    for (const c of convs) messages.push(...(c.messages ?? []));
  } else {
    const rawHistory = localStorage.getItem(LEGACY_HISTORY_KEY);
    if (rawHistory) {
      messages.push(...(JSON.parse(rawHistory) as ChatMessage[]));
      difyConversationId = localStorage.getItem(LEGACY_DIFY_KEY) ?? undefined;
    }
  }

  const thread: ChatThread = {
    messages: sortMessages(dedupeById(messages)),
    difyConversationId,
  };
  if (thread.messages.length > 0 || difyConversationId) saveThread(thread);
  return thread;
}

/** 送信時刻順。同時刻の user / assistant は user(質問)を先にする */
export function sortMessages(list: ChatMessage[]): ChatMessage[] {
  return [...list].sort((a, b) => {
    const c = a.createdAt.localeCompare(b.createdAt);
    if (c !== 0) return c;
    if (a.role === b.role) return 0;
    return a.role === "user" ? -1 : 1;
  });
}

function dedupeById(list: ChatMessage[]): ChatMessage[] {
  const seen = new Set<string>();
  return list.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** 日付セパレーターの表示: 今日 / 昨日 / M月D日(曜)(年が違えば年も) */
export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return "今日";
  if (diffDays === 1) return "昨日";
  const year = d.getFullYear() !== now.getFullYear() ? `${d.getFullYear()}年` : "";
  return `${year}${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAYS[d.getDay()]})`;
}

/** 日付セパレーターを挟むかどうかの判定 */
export function isSameDay(aIso: string, bIso: string): boolean {
  const a = new Date(aIso);
  const b = new Date(bIso);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
