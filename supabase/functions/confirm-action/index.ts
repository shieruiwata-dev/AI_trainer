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
    return jsonResponse(500, { error: "missing_env", message: "保存に失敗しました。" });
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
    const pendingActionId = asString(body.pending_action_id);
    const decision = asString(body.decision);
    const overrides = asObject(body.overrides);
    if (!pendingActionId || !["confirm", "reject"].includes(decision)) {
      return jsonResponse(400, { error: "invalid_request", message: "確認内容が見つかりません。" });
    }

    if (decision === "reject") {
      const { error } = await serviceClient
        .from("pending_actions")
        .update({ status: "rejected", resolved_at: new Date().toISOString() })
        .eq("id", pendingActionId)
        .eq("user_id", userId)
        .eq("status", "pending");
      if (error) throw error;
      return jsonResponse(200, {
        status: "rejected",
        pending_action_id: pendingActionId,
        message: "キャンセルしました。",
      });
    }

    const { data, error } = await userClient.rpc("confirm_pending_action", {
      p_action_id: pendingActionId,
      p_overrides: overrides,
    });
    if (error) throw error;
    return jsonResponse(200, {
      ...(asObject(data)),
      pending_action_id: pendingActionId,
      message: "記録しました。",
    });
  } catch (error) {
    console.error("confirm_action_failed", error);
    return jsonResponse(500, { error: "confirm_action_failed", message: "保存に失敗しました。" });
  }
});