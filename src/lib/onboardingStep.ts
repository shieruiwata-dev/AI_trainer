import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";

/** 目標設計オンボーディングの進行状況(profiles.onboarding_step) */
export const GOAL_STEPS = [
  "goal_purpose",
  "goal_body",
  "goal_timeline",
  "goal_proposal",
] as const;

export type GoalStep = (typeof GOAL_STEPS)[number];

export const GOAL_STEP_ROUTES: Record<GoalStep, string> = {
  goal_purpose: "/onboarding/purpose",
  goal_body: "/onboarding/body",
  goal_timeline: "/onboarding/timeline",
  goal_proposal: "/onboarding/proposal",
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
