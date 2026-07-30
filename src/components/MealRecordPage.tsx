import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AppData } from "@/hooks/useAppData";
import { MEAL_TYPE_LABEL } from "@/lib/types";
import { todayStr, cn } from "@/lib/utils";

const ACTION_BLUE = "#0066cc";
const GOAL_GRAY = "#a1a1aa";
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

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
      <div className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-3">
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

/** ミニカレンダー(記録がある日にドット表示) */
function MiniCalendar({
  month,
  onMonthChange,
  selectedDate,
  onSelect,
  markedDates,
  today,
}: {
  month: { y: number; m: number };
  onMonthChange: (m: { y: number; m: number }) => void;
  selectedDate: string;
  onSelect: (date: string) => void;
  markedDates: Map<string, unknown>;
  today: string;
}) {
  const firstDay = new Date(month.y, month.m, 1).getDay();
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();

  const dateOf = (day: number) =>
    `${month.y}-${String(month.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  function moveMonth(delta: number) {
    const d = new Date(month.y, month.m + delta, 1);
    onMonthChange({ y: d.getFullYear(), m: d.getMonth() });
  }

  return (
    <div className="w-[208px] shrink-0 rounded-[16px] border bg-card px-2.5 py-2.5">
      {/* 月ヘッダー */}
      <div className="flex items-center justify-between px-1">
        <button
          aria-label="前の月"
          onClick={() => moveMonth(-1)}
          className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <p className="text-[13px] font-semibold [font-variant-numeric:tabular-nums]">
          {month.y}年{month.m + 1}月
        </p>
        <button
          aria-label="次の月"
          onClick={() => moveMonth(1)}
          className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground active:scale-95"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {/* 曜日 */}
      <div className="mt-1 grid grid-cols-7">
        {WEEKDAYS.map((w) => (
          <span
            key={w}
            className="py-0.5 text-center text-[10px] text-muted-foreground"
          >
            {w}
          </span>
        ))}
      </div>

      {/* 日グリッド */}
      <div className="grid grid-cols-7">
        {Array.from({ length: firstDay }).map((_, i) => (
          <span key={`sp-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = dateOf(day);
          const isSelected = date === selectedDate;
          const isToday = date === today;
          const hasRecord = markedDates.has(date);
          return (
            <button
              key={day}
              onClick={() => onSelect(date)}
              className="relative flex h-[26px] items-center justify-center"
            >
              <span
                className={cn(
                  "flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] [font-variant-numeric:tabular-nums]",
                  isSelected
                    ? "bg-primary font-semibold text-primary-foreground"
                    : isToday
                      ? "font-bold text-primary"
                      : "text-foreground"
                )}
              >
                {day}
              </span>
              {hasRecord && !isSelected && (
                <span className="absolute bottom-[1px] h-1 w-1 rounded-full bg-primary/60" />
              )}
            </button>
          );
        })}
      </div>
    </div>
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
          <div className="mt-1 h-44">
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
