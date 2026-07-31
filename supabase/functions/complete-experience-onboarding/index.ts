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

    const { error } = await service.from("profiles").upsert(
      {
        user_id: userId,
        training_experience: answers.training_duration,
        training_load_management: answers.training_load_management,
        pfc_knowledge: answers.pfc_knowledge,
        food_logging_experience: answers.food_logging_experience,
        experience_assessed_at: new Date().toISOString(),
        onboarding_step: "goal",
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) {
      console.error("complete_experience_onboarding_failed", error.message);
      return json(500, { ok: false, message: "保存に失敗しました。" });
    }

    return json(200, { ok: true, next: "goal" });
  } catch (error) {
    console.error("complete_experience_onboarding_unhandled", error);
    return json(500, { ok: false, message: "保存に失敗しました。" });
  }
});
