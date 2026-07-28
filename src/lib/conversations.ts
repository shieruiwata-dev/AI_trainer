import type { ChatMessage } from "@/lib/types";
import { uid } from "@/lib/utils";

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  /** Dify 側の会話ID(コンテキスト継続用) */
  difyConversationId?: string;
  pinned?: boolean;
  updatedAt: string; // ISO
}

const KEY = "fitcoach.conversations";
const LEGACY_HISTORY_KEY = "fitcoach.chat_history";
const LEGACY_DIFY_KEY = "fitcoach.dify_conversation_id";
const MAX_CONVERSATIONS = 100;

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Conversation[];
    // 旧形式(単一会話)からの移行
    const legacy = localStorage.getItem(LEGACY_HISTORY_KEY);
    if (legacy) {
      const messages = JSON.parse(legacy) as ChatMessage[];
      localStorage.removeItem(LEGACY_HISTORY_KEY);
      if (messages.length > 0) {
        const conv: Conversation = {
          id: uid(),
          title: titleFrom(messages),
          messages,
          difyConversationId:
            localStorage.getItem(LEGACY_DIFY_KEY) ?? undefined,
          updatedAt: new Date().toISOString(),
        };
        localStorage.removeItem(LEGACY_DIFY_KEY);
        saveConversations([conv]);
        return [conv];
      }
    }
    return [];
  } catch {
    return [];
  }
}

export function saveConversations(list: Conversation[]) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_CONVERSATIONS)));
}

export function titleFrom(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  const text = (first?.content ?? "新しい会話").replace(/\s+/g, " ").trim();
  return text.length > 20 ? `${text.slice(0, 20)}…` : text;
}

/** ピン留め優先 + 更新日時の新しい順 */
export function sortConversations(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

/** 会話全体を共有用テキストに変換 */
export function conversationToText(conv: Conversation): string {
  return conv.messages
    .map((m) => `${m.role === "user" ? "自分" : "トレーナー"}: ${m.content}`)
    .join("\n\n");
}
