// Supabase Edge Function: dify-chat
// フロントエンドからのチャットリクエストを Dify に中継します。
// Dify の API キーをブラウザに晒さないためのプロキシです。
//
// デプロイ:
//   supabase functions deploy dify-chat
// シークレット設定:
//   supabase secrets set DIFY_API_KEY=app-xxxxxxxx
//   supabase secrets set DIFY_API_URL=https://api.dify.ai/v1   # セルフホストの場合は自分のURL

const DIFY_API_URL = Deno.env.get("DIFY_API_URL") ?? "https://api.dify.ai/v1";
const DIFY_API_KEY = Deno.env.get("DIFY_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!DIFY_API_KEY) {
    return new Response(
      JSON.stringify({ error: "DIFY_API_KEY が設定されていません" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body = await req.json();
    const { query, inputs, conversation_id, user } = body ?? {};

    if (typeof query !== "string" || !query.trim()) {
      return new Response(JSON.stringify({ error: "query は必須です" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const difyRes = await fetch(
      `${DIFY_API_URL.replace(/\/$/, "")}/chat-messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DIFY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          inputs: inputs ?? {},
          response_mode: "streaming",
          conversation_id: conversation_id ?? "",
          user: user ?? "fitcoach-user",
        }),
      }
    );

    if (!difyRes.ok || !difyRes.body) {
      const text = await difyRes.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: `Dify エラー (${difyRes.status})`, detail: text }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // SSE ストリームをそのままクライアントへ中継
    return new Response(difyRes.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
