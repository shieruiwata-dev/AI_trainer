import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type JsonObject = Record<string, unknown>;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const asObject = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

const asString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const match = value.replace(/[０-９．]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0)).match(/-?\d+(?:\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
};

const toInt = (value: unknown): number | null => {
  const numeric = toNumber(value);
  return numeric == null ? null : Math.round(numeric);
};

const purposeToGoalType = (purpose: string): string => {
  const normalized = purpose.toLowerCase();
  if (["bulk", "gain", "muscle_gain"].includes(normalized)) return "bulk";
  if (["maintain", "maintenance", "health"].includes(normalized)) return "maintain";
  return "diet";
};

const jsonResponse = (status: number, body: JsonObject) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed", message: "この操作には対応していません。" });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { error: "missing_env", message: "目標の保存に失敗しました。" });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return jsonResponse(401, { error: "unauthorized", message: "ログインが必要です。" });

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    const userId = authData.user?.id;
    if (authError || !userId) return jsonResponse(401, { error: "unauthorized", message: "ログインが必要です。" });

    const body = asObject(await req.json().catch(() => ({})));
    const proposal = asObject(body.proposal);
    if (Object.keys(proposal).length === 0) {
      return jsonResponse(400, { error: "invalid_proposal", message: "目標内容が見つかりません。" });
    }

    const kpis = asObject(proposal.kpis);
    const metrics = asObject(proposal.target_metrics);
    const purpose = asString(proposal.purpose_type ?? proposal.goal_type) || "cut";
    const goalType = purposeToGoalType(purpose);
    const targetDate = asString(proposal.target_date) || null;
    const title = asString(proposal.goal_title ?? proposal.title) || null;

    await serviceClient
      .from("goals")
      .update({ is_active: false, status: "archived" })
      .eq("user_id", userId)
      .eq("is_active", true);

    const { data, error } = await serviceClient
      .from("goals")
      .insert({
        user_id: userId,
        title,
        goal_type: goalType,
        purpose_type: purpose,
        target_weight_kg: toNumber(metrics.body_weight_kg ?? proposal.target_weight_kg),
        target_date: targetDate,
        target_calories: toInt(kpis.daily_calories_kcal ?? proposal.target_calories),
        target_protein_g: toInt(kpis.protein_g ?? proposal.target_protein_g),
        target_fat_g: toInt(kpis.fat_g ?? proposal.target_fat_g),
        target_carbs_g: toInt(kpis.carbs_g ?? proposal.target_carbs_g),
        target_metrics: proposal,
        difficulty: asString(proposal.difficulty) || "normal",
        calculation_version: "dify_goal_v1",
        created_by: "ai",
        is_active: true,
        status: "active",
        start_date: new Date().toISOString().slice(0, 10),
        notes: Array.isArray(proposal.warnings) ? proposal.warnings.map((item) => asString(item)).filter(Boolean).join("\n") : null,
      })
      .select("id")
      .single();
    if (error) throw error;

    return jsonResponse(200, {
      status: "confirmed",
      goal_id: data.id,
      message: "目標を保存しました。今日からこの方針で進めましょう。",
    });
  } catch (error) {
    console.error("confirm_goal_failed", error);
    return jsonResponse(500, { error: "confirm_goal_failed", message: "目標の保存に失敗しました。" });
  }
});