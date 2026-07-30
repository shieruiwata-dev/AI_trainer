import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import type { ChatMessage } from "@/lib/types";
import { sortMessages } from "@/lib/thread";

/**
 * サーバー側チャット履歴の読み込み。
 *
 * ai-chat Edge Function は全メッセージを `ai_messages` に保存している。
 * サーバーは元々1つの会話(ai_conversations)にメッセージを積み続ける構造で、
 * UI も単一スレッド(LINE型)になったのでそのまま時系列へ合成すればよい。
 * ここでサーバーの履歴を取得し、ローカルに無い分だけスレッドへ差し込む
 * (別デバイスで履歴が見えない問題の対策)。
 */

const IMAGE_BUCKET = "meal-images";
/** ローカルの記録時刻とサーバーの保存時刻のズレ許容(応答待ち時間ぶん) */
const DEDUPE_WINDOW_MS = 3 * 60 * 1000;
const MAX_MESSAGES = 1000;

/** ai_messages からユーザーの全履歴を取得(新しい方から最大1000件) */
export async function fetchServerMessages(): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from("ai_messages")
      .select("id, conversation_id, role, content, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(MAX_MESSAGES);
    if (error || !data) {
      if (error) console.error("ai_messages fetch error", error);
      return [];
    }

    const messages = data.map((r) => {
      const meta = (r.metadata ?? {}) as Record<string, unknown>;
      return {
        id: r.id,
        role: r.role === "user" ? "user" : "assistant",
        // 履歴表示ではカード用データ(payload等)が無いため本文のみ表示する
        content: r.content ?? "",
        createdAt: r.created_at,
        imagePath:
          typeof meta.image_path === "string" ? meta.image_path : undefined,
      } as ChatMessage & { imagePath?: string };
    });

    await attachImageUrls(messages);
    return sortMessages(messages);
  } catch (e) {
    console.error("server history fetch failed", e);
    return [];
  }
}

/** 添付画像(meal-images)の署名付きURLをまとめて解決する。失敗しても本文表示は続行 */
async function attachImageUrls(
  messages: (ChatMessage & { imagePath?: string })[]
) {
  const withImage = messages.filter((m) => m.imagePath);
  if (withImage.length === 0 || !supabase) return;
  try {
    const paths = [...new Set(withImage.map((m) => m.imagePath!))];
    const { data } = await supabase.storage
      .from(IMAGE_BUCKET)
      .createSignedUrls(paths, 60 * 60 * 24 * 7);
    if (!data) return;
    const urlByPath = new Map(
      data.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl])
    );
    for (const m of withImage) {
      const url = urlByPath.get(m.imagePath!);
      if (url) m.imageUrl = url;
      delete m.imagePath;
    }
  } catch {
    // 画像は表示できなくても致命的ではない
  }
}

/**
 * サーバー履歴をローカルのスレッドへ合成する。
 * すでにローカルにあるメッセージ(=この端末で送受信済み)は
 * ID完全一致 + 内容×時刻の近似一致で除外し、残りを時系列に差し込む。
 * 変更が無ければ元の配列をそのまま返す(不要な再レンダー防止)。
 */
export function mergeServerMessages(
  local: ChatMessage[],
  serverMessages: ChatMessage[]
): ChatMessage[] {
  if (serverMessages.length === 0) return local;

  const localIds = new Set<string>();
  const localByKey = new Map<string, number[]>();
  for (const m of local) {
    localIds.add(m.id);
    const key = `${m.role}|${m.content.trim()}`;
    if (!localByKey.has(key)) localByKey.set(key, []);
    localByKey.get(key)!.push(new Date(m.createdAt).getTime());
  }

  const isKnown = (m: ChatMessage): boolean => {
    if (localIds.has(m.id)) return true;
    const times = localByKey.get(`${m.role}|${m.content.trim()}`);
    if (!times) return false;
    const t = new Date(m.createdAt).getTime();
    return times.some((lt) => Math.abs(lt - t) <= DEDUPE_WINDOW_MS);
  };

  const fresh = serverMessages.filter((m) => !isKnown(m));
  if (fresh.length === 0) return local;
  return sortMessages([...local, ...fresh]);
}
