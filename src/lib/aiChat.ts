import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";

/**
 * Supabase Edge Functions (`ai-chat` / `confirm-action`) 連携層。
 * - チャット送信 → `ai-chat`
 * - AI提案の保存/却下 → `confirm-action`
 */

export type UiType =
  | "text"
  | "onboarding_question"
  | "goal_confirmation"
  | "meal_confirmation"
  | "weight_confirmation"
  | "workout_plan"
  | "workout_set"
  | "safety_notice"
  | "error";

export interface PendingAction {
  pending_action_id?: string;
  action?: {
    type?: string;
    payload?: Record<string, unknown>;
  };
  [key: string]: unknown;
}

export interface AiChatResponse {
  message: string;
  ui_type: UiType;
  intent?: string;
  data?: PendingAction | null;
  conversation_id?: string;
  suggestions?: string[];
  safety?: { level?: string; note?: string };
  /** 目標設計フロー(ui_type: goal_confirmation)の提案内容 */
  proposal?: Record<string, unknown> | null;
  /** onboarding_question などの選択肢 */
  quick_replies?: string[];
  /** 目標設計オンボーディングでDifyが収集済みと返した項目 */
  collected_fields?: Record<string, unknown>;
}


export const isEdgeChatAvailable = isSupabaseConfigured;

/** チャットメッセージを ai-chat に送信 */
export async function sendAiChat(params: {
  message: string;
  imagePath?: string | null;
  conversationId?: string | null;
  /** 目標設計オンボーディングで収集済みの項目 */
  onboardingState?: Record<string, unknown> | null;
}): Promise<AiChatResponse> {
  try {
    const goalContext = params.onboardingState
      ? { onboarding_state: params.onboardingState }
      : null;
    console.log("[ai-chat] goal_context before invoke", goalContext);
    console.log("ai-chat invoke start", {
      functionName: "ai-chat",
      hasMessage: Boolean(params.message.trim()),
      hasImage: Boolean(params.imagePath),
      hasOnboardingState: Boolean(goalContext?.onboarding_state),
    });
    const { data, error } = await supabase.functions.invoke("ai-chat", {
      body: {
        message: params.message.trim(),
        image_path: params.imagePath ?? null,
        conversation_id: params.conversationId ?? null,
        ...(goalContext
          ? {
              goal_context: goalContext,
              profile_context: goalContext,
            }
          : {}),
      },
    });

    console.log("ai-chat invoke completed", { hasData: Boolean(data), error });
    if (error) {
      console.error("ai-chat invoke error", error);
      throw error;
    }
    console.log("ai-chat response", data);
    if (!data) {
      throw new Error("AIトレーナーから応答がありませんでした");
    }

    const res = data as Partial<AiChatResponse> & { data?: Record<string, unknown> };
    const nested = (res.data ?? {}) as Record<string, unknown>;
    const proposal =
      (res.proposal && typeof res.proposal === "object"
        ? (res.proposal as Record<string, unknown>)
        : null) ??
      (nested.proposal && typeof nested.proposal === "object"
        ? (nested.proposal as Record<string, unknown>)
        : null);
    const quickReplies = Array.isArray(res.quick_replies)
      ? res.quick_replies.filter((q): q is string => typeof q === "string")
      : Array.isArray(nested.quick_replies)
        ? (nested.quick_replies as unknown[]).filter(
            (q): q is string => typeof q === "string"
          )
        : [];
    const collectedFields =
      res.collected_fields && typeof res.collected_fields === "object"
        ? (res.collected_fields as Record<string, unknown>)
        : nested.collected_fields && typeof nested.collected_fields === "object"
          ? (nested.collected_fields as Record<string, unknown>)
          : null;
    return {
      message: res.message ?? "",
      ui_type: (res.ui_type as UiType) ?? "text",
      intent: res.intent,
      data: (res.data as PendingAction) ?? null,
      conversation_id: res.conversation_id,
      suggestions: res.suggestions ?? [],
      safety: res.safety,
      proposal,
      quick_replies: quickReplies,
      collected_fields: collectedFields ?? undefined,
    };

  } catch (error) {
    console.error("ai-chat invoke catch", error);
    throw error;
  }
}

export interface ConfirmActionResult {
  message?: string;
  status?: string;
  [key: string]: unknown;
}

/** AI提案を確定 / 却下する */
export async function confirmAction(params: {
  pendingActionId: string;
  decision: "confirm" | "reject";
  overrides?: Record<string, unknown>;
}): Promise<ConfirmActionResult> {
  const { data, error } = await supabase.functions.invoke("confirm-action", {
    body: {
      pending_action_id: params.pendingActionId,
      decision: params.decision,
      overrides: params.overrides ?? {},
    },
  });

  if (error) {
    throw new Error(error.message || "保存に失敗しました");
  }
  return (data ?? {}) as ConfirmActionResult;
}

/**
 * 目標提案カードの「この目標で始める」→ confirm-goal。
 * invoke の error がなければ成功扱い(data.ok === true / status: confirmed も同様)。
 * 明示的に data.error / ok === false が返ったときだけ失敗にする。
 */
export async function confirmGoal(
  proposal: Record<string, unknown>
): Promise<ConfirmActionResult> {
  const { data, error } = await supabase.functions.invoke("confirm-goal", {
    body: { proposal },
  });

  if (error) {
    console.error("confirm-goal error", error);
    throw new Error("目標の保存に失敗しました。もう一度お試しください。");
  }

  const result = (data ?? {}) as ConfirmActionResult & {
    ok?: boolean;
    error?: string;
  };

  if (result.ok === false || (result.ok !== true && result.error)) {
    console.error("confirm-goal failed response", data);
    throw new Error("目標の保存に失敗しました。もう一度お試しください。");
  }

  return result;
}


/** ui_type ごとのカード見出し */
export const UI_TYPE_TITLE: Partial<Record<UiType, string>> = {
  onboarding_question: "初期設定",
  goal_confirmation: "目標の確認",
  meal_confirmation: "食事の記録",
  weight_confirmation: "体重の記録",
  workout_plan: "トレーニングメニュー",
  workout_set: "セットの記録",
  safety_notice: "安全のご案内",
  error: "エラー",
};

/** 確認カード(=確定ボタンを出す)系の ui_type */
export function isConfirmationUi(ui: UiType): boolean {
  return (
    ui === "goal_confirmation" ||
    ui === "meal_confirmation" ||
    ui === "weight_confirmation" ||
    ui === "workout_plan" ||
    ui === "workout_set"
  );
}

/** ユーザーに絶対に見せない内部キー */
export const HIDDEN_KEYS = new Set([
  "action",
  "type",
  "action_type",
  "requires_confirmation",
  "confidence",
  "source_type",
  "image_path",
  "raw_text",
  "raw",
  "raw_payload",
  "dify_message_id",
  "pending_action_id",
  "conversation_id",
  "metadata",
  "meta",
  "user_id",
  "id",
  "created_at",
  "updated_at",
  "extracted",
]);

/** payload をラベル付きで読みやすく整形 */
const PAYLOAD_LABELS: Record<string, string> = {
  name: "内容",
  food_name: "食品",
  meal_type: "区分",
  calories: "カロリー",
  kcal: "カロリー",
  protein_g: "たんぱく質",
  fat_g: "脂質",
  carbs_g: "炭水化物",
  amount_g: "量",
  quantity: "量",
  weight_kg: "体重",
  body_fat_percentage: "体脂肪率",
  target_weight_kg: "目標体重",
  target_calories: "目標カロリー",
  goal_type: "目標",
  deadline: "期限",
  target_date: "期限",
  date: "日付",
  exercise: "種目",
  exercise_name: "種目",
  sets: "セット数",
  set_number: "セット番号",
  reps: "回数",
  weight: "重量",
  rpe: "RPE",
  rest_sec: "休憩",
  body_part: "部位",
  duration_min: "時間",
  estimated_minutes: "目安時間",
  note: "メモ",
  notes: "メモ",
  memo: "メモ",
};

const PAYLOAD_UNITS: Record<string, string> = {
  calories: "kcal",
  kcal: "kcal",
  protein_g: "g",
  fat_g: "g",
  carbs_g: "g",
  amount_g: "g",
  weight_kg: "kg",
  body_fat_percentage: "%",
  target_weight_kg: "kg",
  target_calories: "kcal",
  duration_min: "分",
  estimated_minutes: "分",
  rest_sec: "秒",
};

const GOAL_TYPE_TEXT: Record<string, string> = {
  diet: "ダイエット(減量)",
  cut: "ダイエット(減量)",
  lose: "ダイエット(減量)",
  bulk: "増量(筋肥大)",
  gain: "増量(筋肥大)",
  maintain: "現状維持",
};

const MEAL_TYPE_TEXT: Record<string, string> = {
  breakfast: "朝食",
  lunch: "昼食",
  dinner: "夕食",
  snack: "間食",
};

export interface PayloadRow {
  key: string;
  label: string;
  value: string;
}

export function labelFor(key: string): string {
  return PAYLOAD_LABELS[key] ?? key;
}

export function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (key === "goal_type" && typeof value === "string") {
    return GOAL_TYPE_TEXT[value] ?? value;
  }
  if ((key === "meal_type" || key === "type") && typeof value === "string") {
    return MEAL_TYPE_TEXT[value] ?? value;
  }
  if (typeof value === "boolean") return value ? "あり" : "なし";
  return `${value}${PAYLOAD_UNITS[key] ?? ""}`;
}

/** ISO日時を「YYYY年MM月DD日 HH時MM分」形式に変換 */
export function formatJapaneseDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}年${map.month}月${map.day}日 ${map.hour}時${map.minute}分`;
}


/** 内部キー / オブジェクトを除外した、表示可能な行だけを返す */
export function payloadRows(
  payload?: Record<string, unknown> | null,
  omit: string[] = []
): PayloadRow[] {
  if (!payload) return [];
  const omitSet = new Set(omit);
  return Object.entries(payload)
    .filter(
      ([k, v]) =>
        !HIDDEN_KEYS.has(k) &&
        !omitSet.has(k) &&
        typeof v !== "object" &&
        v !== null &&
        v !== undefined &&
        v !== ""
    )
    .map(([key, value]) => ({
      key,
      label: labelFor(key),
      value: formatValue(key, value),
    }));
}

/** action.payload を安全に取り出す(表示には whitelist のみ使う) */
export function getPayload(
  actionData?: Record<string, unknown> | null
): Record<string, unknown> {
  const action = actionData?.action as
    | { payload?: Record<string, unknown> }
    | undefined;
  const payload = action?.payload;
  if (payload && typeof payload === "object") return payload;
  return {};
}

export function pickString(
  obj: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

export function pickNumber(
  obj: Record<string, unknown>,
  ...keys: string[]
): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
      return Number(v);
    }
  }
  return undefined;
}

export function pickArray(
  obj: Record<string, unknown>,
  ...keys: string[]
): Record<string, unknown>[] {
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v)) {
      return v.map((item) =>
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : { name: String(item) }
      );
    }
  }
  return [];
}

export function pickStringList(
  obj: Record<string, unknown>,
  ...keys: string[]
): string[] {
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v)) {
      return v
        .map((item) => (typeof item === "string" ? item : ""))
        .filter(Boolean);
    }
    if (typeof v === "string" && v.trim()) return [v.trim()];
  }
  return [];
}

/**
 * AIの本文にJSONがそのまま入っていた場合、ユーザーには見せない。
 * message フィールドがあればそれだけを取り出す。
 */
export function sanitizeAssistantText(raw: string): string {
  const text = (raw ?? "").trim();
  if (!text) return "";

  const stripFence = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();

  const looksJson =
    (stripFence.startsWith("{") && stripFence.endsWith("}")) ||
    (stripFence.startsWith("[") && stripFence.endsWith("]"));

  if (!looksJson) return text;

  try {
    const parsed = JSON.parse(stripFence);
    console.log("[chat] raw JSON response (dev only)", parsed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const msg = (parsed as Record<string, unknown>).message;
      if (typeof msg === "string") return sanitizeAssistantText(msg);
    }
    return "";
  } catch {
    console.log("[chat] unparsable JSON-like response hidden from UI");
    return "";
  }
}

