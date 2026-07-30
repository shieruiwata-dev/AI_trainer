import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import type { ChatMessage } from "@/lib/types";
import type { Conversation } from "@/lib/conversations";
import { titleFrom } from "@/lib/conversations";

/**
 * サーバー側チャット履歴の読み込み。
 *
 * ai-chat Edge Function は全メッセージを `ai_messages` に保存しているが、
 * サイドバーの会話リストは localStorage のみだったため、別デバイスでは
 * 履歴が空になっていた。ここでサーバーの履歴を取得し、ローカルに無い分だけ
 * 会話として合成する。
 *
 * 注意: サーバーは1つの会話(ai_conversations)にメッセージを積み続けるため、
 * UI側の「新しいチャット」単位とは一致しない。時間の空き(1時間)で
 * セッションに分割してサイドバーの1エントリにする。
 */

const IMAGE_BUCKET = "meal-images";
const SESSION_GAP_MS = 60 * 60 * 1000;
/** ローカルの記録時刻とサーバーの保存時刻のズレ許容(応答待ち時間ぶん) */
const DEDUPE_WINDOW_MS = 3 * 60 * 1000;
const MAX_MESSAGES = 1000;

interface ServerMessage extends ChatMessage {
  conversationId: string;
}

/** ai_messages からユーザーの全履歴を取得(新しい方から最大1000件) */
export async function fetchServerMessages(): Promise<ServerMessage[]> {
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

    // 古い順へ。user と assistant は同一タイムスタンプで保存されるため、
    // 同時刻なら user(質問)を先にする
    const rows = [...data].sort((a, b) => {
      const c = a.created_at.localeCompare(b.created_at);
      if (c !== 0) return c;
      if (a.role === b.role) return 0;
      return a.role === "user" ? -1 : 1;
    });
    const messages: ServerMessage[] = rows
      .filter((r) => r.conversation_id)
      .map((r) => {
        const meta = (r.metadata ?? {}) as Record<string, unknown>;
        return {
          id: r.id,
          conversationId: r.conversation_id as string,
          role: r.role === "user" ? "user" : "assistant",
          // 履歴表示ではカード用データ(payload等)が無いため本文のみ表示する
          content: r.content ?? "",
          createdAt: r.created_at,
          imagePath:
            typeof meta.image_path === "string" ? meta.image_path : undefined,
        } as ServerMessage & { imagePath?: string };
      });

    await attachImageUrls(messages);
    return messages;
  } catch (e) {
    console.error("server history fetch failed", e);
    return [];
  }
}

/** 添付画像(meal-images)の署名付きURLをまとめて解決する。失敗しても本文表示は続行 */
async function attachImageUrls(
  messages: (ServerMessage & { imagePath?: string })[]
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
 * サーバー履歴をローカルの会話リストへ合成する。
 * - すでにローカルにあるメッセージ(=この端末で送受信済み)は除外
 * - 残りを会話ID+時間の空きでセッション分割して会話エントリにする
 */
export function mergeServerHistory(
  local: Conversation[],
  serverMessages: ServerMessage[]
): Conversation[] {
  if (serverMessages.length === 0) return local;

  // ローカル既存分の索引: ID完全一致 + 内容×時刻の近似一致
  const localIds = new Set<string>();
  const localByKey = new Map<string, number[]>();
  for (const conv of local) {
    for (const m of conv.messages) {
      localIds.add(m.id);
      const key = `${m.role}|${m.content.trim()}`;
      if (!localByKey.has(key)) localByKey.set(key, []);
      localByKey.get(key)!.push(new Date(m.createdAt).getTime());
    }
  }

  const isKnown = (m: ServerMessage): boolean => {
    if (localIds.has(m.id)) return true;
    const times = localByKey.get(`${m.role}|${m.content.trim()}`);
    if (!times) return false;
    const t = new Date(m.createdAt).getTime();
    return times.some((lt) => Math.abs(lt - t) <= DEDUPE_WINDOW_MS);
  };

  const fresh = serverMessages.filter((m) => !isKnown(m));
  if (fresh.length === 0) return local;

  // 会話IDごとに、1時間以上空いたら別セッションとして分割
  const byConv = new Map<string, ServerMessage[]>();
  for (const m of fresh) {
    if (!byConv.has(m.conversationId)) byConv.set(m.conversationId, []);
    byConv.get(m.conversationId)!.push(m);
  }

  const added: Conversation[] = [];
  for (const [convId, msgs] of byConv) {
    let session: ChatMessage[] = [];
    let prevTime = 0;
    const flush = () => {
      if (session.length === 0) return;
      added.push({
        // 決定的なIDにして、再取得時に重複エントリが生まれないようにする
        id: `srv-${convId}-${session[0].id}`,
        title: titleFrom(session),
        messages: session,
        updatedAt: session[session.length - 1].createdAt,
      });
      session = [];
    };
    for (const m of msgs) {
      const t = new Date(m.createdAt).getTime();
      if (session.length > 0 && t - prevTime > SESSION_GAP_MS) flush();
      const { conversationId: _omit, ...msg } = m;
      session.push(msg);
      prevTime = t;
    }
    flush();
  }

  const existingIds = new Set(local.map((c) => c.id));
  const newConvs = added.filter((c) => !existingIds.has(c.id));
  if (newConvs.length === 0) return local;
  return [...local, ...newConvs];
}
