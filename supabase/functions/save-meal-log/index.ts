import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'unauthorized' }, 401)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (userErr || !userData?.user) {
      return json({ error: 'unauthorized' }, 401)
    }
    const userId = userData.user.id

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return json({ error: 'invalid_body' }, 400)
    }

    const num = (v: unknown) =>
      v === null || v === undefined || v === '' ? null : Number(v)

    const { data: meal, error: mealErr } = await supabase
      .from('meals')
      .insert({
        user_id: userId,
        eaten_at: body.eaten_at ?? new Date().toISOString(),
        meal_type: body.meal_type ?? 'unknown',
        raw_text: body.raw_text ?? null,
        source_type: body.input_type ?? 'text',
        image_path: body.image_path ?? null,
        calories: num(body.calories_kcal),
        protein_g: num(body.protein_g),
        fat_g: num(body.fat_g),
        carbs_g: num(body.carbs_g),
        confidence: num(body.confidence),
        estimation_note: body.analysis_result
          ? JSON.stringify(body.analysis_result)
          : null,
      })
      .select('id')
      .single()

    if (mealErr) return json({ error: mealErr.message }, 400)

    const items = Array.isArray(body.items) ? body.items : []
    if (items.length > 0) {
      const { error: itemsErr } = await supabase.from('meal_items').insert(
        items.map((it: Record<string, unknown>) => ({
          meal_id: meal.id,
          user_id: userId,
          name: it.food_name ?? it.name ?? '',
          amount: num(it.amount),
          unit: it.unit ?? null,
          calories: num(it.calories_kcal),
          protein_g: num(it.protein_g),
          fat_g: num(it.fat_g),
          carbs_g: num(it.carbs_g),
        })),
      )
      if (itemsErr) return json({ error: itemsErr.message }, 400)
    }

    return json({ ok: true, meal_id: meal.id })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500)
  }
})
