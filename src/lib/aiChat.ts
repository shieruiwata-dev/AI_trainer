import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

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
}

export const isEdgeChatAvailable = isSupabaseConfigured;

/** チャットメッセージを ai-chat に送信 */
export async function sendAiChat(params: {
  message: string;
  imagePath?: string | null;
  conversationId?: string | null;
}): Promise<AiChatResponse> {
  if (!supabase) throw new Error("バックエンドに接続されていません");

  const { data, error } = await supabase.functions.invoke("ai-chat", {
    body: {
      message: params.message,
      image_path: params.imagePath ?? null,
      conversation_id: params.conversationId ?? null,
    },
  });

  if (error) {
    throw new Error(error.message || "AIトレーナーに接続できませんでした");
  }
  if (!data) {
    throw new Error("AIトレーナーから応答がありませんでした");
  }

  const res = data as Partial<AiChatResponse>;
  return {
    message: res.message ?? "",
    ui_type: (res.ui_type as UiType) ?? "text",
    intent: res.intent,
    data: (res.data as PendingAction) ?? null,
    conversation_id: res.conversation_id,
    suggestions: res.suggestions ?? [],
    safety: res.safety,
  };
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
  if (!supabase) throw new Error("バックエンドに接続されていません");

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
  target_weight_kg: "目標体重",
  target_calories: "目標カロリー",
  goal_type: "目標",
  date: "日付",
  exercise: "種目",
  sets: "セット数",
  reps: "回数",
  duration_min: "時間",
  note: "メモ",
};

const PAYLOAD_UNITS: Record<string, string> = {
  calories: "kcal",
  kcal: "kcal",
  protein_g: "g",
  fat_g: "g",
  carbs_g: "g",
  amount_g: "g",
  weight_kg: "kg",
  target_weight_kg: "kg",
  target_calories: "kcal",
  duration_min: "分",
};

export interface PayloadRow {
  key: string;
  label: string;
  value: string;
}

export function payloadRows(payload?: Record<string, unknown> | null): PayloadRow[] {
  if (!payload) return [];
  return Object.entries(payload)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .flatMap(([key, value]) => {
      if (typeof value === "object") {
        if (Array.isArray(value)) {
          return [
            {
              key,
              label: PAYLOAD_LABELS[key] ?? key,
              value: value
                .map((v) =>
                  typeof v === "object" ? JSON.stringify(v) : String(v)
                )
                .join(" / "),
            },
          ];
        }
        return payloadRows(value as Record<string, unknown>);
      }
      return [
        {
          key,
          label: PAYLOAD_LABELS[key] ?? key,
          value: `${value}${PAYLOAD_UNITS[key] ?? ""}`,
        },
      ];
    });
}
