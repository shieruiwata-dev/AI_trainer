import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const OPTIONS = {
  training_duration: ["none", "under_six_months", "six_months_to_two_years", "over_two_years"],
  training_load_management: ["unknown", "intuitive", "previous_record", "rpe_rir"],
  pfc_knowledge: ["none", "heard", "understands", "can_manage"],
  food_logging_experience: ["none", "few_days", "under_one_month", "over_one_month"],
} as const;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, message: "この操作には対応していません。" });

  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json(401, { ok: false, message: "ログインしてください。" });

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    const userId = authData.user?.id;
    if (authError || !userId) return json(401, { ok: false, message: "ログインしてください。" });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const answers: Record<string, string> = {};
    for (const [key, allowed] of Object.entries(OPTIONS)) {
      const value = typeof body[key] === "string" ? (body[key] as string) : "";
      if (!(allowed as readonly string[]).includes(value)) {
        return json(400, { ok: false, message: `invalid_${key}` });
      }
      answers[key] = value;
    }

    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const MONTHS: Record<string, number> = {
      none: 0,
      under_six_months: 3,
      six_months_to_two_years: 12,
      over_two_years: 36,
    };
    const trainingScore =
      ({ none: 0, under_six_months: 1, six_months_to_two_years: 2, over_two_years: 3 }[
        answers.training_duration
      ] ?? 0) +
      ({ unknown: 0, intuitive: 1, previous_record: 2, rpe_rir: 3 }[
        answers.training_load_management
      ] ?? 0);
    const nutritionScore =
      ({ none: 0, heard: 1, understands: 2, can_manage: 3 }[answers.pfc_knowledge] ?? 0) +
      ({ none: 0, few_days: 1, under_one_month: 2, over_one_month: 3 }[
        answers.food_logging_experience
      ] ?? 0);
    const level = (score: number) =>
      score >= 5 ? "advanced" : score >= 2 ? "intermediate" : "beginner";
    const trainingLevel = level(trainingScore);
    const nutritionLevel = level(nutritionScore);
    const trainingExperienceMonths = MONTHS[answers.training_duration] ?? 0;

    const { error } = await service.from("profiles").upsert(
      {
        user_id: userId,
        training_level: trainingLevel,
        nutrition_level: nutritionLevel,
        training_experience_months: trainingExperienceMonths,
        training_experience: answers.training_duration,
        training_load_management: answers.training_load_management,
        pfc_knowledge: answers.pfc_knowledge,
        food_logging_experience: answers.food_logging_experience,
        experience_assessed_at: new Date().toISOString(),
        onboarding_step: "target_period",
        onboarding_completed: false,
        onboarding_completed_at: null,
      },
      { onConflict: "user_id" }
    );
    if (error) {
      console.error("complete_experience_onboarding_failed", error.message);
      return json(500, { ok: false, message: "保存に失敗しました。" });
    }

    return json(200, {
      ok: true,
      next: "target_period",
      training_level: trainingLevel,
      nutrition_level: nutritionLevel,
      training_experience_months: trainingExperienceMonths,
      training_load_management: answers.training_load_management,
      pfc_knowledge: answers.pfc_knowledge,
      food_logging_experience: answers.food_logging_experience,
    });
  } catch (error) {
    console.error("complete_experience_onboarding_unhandled", error);
    return json(500, { ok: false, message: "保存に失敗しました。" });
  }
});
