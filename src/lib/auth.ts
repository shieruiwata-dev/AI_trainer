import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { resetStore } from "@/lib/store";

/** アプリがこの端末に保存するデータのキーはすべてこの接頭辞を持つ */
const STORAGE_PREFIX = "fitcoach.";

/**
 * ログアウトする。
 *
 * Supabaseのセッションを破棄したうえで、**この端末に残るアプリのデータを全て消す**。
 * 消さないと、同じ端末で別の人がログインしたときに前の人のチャット本文や
 * 身体情報(体重・身長・年齢・性別)がそのまま見えてしまうため。
 *
 * 消す対象は `fitcoach.` で始まるキーを走査して決める(個別に列挙しない)。
 * 新しい保存キーが増えたときに消し漏れる事故を防ぐのが狙い。
 *
 * サーバーに保存済みの記録・チャット履歴は消えないので、再ログインすれば戻る
 * (履歴は `lib/serverConversations.ts` が `ai_messages` から取り直す)。
 */
export async function signOut(): Promise<void> {
  if (isSupabaseConfigured) {
    // セッション破棄に失敗しても端末側の掃除は続ける(残す方が危険なため)
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("sign out failed", e);
    }
  }

  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch (e) {
    console.error("local data cleanup failed", e);
  }

  resetStore();
}
