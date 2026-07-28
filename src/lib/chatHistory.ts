import type { ChatMessage } from "@/lib/types";

const KEY = "fitcoach.chat_history";
const MAX_MESSAGES = 200;

export function loadChatHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

export function saveChatHistory(messages: ChatMessage[]) {
  localStorage.setItem(KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)));
}

export function clearChatHistory() {
  localStorage.removeItem(KEY);
}
