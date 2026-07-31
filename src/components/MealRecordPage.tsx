import { useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CaloriesPanel } from "@/components/CaloriesPanel";
import { MiniCalendar } from "@/components/MiniCalendar";
import type { AppData } from "@/hooks/useAppData";
import { MEAL_TYPE_LABEL } from "@/lib/types";
import { todayStr } from "@/lib/utils";

const ACTION_BLUE = "#0066cc";
const GOAL_GRAY = "#a1a1aa";

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return todayStr(d);
}

function labelMD(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${Number(m)}/${Number(d)}`;
}

/** 食事記録ページ: カレンダー+選択日の食事 / 体重推移グラフ / 献立ボタン */
export function MealRecordPage({
  data,
  onAskMenu,
}: {
  data: AppData;
  onAskMenu: () => void;
}) {
  const today = todayStr();
  const [selectedDate, setSelectedDate] = useState(today);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const mealsByDate = useMemo(() => {
    const map = new Map<string, typeof data.meals>();
    for (const meal of data.meals) {
      if (!map.has(meal.date)) map.set(meal.date, []);
      map.get(meal.date)!.push(meal);
    }
    return map;
  }, [data.meals]);

  const dayMeals = mealsByDate.get(selectedDate) ?? [];
  const dayKcal = dayMeals.reduce((s, m) => s + m.calories, 0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-3 pt-1">
        {/* ===== 今日のカロリー・PFC(チャット上部カードと同一) ===== */}
        <CaloriesPanel
          todayCalories={data.todayCalories}
          profile={data.profile}
          proteinG={data.todayProteinG}
          fatG={data.todayFatG}
          carbsG={data.todayCarbsG}
          shadow={false}
        />

        {/* ===== カレンダー + その日の食事 ===== */}
        <div className="flex gap-3">
          <MiniCalendar
            month={month}
            onMonthChange={setMonth}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            markedDates={mealsByDate}
            today={today}
          />

          {/* 選択日の食事 */}
          <div className="flex min-w-0 flex-1 flex-col rounded-[16px] bg-secondary px-3 py-3">
            <p className="text-[12px] font-semibold text-muted-foreground">
              {labelMD(selectedDate)}の食事
            </p>
            {dayMeals.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-center text-[12px] leading-relaxed text-muted-foreground/70">
                  記録なし
                </p>
              </div>
            ) : (
              <>
                <ul className="no-scrollbar mt-1.5 flex-1 space-y-2 overflow-y-auto">
                  {dayMeals.map((m) => (
                    <li key={m.id}>
                      <p className="truncate text-[13px] font-medium leading-tight">
                        {m.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground [font-variant-numeric:tabular-nums]">
                        {MEAL_TYPE_LABEL[m.mealType]} ・ {m.calories}kcal
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 border-t border-black/5 pt-1.5 text-[11px] text-muted-foreground [font-variant-numeric:tabular-nums]">
                  合計 <b className="text-foreground">{dayKcal}</b> kcal
                </p>
              </>
            )}
          </div>
        </div>

        {/* ===== 体重推移グラフ ===== */}
        <WeightChart data={data} />

        {/* TODO: テスト用の一時ボタン(検証後に削除) */}
        <TestSaveMealButton onSaved={data.reload} />
      </div>


      {/* ===== 本日の献立を聞く ===== */}
      <div className="px-4 pb-[max(calc(env(safe-area-inset-bottom,0px)+0.75rem),1rem)] pt-1">
        <button
          onClick={onAskMenu}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[16px] font-medium text-primary-foreground transition-transform active:scale-[0.98]"
        >
          <MessageCircle className="h-5 w-5" strokeWidth={2} />
          本日の献立を聞く
        </button>
      </div>
    </div>
  );
}

/** TODO: 検証用の一時ボタン。テスト完了後にこのコンポーネントと呼び出し箇所を削除する */
function TestSaveMealButton({ onSaved }: { onSaved: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("session error", sessionError);
        alert("セッション取得に失敗しました");
        return;
      }
      if (!session?.access_token) {
        alert("ログインセッションがありません。再ログインしてください。");
        return;
      }
      console.log("access token exists", !!session.access_token);

      const { data, error } = await supabase.functions.invoke("save-meal-log", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          meal_type: "lunch",
          raw_text: "白米200gと鶏胸肉150gを食べた",
          input_type: "text",
          calories_kcal: 565,
          protein_g: 43,
          fat_g: 7,
          carbs_g: 77,
          confidence: 0.85,
          items: [
            {
              food_name: "白米",
              amount: 200,
              unit: "g",
              calories_kcal: 312,
              protein_g: 5,
              fat_g: 1,
              carbs_g: 74,
            },
            {
              food_name: "鶏胸肉",
              amount: 150,
              unit: "g",
              calories_kcal: 253,
              protein_g: 38,
              fat_g: 6,
              carbs_g: 3,
            },
          ],
          analysis_result: { source: "manual_test" },
        },
      });

      console.log("save-meal-log result", { data, error });

      if (error) {
        alert(`保存失敗: ${error.message}`);
        return;
      }

      alert("食事記録を保存しました");
      await onSaved();
    } finally {
      setBusy(false);
    }
  }


  return (
    <button
      onClick={run}
      disabled={busy}
      className="w-full rounded-[12px] border border-dashed border-muted-foreground/40 py-2.5 text-[13px] text-muted-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
    >
      {busy ? "保存中..." : "テスト食事を保存"}
    </button>
  );
}

/** 体重推移: 実測(青)+ 目標ペース(点線) */
function WeightChart({ data }: { data: AppData }) {

  const { weights, profile } = data;

  const chart = useMemo(() => {
    const points = new Map<
      string,
      { date: string; actual?: number; goal?: number }
    >();
    for (const w of weights) {
      points.set(w.date, { date: w.date, actual: w.weightKg });
    }

    // 目標ペース線: 開始点(最初の記録 or 現在体重)→ 目標体重(目標日 or 90日後)
    const startDate = weights[0]?.date ?? todayStr();
    const startWeight = weights[0]?.weightKg ?? profile.startWeightKg;
    const target = profile.targetWeightKg;
    let hasGoal = false;
    if (startWeight != null && target != null) {
      hasGoal = true;
      const endDate = profile.targetDate ?? addDays(startDate, 90);
      const totalDays = Math.max(
        1,
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
      );
      // 週ごとの小さな目標点を置く
      for (let d = 0; d <= totalDays; d += 7) {
        const date = addDays(startDate, d);
        const goal = startWeight + ((target - startWeight) * d) / totalDays;
        const p = points.get(date) ?? { date };
        p.goal = Math.round(goal * 10) / 10;
        points.set(date, p);
      }
      const endP = points.get(endDate) ?? { date: endDate };
      endP.goal = target;
      points.set(endDate, endP);
    }

    const sorted = [...points.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p) => ({ ...p, label: labelMD(p.date) }));
    return { data: sorted, hasGoal };
  }, [weights, profile]);

  return (
    <div className="rounded-[16px] border bg-card px-4 pb-3 pt-3.5">
      <div className="flex items-baseline justify-between px-1">
        <p className="text-[13px] font-semibold text-muted-foreground">
          体重推移
        </p>
        {profile.targetWeightKg != null && (
          <p className="text-[12px] text-muted-foreground [font-variant-numeric:tabular-nums]">
            目標 <b className="text-foreground">{profile.targetWeightKg}</b> kg
          </p>
        )}
      </div>

      {chart.data.length < 2 ? (
        <p className="py-8 text-center text-[13px] text-muted-foreground">
          体重を記録するとグラフが表示されます。
          <br />
          チャットで「今日は65kg」のように伝えてください
        </p>
      ) : (
        <>
          <div className="mt-1 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chart.data}
                margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
              >
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#7a7a7a" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                />
                <YAxis
                  domain={["dataMin - 1", "dataMax + 1"]}
                  tick={{ fontSize: 10, fill: "#7a7a7a" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(v, name) => [
                    `${v} kg`,
                    name === "actual" ? "体重" : "目標ペース",
                  ]}
                  labelFormatter={(l) => `${l}`}
                  contentStyle={{
                    borderRadius: 11,
                    fontSize: 12,
                    border: "1px solid #e0e0e0",
                    boxShadow: "none",
                  }}
                />
                {chart.hasGoal && (
                  <Line
                    type="monotone"
                    dataKey="goal"
                    stroke={GOAL_GRAY}
                    strokeWidth={1.8}
                    strokeDasharray="5 5"
                    dot={false}
                    connectNulls
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke={ACTION_BLUE}
                  strokeWidth={2.2}
                  dot={{ r: 2.5, fill: ACTION_BLUE, strokeWidth: 0 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-5 rounded bg-[#0066cc]" />
              実際の体重
            </span>
            {chart.hasGoal && (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-[2px] w-5 rounded [background:repeating-linear-gradient(90deg,#a1a1aa_0_4px,transparent_4px_8px)]" />
                目標ペース
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
