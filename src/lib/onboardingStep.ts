import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";

/** 目標設計オンボーディングの進行状況(profiles.onboarding_step) */
export const GOAL_STEPS = [
  "goal_purpose",
  "goal_body",
  "goal_activity",
  "experience",
  "target_period",
  "goal_proposal",
] as const;

export type GoalStep = (typeof GOAL_STEPS)[number];

export const GOAL_STEP_ROUTES: Record<GoalStep, string> = {
  goal_purpose: "/onboarding/purpose",
  goal_body: "/onboarding/body",
  goal_activity: "/onboarding/activity",
  experience: "/onboarding/experience",
  target_period: "/onboarding/timeline",
  goal_proposal: "/onboarding/proposal",
};

/** 画面上の進捗表示(Step X / 6) */
export const GOAL_STEP_TOTAL = 6;
export const GOAL_STEP_INDEX: Record<GoalStep, number> = {
  goal_purpose: 1,
  goal_body: 2,
  goal_activity: 3,
  experience: 4,
  target_period: 5,
  goal_proposal: 6,
};

export function isGoalStep(value: unknown): value is GoalStep {
  return typeof value === "string" && (GOAL_STEPS as readonly string[]).includes(value);
}

/** 現在のステップを profiles に保存する(失敗しても画面遷移は止めない) */
export async function setOnboardingStep(step: GoalStep | "done") {
  if (!isSupabaseConfigured) return;
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return;
  await supabase
    .from("profiles")
    .update({ onboarding_step: step })
    .eq("user_id", userId);
}

/**
 * オンボーディング完了。AI目標プランをユーザーが承認したときだけ呼ぶ。
 */
export async function completeOnboarding() {
  if (!isSupabaseConfigured) return;
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return;
  await supabase
    .from("profiles")
    .update({
      onboarding_step: "done",
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

export interface ExperienceProfile {
  training_level: string | null;
  nutrition_level: string | null;
  training_experience_months: number | null;
  training_load_management: string | null;
  pfc_knowledge: string | null;
  food_logging_experience: string | null;
  experience_assessed_at: string | null;
}

/**
 * 経験ヒアリングが完了しているか。
 * デフォルト値の beginner が入っていても experience_assessed_at が null なら未完了扱い。
 */
export function isExperienceAssessed(
  profile: Partial<ExperienceProfile> | null | undefined
): boolean {
  if (!profile) return false;
  if (!profile.experience_assessed_at) return false;
  return Boolean(profile.training_level && profile.nutrition_level);
}

/** 経験ヒアリングの結果を取得する */
export async function fetchExperienceProfile(): Promise<ExperienceProfile | null> {
  if (!isSupabaseConfigured) return null;
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return null;
  const { data } = await supabase
    .from("profiles")
    .select(
      "training_level, nutrition_level, training_experience_months, training_load_management, pfc_knowledge, food_logging_experience, experience_assessed_at"
    )
    .eq("user_id", userId)
    .maybeSingle();
  return (data as ExperienceProfile | null) ?? null;
}
