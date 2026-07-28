import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/types";

/**
 * AI トレーナーとのチャット接続層。優先順位:
 * 1. Supabase Edge Function `dify-chat` 経由(本番想定。Dify の API キーはサーバー側で保持)
 * 2. Dify API 直接接続(VITE_DIFY_API_URL + VITE_DIFY_API_KEY 設定時。ローカル開発用)
 * 3. デモモード(どちらも未設定のとき。定型応答でプレビュー可能)
 */

export interface TrainerContext {
  profile: Profile;
  latestWeightKg: number | null;
  todayCalories: number;
  todayWorkouts: number;
  streakDays: number;
}

export type TrainerMode = "edge" | "dify-direct" | "demo";

const DIFY_URL = import.meta.env.VITE_DIFY_API_URL;
const DIFY_KEY = import.meta.env.VITE_DIFY_API_KEY;

export function getTrainerMode(): TrainerMode {
  if (isSupabaseConfigured) return "edge";
  if (DIFY_URL && DIFY_KEY) return "dify-direct";
  return "demo";
}

const CONVERSATION_KEY = "fitcoach.dify_conversation_id";

export function resetConversation() {
  localStorage.removeItem(CONVERSATION_KEY);
}

function buildContext(ctx: TrainerContext): string {
  const goal =
    ctx.profile.goalType === "diet"
      ? "ダイエット(減量)"
      : ctx.profile.goalType === "bulk"
        ? "筋肉をつける(増量)"
        : "現状維持・健康管理";
  const parts = [
    `目標: ${goal}`,
    ctx.profile.name ? `名前: ${ctx.profile.name}` : null,
    ctx.latestWeightKg != null ? `現在の体重: ${ctx.latestWeightKg}kg` : null,
    ctx.profile.targetWeightKg != null
      ? `目標体重: ${ctx.profile.targetWeightKg}kg`
      : null,
    ctx.profile.targetCalories != null
      ? `1日の目標カロリー: ${ctx.profile.targetCalories}kcal`
      : null,
    `今日の摂取カロリー: ${ctx.todayCalories}kcal`,
    `今日のトレーニング記録数: ${ctx.todayWorkouts}件`,
    `連続記録日数: ${ctx.streakDays}日`,
  ];
  return parts.filter(Boolean).join(" / ");
}

/**
 * メッセージを送信し、応答をストリーミングで受け取る。
 * onChunk は応答本文の増分ごとに呼ばれる。戻り値は完全な応答。
 */
export async function sendToTrainer(
  message: string,
  ctx: TrainerContext,
  onChunk: (partial: string) => void
): Promise<string> {
  const mode = getTrainerMode();
  if (mode === "demo") {
    return demoReply(message, ctx, onChunk);
  }

  const conversationId = localStorage.getItem(CONVERSATION_KEY) ?? "";
  const body = {
    query: message,
    inputs: { context: buildContext(ctx) },
    response_mode: "streaming",
    conversation_id: conversationId,
    user: "fitcoach-user",
  };

  let url: string;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (mode === "edge") {
    url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dify-chat`;
    const { data } = await supabase!.auth.getSession();
    const token =
      data.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY!;
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    url = `${DIFY_URL!.replace(/\/$/, "")}/chat-messages`;
    headers["Authorization"] = `Bearer ${DIFY_KEY}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`AIトレーナーに接続できませんでした (${res.status}) ${text}`);
  }

  // Dify の SSE ストリームをパース
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload);
        if (event.event === "message" || event.event === "agent_message") {
          answer += event.answer ?? "";
          onChunk(answer);
        } else if (event.event === "message_end") {
          if (event.conversation_id) {
            localStorage.setItem(CONVERSATION_KEY, event.conversation_id);
          }
        } else if (event.event === "error") {
          throw new Error(event.message ?? "Dify でエラーが発生しました");
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue; // 分割されたJSONは無視
        throw e;
      }
    }
  }

  return answer;
}

// ---------- デモモード ----------

const DEMO_NOTICE =
  "\n\n---\n※ 現在デモモードです。Supabase / Dify を接続すると本物のAIトレーナーと会話できます。";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function demoAnswer(message: string, ctx: TrainerContext): string {
  const m = message.toLowerCase();
  const name = ctx.profile.name ? `${ctx.profile.name}さん` : "あなた";

  if (/(食事|ご飯|ごはん|カロリー|食べ|メニュー|レシピ)/.test(message)) {
    const remain =
      ctx.profile.targetCalories != null
        ? `今日はあと約${Math.max(
            0,
            ctx.profile.targetCalories - ctx.todayCalories
          )}kcal摂れますよ。`
        : "";
    return `食事のことですね!${remain}\n\nおすすめは「高たんぱく・低脂質」を意識することです。\n- 鶏むね肉・魚・卵・豆腐を主菜に\n- 野菜を先に食べて血糖値の急上昇を防ぐ\n- 間食はナッツやプロテインに置き換え\n\n今日食べたものを記録画面から入力してくれれば、もっと具体的なアドバイスができます💪`;
  }
  if (/(筋トレ|トレーニング|運動|メニュー|スクワット|腹筋|walking|ランニング|有酸素)/.test(message)) {
    return `トレーニングの相談ですね!今日はすでに${ctx.todayWorkouts}件の記録があります。\n\n初心者〜中級者向けの自宅メニュー例:\n1. スクワット 15回 × 3セット\n2. プッシュアップ 10回 × 3セット\n3. プランク 30秒 × 3セット\n\n大事なのは重さより「継続」です。終わったら記録画面に入力して、一緒に積み上げていきましょう🔥`;
  }
  if (/(体重|痩せ|減ら|増え|停滞)/.test(message)) {
    const w =
      ctx.latestWeightKg != null && ctx.profile.targetWeightKg != null
        ? `現在${ctx.latestWeightKg}kg、目標${ctx.profile.targetWeightKg}kgですね。`
        : "";
    return `${w}体重は日々変動するので、1週間の平均で見るのがコツです。\n\n停滞期が来ても大丈夫。体が変化に適応している証拠なので、焦らず「記録を続ける」ことだけ守りましょう。${name}ならできます!`;
  }
  if (/(つらい|辛い|やめたい|しんどい|疲れ|モチベ|やる気)/.test(message)) {
    return pick([
      `そう感じる日もありますよね。でも${name}はすでに${ctx.streakDays}日間も続けています。それ自体がすごいことです。\n\n今日は「軽いストレッチだけ」でもOK。ゼロにしないことが一番大事です🌱`,
      `頑張りすぎているサインかもしれません。休むのもトレーニングのうち。\n\n睡眠をしっかりとって、明日また一緒に頑張りましょう。私はいつでもここにいます😊`,
    ]);
  }
  if (/(こんにちは|こんばんは|おはよう|はじめまして|やあ|hello|hi)/i.test(m)) {
    return `こんにちは、${name}!AIトレーナーのコーチです💪\n\n食事・筋トレ・ダイエットのことなら何でも聞いてください。まずは今日の調子はどうですか?`;
  }
  return pick([
    `なるほど!${name}の状況(連続${ctx.streakDays}日記録中)を踏まえると、まずは小さな目標から始めるのがおすすめです。\n\n「食事」「筋トレ」「体重」「モチベーション」など、気になるキーワードで聞いてみてください!`,
    `いい質問ですね!継続のコツは「完璧を目指さない」こと。80点を毎日続ける人が一番結果を出します。\n\n具体的に食事メニューやトレーニング内容についても聞いてくださいね💪`,
  ]);
}

async function demoReply(
  message: string,
  ctx: TrainerContext,
  onChunk: (partial: string) => void
): Promise<string> {
  const full = demoAnswer(message, ctx) + DEMO_NOTICE;
  // タイピング風に少しずつ流す
  let shown = "";
  for (const char of full) {
    shown += char;
    onChunk(shown);
    if (shown.length % 3 === 0) {
      await new Promise((r) => setTimeout(r, 12));
    }
  }
  return full;
}
