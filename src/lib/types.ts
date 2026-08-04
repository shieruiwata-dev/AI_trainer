export type GoalType = "diet" | "bulk" | "maintain";

export interface Profile {
  name: string;
  goalType: GoalType;
  heightCm: number | null;
  startWeightKg: number | null;
  targetWeightKg: number | null;
  targetCalories: number | null;
  /** サーバー(goalsテーブル)が算出したPFC目標。無ければフロントで概算する */
  targetProteinG?: number | null;
  targetFatG?: number | null;
  targetCarbsG?: number | null;
  /** 目標達成予定日(goals.target_date)。体重グラフの目標ペース線に使用 */
  targetDate?: string | null;
}

export interface WeightLog {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  note?: string;
  /**
   * この記録が**保存された**日時(測定日時ではない)。
   * 同じ日の体重を後から訂正すると別の行として増えるため、
   * どちらが新しい申告かを判断するのに使う(`lib/weight.ts`)。
   */
  createdAt?: string;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface MealLog {
  id: string;
  date: string;
  mealType: MealType;
  name: string;
  calories: number;
  proteinG?: number | null;
  fatG?: number | null;
  carbsG?: number | null;
}

/** 記録ページ(/log)用の食事詳細。写真パスと時刻つき */
export interface MealDetail {
  id: string;
  date: string;
  /** HH:mm(ローカル時刻)。時刻情報が無い記録では null */
  time: string | null;
  mealType: MealType;
  name: string;
  calories: number;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
  /** meal-images バケット内のパス。写真なしの記録では null */
  imagePath: string | null;
}

export type WorkoutCategory = "strength" | "cardio" | "stretch";

export interface WorkoutLog {
  id: string;
  date: string;
  category: WorkoutCategory;
  /** サーバーの focus_area 生値(shoulders/chest/back/legs/arms/core 等)。部位別集計に使用 */
  focusArea?: string | null;
  name: string;
  detail?: string; // 例: "3セット x 10回" / "30分"
  note?: string;
}

/** セット記録(workout_sets 由来)。上部カード・筋トレ記録ページに表示 */
export interface WorkoutSetRecord {
  id: string;
  /** 紐づくセッション(workout_sessions)のID。部位の特定に使用 */
  sessionId: string | null;
  /** ローカル日付 YYYY-MM-DD */
  date: string;
  exerciseName: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  completedAt: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string; // ISO
  /** 添付画像のプレビューURL(送信時のみ) */
  imageUrl?: string;
  /** ai-chat Edge Function の ui_type(表示切り替え用) */
  uiType?: string;
  /** ai-chat の data(pending_action_id / action など) */
  actionData?: Record<string, unknown> | null;
  suggestions?: string[];
  /** onboarding_question などの選択肢ボタン */
  quickReplies?: string[];
  /** ui_type: goal_confirmation の目標提案 */
  proposal?: Record<string, unknown> | null;
  safety?: { level?: string; note?: string };

  /**
   * サーバー(ai_messages)から取り込んだ履歴であることの印。
   * 端末で送受信したメッセージには付かない。重複排除・修復の判定に使う。
   */
  fromServer?: boolean;

  /** 確認カードの結果: 確定済み / 却下済み */
  decision?: "confirm" | "reject";
  /** 食材の量を修正して再計算したため、このカードは無効 */
  superseded?: boolean;
}


export const MEAL_TYPE_LABEL: Record<MealType, string> = {
  breakfast: "朝食",
  lunch: "昼食",
  dinner: "夕食",
  snack: "間食",
};

export const WORKOUT_CATEGORY_LABEL: Record<WorkoutCategory, string> = {
  strength: "筋トレ",
  cardio: "有酸素",
  stretch: "ストレッチ",
};

export const GOAL_TYPE_LABEL: Record<GoalType, string> = {
  diet: "ダイエット(減量)",
  bulk: "筋肉をつける(増量)",
  maintain: "現状維持・健康管理",
};

export const DEFAULT_PROFILE: Profile = {
  name: "",
  goalType: "diet",
  heightCm: null,
  startWeightKg: null,
  targetWeightKg: null,
  targetCalories: null,
};
