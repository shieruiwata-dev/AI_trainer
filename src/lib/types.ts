export type GoalType = "diet" | "bulk" | "maintain";

export interface Profile {
  name: string;
  goalType: GoalType;
  heightCm: number | null;
  startWeightKg: number | null;
  targetWeightKg: number | null;
  targetCalories: number | null;
}

export interface WeightLog {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  note?: string;
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

export type WorkoutCategory = "strength" | "cardio" | "stretch";

export interface WorkoutLog {
  id: string;
  date: string;
  category: WorkoutCategory;
  name: string;
  detail?: string; // 例: "3セット x 10回" / "30分"
  note?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string; // ISO
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
