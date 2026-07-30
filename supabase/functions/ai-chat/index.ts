import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type JsonObject = Record<string, unknown>;

type NormalizedAction = {
  type: string;
  requires_confirmation: boolean;
  confidence: number;
  payload: JsonObject;
};

type NormalizedAiResult = {
  message: string;
  ui_type: string;
  intent: string;
  action: NormalizedAction;
  suggestions: string[];
  quick_replies: string[];
  collected_fields: JsonObject;
  safety: { level: string; note: string };
  proposal: JsonObject | null;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const DIFY_API_KEY = Deno.env.get("DIFY_API_KEY") ?? "";
const DIFY_API_BASE_URL =
  Deno.env.get("DIFY_API_BASE_URL") ??
  Deno.env.get("DIFY_API_URL") ??
  "https://api.dify.ai/v1";

const ALLOWED_UI_TYPES = new Set([
  "text",
  "onboarding_question",
  "goal_confirmation",
  "meal_confirmation",
  "weight_confirmation",
  "workout_plan",
  "workout_set",
  "safety_notice",
  "error",
]);

const ACTION_TO_UI: Record<string, string> = {
  "meal.create": "meal_confirmation",
  "weight.create": "weight_confirmation",
  "workout.start": "workout_plan",
  "workout_set.create": "workout_set",
  "goal.upsert": "goal_confirmation",
  "profile.upsert": "goal_confirmation",
};

const errorResponse = (status: number, message: string, detail?: string) =>
  new Response(
    JSON.stringify({
      error: status >= 500 ? "ai_chat_failed" : "ai_chat_invalid_request",
      message,
      ui_type: "error",
      ...(detail ? { detail } : {}),
    }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );

const asObject = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

const asString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => asString(item)).filter((item) => item.length > 0)
    : [];

const parseJsonObject = (value: unknown): JsonObject => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as JsonObject;
  const text = asString(value);
  if (!text) return {};
  try {
    return asObject(JSON.parse(text));
  } catch {
    return {};
  }
};

const mergeContextJson = (baseJson: string, incoming: unknown): string => {
  const base = parseJsonObject(baseJson);
  const extra = parseJsonObject(incoming);
  const onboardingState = parseJsonObject(extra.onboarding_state);
  const merged: JsonObject = { ...base, ...extra };
  if (Object.keys(onboardingState).length > 0) {
    merged.onboarding_state = {
      ...parseJsonObject(base.onboarding_state),
      ...onboardingState,
    };
  }
  return JSON.stringify(merged);
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/[０-９．]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0)
    );
    const match = normalized.match(/-?\d+(?:\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
};

const toIntOrNull = (value: unknown): number | null => {
  const parsed = toFiniteNumber(value);
  return parsed == null ? null : Math.round(parsed);
};

const toNullableString = (value: unknown): string | null => {
  const text = asString(value);
  return text.length > 0 ? text : null;
};

const toIsoOrNow = (value: unknown): string => {
  const text = asString(value);
  const date = text ? new Date(text) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const normalizePayloadNumbers = (payload: JsonObject): JsonObject => {
  const next: JsonObject = { ...payload };
  const numericKeys = [
    "calories",
    "protein_g",
    "fat_g",
    "carbs_g",
    "confidence",
    "weight_kg",
    "body_fat_percent",
    "height_cm",
    "current_weight_kg",
    "target_weight_kg",
    "target_calories",
    "target_protein_g",
    "target_fat_g",
    "target_carbs_g",
    "weekly_training_days",
    "estimated_minutes",
    "target_sets",
    "target_reps",
    "target_weight_kg",
    "set_number",
    "reps",
    "rpe",
  ];
  for (const key of numericKeys) {
    if (key in next && next[key] !== null && next[key] !== "") {
      const numeric = key.includes("calories") || key.includes("reps") || key.includes("sets") || key === "set_number" || key === "weekly_training_days" || key === "estimated_minutes"
        ? toIntOrNull(next[key])
        : toFiniteNumber(next[key]);
      next[key] = numeric;
    }
  }
  if (Array.isArray(next.items)) {
    next.items = next.items.map((item) => {
      const row = asObject(item);
      return {
        ...row,
        amount: row.amount === "" ? null : toFiniteNumber(row.amount) ?? row.amount ?? null,
        calories: row.calories === "" ? null : toIntOrNull(row.calories),
        protein_g: row.protein_g === "" ? null : toFiniteNumber(row.protein_g),
        fat_g: row.fat_g === "" ? null : toFiniteNumber(row.fat_g),
        carbs_g: row.carbs_g === "" ? null : toFiniteNumber(row.carbs_g),
      };
    });
  }
  if (Array.isArray(next.exercises)) {
    next.exercises = next.exercises.map((item, index) => {
      const row = asObject(item);
      return {
        ...row,
        order: toIntOrNull(row.order) ?? index + 1,
        target_sets: toIntOrNull(row.target_sets) ?? 1,
        target_reps: toIntOrNull(row.target_reps),
        target_weight_kg: toFiniteNumber(row.target_weight_kg),
        rest_seconds: toIntOrNull(row.rest_seconds),
      };
    });
  }
  return next;
};

const normalizeAction = (source: JsonObject): NormalizedAction => {
  const actionSource = asObject(source.action);
  const payloadSource = asObject(actionSource.payload ?? source.payload);
  const type = asString(actionSource.type ?? actionSource.action_type ?? source.action_type) || "none";
  const confidence = Math.max(0, Math.min(1, toFiniteNumber(actionSource.confidence) ?? 0.8));
  const requiresConfirmation =
    typeof actionSource.requires_confirmation === "boolean"
      ? actionSource.requires_confirmation
      : type !== "none";
  return {
    type,
    requires_confirmation: requiresConfirmation,
    confidence,
    payload: normalizePayloadNumbers(payloadSource),
  };
};

const normalizeUiType = (rawUi: unknown, actionType: string, safetyLevel: string): string => {
  const ui = asString(rawUi);
  if (ALLOWED_UI_TYPES.has(ui)) return ui;
  if (safetyLevel === "urgent") return "safety_notice";
  return ACTION_TO_UI[actionType] ?? "text";
};

const normalizeIntent = (rawIntent: unknown, uiType: string, actionType: string): string => {
  const raw = asString(rawIntent).toLowerCase();
  if (["onboarding", "meal_log", "weight_log", "workout", "question_other"].includes(raw)) {
    return raw;
  }
  if (["other", "question", "general", "chat", "text", "consultation", "safety"].includes(raw)) {
    return "question_other";
  }
  if (["goal", "goal_setting", "goal_design", "profile", "setup", "initial_setup"].includes(raw)) {
    return "onboarding";
  }
  if (["meal", "food", "nutrition", "diet_log"].includes(raw)) return "meal_log";
  if (["weight", "body_weight", "body_measurement"].includes(raw)) return "weight_log";
  if (["training", "exercise", "workout_log"].includes(raw)) return "workout";
  if (uiType === "meal_confirmation" || actionType === "meal.create") return "meal_log";
  if (uiType === "weight_confirmation" || actionType === "weight.create") return "weight_log";
  if (uiType === "workout_plan" || uiType === "workout_set" || actionType.startsWith("workout")) {
    return "workout";
  }
  if (uiType === "onboarding_question" || uiType === "goal_confirmation") return "onboarding";
  return "question_other";
};

const extractJsonFromText = (text: string): JsonObject => {
  const trimmed = text.trim();
  if (!trimmed) return {};
  const candidates = [
    trimmed,
    trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, ""),
  ];
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }
  for (const candidate of candidates) {
    try {
      return asObject(JSON.parse(candidate));
    } catch {
      // Try the next candidate.
    }
  }
  return {};
};

const normalizeAiResult = (difyData: JsonObject): NormalizedAiResult => {
  const answer = asString(difyData.answer ?? difyData.text ?? difyData.output);
  const parsed = extractJsonFromText(answer);
  const source = Object.keys(parsed).length > 0 ? parsed : difyData;
  const nestedData = asObject(source.data);
  const merged: JsonObject = { ...nestedData, ...source };
  const action = normalizeAction(merged);
  const safetySource = asObject(merged.safety);
  const safety = {
    level: asString(safetySource.level) || "normal",
    note: asString(safetySource.note),
  };
  const uiType = normalizeUiType(merged.ui_type, action.type, safety.level);
  const intent = normalizeIntent(merged.intent, uiType, action.type);
  const message =
    asString(merged.message) ||
    (Object.keys(parsed).length > 0 ? "" : answer) ||
    "確認しました。";
  const proposalSource = asObject(merged.proposal);
  const proposal =
    uiType === "goal_confirmation"
      ? Object.keys(proposalSource).length > 0
        ? proposalSource
        : action.payload
      : Object.keys(proposalSource).length > 0
        ? proposalSource
        : null;
  const collectedFields = {
    ...asObject(action.payload.extracted),
    ...asObject(action.payload.collected_fields),
    ...asObject(merged.extracted),
    ...asObject(merged.collected_fields),
  };
  return {
    message,
    ui_type: uiType,
    intent,
    action,
    suggestions: asStringArray(merged.suggestions),
    quick_replies: asStringArray(merged.quick_replies),
    collected_fields: collectedFields,
    safety,
    proposal,
  };
};

const createSignedImageUrl = async (
  serviceClient: ReturnType<typeof createClient>,
  imagePath: string |Record<string, unknown>
): Promise<string | null> => {
  const path = asString(imagePath);
  if (!path) return null;
  const { data, error } = await serviceClient.storage
    .from("meal-images")
    .createSignedUrl(path, 60 * 30);
  if (error || !data?.signedUrl) {
    console.error("ai_chat_image_sign_failed", error?.message ?? "unknown");
    return null;
  }
  return data.signedUrl;
};

const collectContext = async (
  serviceClient: ReturnType<typeof createClient>,
  userId: string
) => {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const [profileRes, goalRes, mealsRes, workoutsRes, weightsRes, trainerRes] = await Promise.all([
    serviceClient.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    serviceClient
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    serviceClient
      .from("meals")
      .select("calories, protein_g, fat_g, carbs_g, meal_type, raw_text, eaten_at")
      .eq("user_id", userId)
      .gte("eaten_at", `${today}T00:00:00+09:00`)
      .lte("eaten_at", `${today}T23:59:59+09:00`)
      .order("eaten_at", { ascending: false })
      .limit(20),
    serviceClient
      .from("workout_sessions")
      .select("title, focus_area, status, started_at, estimated_minutes")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    serviceClient
      .from("body_measurements")
      .select("measured_at, weight_kg, body_fat_percent")
      .eq("user_id", userId)
      .order("measured_at", { ascending: false })
      .limit(20),
    serviceClient.from("trainer_settings").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  const meals = mealsRes.data ?? [];
  const todayTotals = meals.reduce(
    (sum, meal) => ({
      calories: sum.calories + (Number(meal.calories) || 0),
      protein_g: sum.protein_g + (Number(meal.protein_g) || 0),
      fat_g: sum.fat_g + (Number(meal.fat_g) || 0),
      carbs_g: sum.carbs_g + (Number(meal.carbs_g) || 0),
    }),
    { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 }
  );

  return {
    profile_context: JSON.stringify(profileRes.data ?? {}),
    goal_context: JSON.stringify(goalRes.data ?? {}),
    today_context: JSON.stringify({ date: today, totals: todayTotals, meals }),
    recent_workouts_context: JSON.stringify(workoutsRes.data ?? []),
    weight_trend_context: JSON.stringify(weightsRes.data ?? []),
    trainer_style: asString(trainerRes.data?.trainer_style) || asString(profileRes.data?.trainer_style) || "standard",
    local_datetime: new Date().toISOString(),
  };
};

const createPendingAction = async (
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  result: NormalizedAiResult,
  imagePath: string | null
): Promise<string | null> => {
  if (
    !result.action.requires_confirmation ||
    result.action.type === "none" ||
    result.ui_type === "goal_confirmation"
  ) {
    return null;
  }
  const payload = {
    ...result.action.payload,
    ...(imagePath ? { image_path: imagePath, source_type: "image" } : {}),
  };
  const { data, error } = await serviceClient
    .from("pending_actions")
    .insert({
      user_id: userId,
      action_type: result.action.type,
      payload,
      status: "pending",
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    })
    .select("id")
    .single();
  if (error) {
    console.error("ai_chat_pending_action_insert_failed", error.message);
    return null;
  }
  result.action.payload = payload;
  return data.id;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse(405, "この操作には対応していません。");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !DIFY_API_KEY) {
    console.error("ai_chat_missing_env", {
      hasUrl: Boolean(SUPABASE_URL),
      hasAnon: Boolean(SUPABASE_ANON_KEY),
      hasService: Boolean(SUPABASE_SERVICE_ROLE_KEY),
      hasDify: Boolean(DIFY_API_KEY),
    });
    return errorResponse(500, "処理に失敗しました。少し待ってからもう一度お試しください。");
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return errorResponse(401, "ログインしてからもう一度お試しください。");

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    const userId = authData.user?.id;
    if (authError || !userId) return errorResponse(401, "ログインしてからもう一度お試しください。");

    const body = asObject(await req.json().catch(() => ({})));
    const message = asString(body.message);
    const imagePath = toNullableString(body.image_path);
    const conversationId = toNullableString(body.conversation_id);
    if (!message && !imagePath) return errorResponse(400, "メッセージを入力してください。");

    const context = await collectContext(serviceClient, userId);
    context.goal_context = mergeContextJson(context.goal_context, body.goal_context);
    context.profile_context = mergeContextJson(context.profile_context, body.profile_context);
    console.log("ai_chat_goal_context_before_dify", context.goal_context);
    const signedImageUrl = imagePath ? await createSignedImageUrl(serviceClient, imagePath) : null;
    const difyPayload: JsonObject = {
      inputs: {
        ...context,
        image_path: imagePath ?? "",
        image_url: signedImageUrl ?? "",
      },
      query: message || "画像を解析してください。",
      response_mode: "blocking",
      user: userId,
      conversation_id: conversationId ?? "",
    };
    if (signedImageUrl) {
      difyPayload.files = [
        { type: "image", transfer_method: "remote_url", url: signedImageUrl },
      ];
    }

    const difyRes = await fetch(`${DIFY_API_BASE_URL.replace(/\/$/, "")}/chat-messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DIFY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(difyPayload),
    });
    const difyText = await difyRes.text();
    if (!difyRes.ok) {
      console.error("ai_chat_dify_error", { status: difyRes.status, body: difyText.slice(0, 500) });
      return errorResponse(502, "AIトレーナーの応答に失敗しました。少し待ってからもう一度お試しください。");
    }

    let difyData: JsonObject = {};
    try {
      difyData = asObject(JSON.parse(difyText));
    } catch {
      difyData = { answer: difyText };
    }
    const result = normalizeAiResult(difyData);
    const pendingActionId = await createPendingAction(serviceClient, userId, result, imagePath);
    const difyConversationId = toNullableString(difyData.conversation_id) ?? conversationId;
    const difyMessageId = toNullableString(difyData.message_id);

    let conversationRowId: string | null = null;
    if (difyConversationId) {
      const { data: existing } = await serviceClient
        .from("ai_conversations")
        .select("id")
        .eq("user_id", userId)
        .eq("dify_conversation_id", difyConversationId)
        .maybeSingle();
      if (existing?.id) {
        conversationRowId = existing.id;
        await serviceClient
          .from("ai_conversations")
          .update({ last_used_at: new Date().toISOString(), status: "active" })
          .eq("id", existing.id);
      } else {
        const { data: inserted } = await serviceClient
          .from("ai_conversations")
          .insert({ user_id: userId, dify_conversation_id: difyConversationId, status: "active" })
          .select("id")
          .single();
        conversationRowId = inserted?.id ?? null;
      }
    }

    await serviceClient.from("ai_messages").insert([
      {
        user_id: userId,
        conversation_id: conversationRowId,
        role: "user",
        content: message || "[image]",
        intent: result.intent,
        metadata: imagePath ? { image_path: imagePath } : {},
      },
      {
        user_id: userId,
        conversation_id: conversationRowId,
        role: "assistant",
        content: result.message,
        intent: result.intent,
        dify_message_id: difyMessageId,
        metadata: {
          ui_type: result.ui_type,
          action_type: result.action.type,
          ...(pendingActionId ? { pending_action_id: pendingActionId } : {}),
        },
      },
    ]);

    return new Response(
      JSON.stringify({
        version: "1.0",
        message: result.message,
        ui_type: result.ui_type,
        intent: result.intent,
        data: {
          pending_action_id: pendingActionId,
          action: result.action,
          quick_replies: result.quick_replies,
          proposal: result.proposal,
          collected_fields: result.collected_fields,
        },
        proposal: result.proposal,
        conversation_id: difyConversationId,
        suggestions: result.suggestions,
        quick_replies: result.quick_replies,
        collected_fields: result.collected_fields,
        safety: result.safety,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ai_chat_unhandled", error);
    return errorResponse(500, "処理に失敗しました。少し待ってからもう一度お試しください。");
  }
});