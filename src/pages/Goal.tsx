import { useMemo } from "react";
import { Flag } from "lucide-react";
import {
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BackLink from "@/components/BackLink";
import { useAppData, type AppData } from "@/hooks/useAppData";
import { todayStr } from "@/lib/utils";

const ACTION_BLUE = "#0066cc";
const GOAL_GRAY = "#a1a1aa";
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return todayStr(d);
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) /
      86400000
  );
}

function labelMD(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${Number(m)}/${Number(d)}`;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** 確認済みの現在体重から大きく外れた記録は異常値として扱う(kg) */
const OUTLIER_THRESHOLD_KG = 8;

/**
 * 目標ペースの計算。開始点(最初の体重記録 or プロフィールの開始体重)から
 * 目標日に向けて直線で減らし(増やし)、週ごとの小さなゴールを置く。
 * 体重推移グラフ(MealRecordPage)と同じ考え方に揃えている。
 */
function useGoalPlan(data: AppData) {
  const { weights, profile } = data;
  return useMemo(() => {
    const today = todayStr();
    const target = profile.targetWeightKg;
    // ユーザーが確認・確定した現在体重(profiles.current_weight_kg)を基準にする
    const confirmedWeight = profile.startWeightKg ?? data.latestWeightKg;
    if (confirmedWeight == null || target == null) return null;

    // 確認済み体重から大きく外れた記録(誤入力・OCRミス等)は採用しない
    const usableWeights = weights.filter(
      (w) => Math.abs(w.weightKg - confirmedWeight) <= OUTLIER_THRESHOLD_KG
    );
    const excludedCount = weights.length - usableWeights.length;

    const startDate = usableWeights[0]?.date ?? today;
    const startWeight = usableWeights[0]?.weightKg ?? confirmedWeight;

    // 期日はユーザーが承認した目標にのみ存在する。無い場合は推測しない
    const endDate = profile.targetDate;
    if (!endDate) return null;
    const totalDays = Math.max(1, daysBetween(startDate, endDate));
    const targetOn = (date: string) => {
      const d = Math.min(Math.max(daysBetween(startDate, date), 0), totalDays);
      return round1(startWeight + ((target - startWeight) * d) / totalDays);
    };

    // 週ごとの小さなゴール(開始から7日刻み。最終日は大きなゴール)
    const milestones: string[] = [];
    for (let d = 7; d < totalDays; d += 7) milestones.push(addDays(startDate, d));

    // 現在体重は「採用された最新の記録」。無ければ確認済み体重
    const current =
      usableWeights.length > 0
        ? usableWeights[usableWeights.length - 1].weightKg
        : confirmedWeight;
    // 増量なら 目標 - 現在、減量なら 現在 - 目標(方向つき。行き過ぎたら0)
    const isCut = target <= startWeight;
    const remaining = isCut ? current - target : target - current;

    return {
      today,
      startDate,
      startWeight,
      endDate,
      totalDays,
      target,
      targetOn,
      milestones: new Set(milestones),
      daysLeft: Math.max(0, daysBetween(today, endDate)),
      currentWeight: current,
      remainingKg: round1(Math.max(0, remaining)),
      isCut,
      weights: usableWeights,
      excludedCount,
    };
  }, [weights, profile, data.latestWeightKg]);
}


/** 目標ページ: 残り日数・残り体重 / 日ごとの目標カレンダー / 体重推移グラフ */
export default function Goal() {
  const data = useAppData();
  const plan = useGoalPlan(data);

  return (
    <div className="origin-top animate-grow-in space-y-4 p-4 pb-[max(calc(env(safe-area-inset-bottom,0px)+1rem),1.5rem)] pt-[max(calc(env(safe-area-inset-top,0px)+0.5rem),0.75rem)]">
      <BackLink />
      <header className="px-1">
        <h1 className="text-[28px] leading-[1.14]">目標</h1>
      </header>

      {plan === null ? (
        <div className="rounded-[18px] border bg-card px-5 py-8 text-center">
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            目標がまだ設定されていません。
            <br />
            チャットでトレーナーに「目標を決めたい」と
            <br />
            伝えると一緒に決められます。
          </p>
        </div>
      ) : (
        <>
          <SummaryCard plan={plan} />
          <DailyTargetCalendar plan={plan} />
          <GoalWeightChart data={data} plan={plan} />
        </>
      )}
    </div>
  );
}

type GoalPlan = NonNullable<ReturnType<typeof useGoalPlan>>;

/** 上段: 期限までの日数と目標までの残り体重 */
function SummaryCard({ plan }: { plan: GoalPlan }) {
  const elapsed = Math.min(
    Math.max(daysBetween(plan.startDate, plan.today), 0),
    plan.totalDays
  );
  const progress = Math.round((elapsed / plan.totalDays) * 100);

  return (
    <div className="rounded-[18px] border bg-card px-5 pb-4 pt-4">
      <div className="flex divide-x divide-border">
        <div className="flex-1 pr-4">
          <p className="text-[12px] text-muted-foreground">期限まで</p>
          <p className="mt-1 text-[34px] font-bold leading-none tracking-[-0.02em] [font-variant-numeric:tabular-nums]">
            {plan.daysLeft}
            <span className="ml-1 text-[15px] font-normal text-muted-foreground">
              日
            </span>
          </p>
        </div>
        <div className="flex-1 pl-4">
          <p className="text-[12px] text-muted-foreground">目標まであと</p>
          <p className="mt-1 text-[34px] font-bold leading-none tracking-[-0.02em] [font-variant-numeric:tabular-nums]">
            {plan.remainingKg.toFixed(1)}
            <span className="ml-1 text-[15px] font-normal text-muted-foreground">
              kg
            </span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground [font-variant-numeric:tabular-nums]">
            現在 {plan.currentWeight.toFixed(1)}kg → 目標 {plan.target.toFixed(1)}kg
          </p>
        </div>
      </div>

      {plan.excludedCount > 0 && (
        <p className="mt-3 rounded-[10px] bg-secondary px-3 py-2 text-[11px] leading-[1.5] text-muted-foreground">
          未確定の体重記録 {plan.excludedCount} 件は異常値のため、残り体重とグラフから除外しています。
        </p>
      )}


      {/* 期間の進み具合 */}
      <div className="mt-4">
        <div className="h-[6px] overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-ios"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground [font-variant-numeric:tabular-nums]">
          <span>開始 {labelMD(plan.startDate)}</span>
          <span>
            ゴール {labelMD(plan.endDate)}(
            {plan.target.toFixed(1)}kg)
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * ゴールの日までのカレンダー。1日1行で、右にその日の目標体重を表示する。
 * 週ごとの小さなゴールは旗つきで強調。今日の行は青で示す。
 */
function DailyTargetCalendar({ plan }: { plan: GoalPlan }) {
  const days = useMemo(() => {
    const from = Math.max(daysBetween(plan.startDate, plan.today), 0);
    const list: {
      date: string;
      target: number;
      isToday: boolean;
      isMilestone: boolean;
      isFinal: boolean;
    }[] = [];
    for (let d = from; d <= plan.totalDays; d++) {
      const date = addDays(plan.startDate, d);
      list.push({
        date,
        target: plan.targetOn(date),
        isToday: date === plan.today,
        isMilestone: plan.milestones.has(date),
        isFinal: date === plan.endDate,
      });
    }
    return list;
  }, [plan]);

  return (
    <div className="rounded-[18px] border bg-card px-2 pb-2 pt-3.5">
      <div className="flex items-baseline justify-between px-3">
        <p className="text-[13px] font-semibold text-muted-foreground">
          ゴールまでのカレンダー
        </p>
        <p className="text-[11px] text-muted-foreground">
          <Flag className="mr-1 inline-block h-3 w-3 text-primary" strokeWidth={2.2} />
          週ごとの小さなゴール
        </p>
      </div>

      <div className="no-scrollbar mt-2 max-h-72 overflow-y-auto">
        {days.map((d) => {
          const dt = new Date(`${d.date}T12:00:00`);
          const emphasized = d.isMilestone || d.isFinal;
          return (
            <div
              key={d.date}
              className={
                "mx-1 flex items-center justify-between rounded-[12px] px-3 py-2 " +
                (d.isToday
                  ? "bg-primary text-primary-foreground"
                  : emphasized
                    ? "bg-secondary"
                    : "")
              }
            >
              <span className="flex items-center gap-2">
                <span
                  className={
                    "w-14 text-[14px] [font-variant-numeric:tabular-nums] " +
                    (d.isToday ? "font-semibold" : "")
                  }
                >
                  {labelMD(d.date)}({WEEKDAYS[dt.getDay()]})
                </span>
                {d.isToday && <span className="text-[11px]">今日</span>}
                {d.isFinal ? (
                  <span className="flex items-center gap-1 text-[12px] font-semibold text-primary">
                    <Flag className="h-3.5 w-3.5" strokeWidth={2.2} />
                    ゴール
                  </span>
                ) : (
                  d.isMilestone && (
                    <Flag
                      className="h-3.5 w-3.5 text-primary"
                      strokeWidth={2.2}
                      aria-label="小さなゴール"
                    />
                  )
                )}
              </span>
              <span
                className={
                  "text-[15px] [font-variant-numeric:tabular-nums] " +
                  (emphasized || d.isToday
                    ? "font-semibold"
                    : "text-muted-foreground")
                }
              >
                {d.target.toFixed(1)}
                <span className="ml-0.5 text-[11px] font-normal opacity-70">
                  kg
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 下段: 大きなゴールまでの体重推移。実測(青)+ 目標ペース(点線)+ 小さなゴール(旗の点) */
function GoalWeightChart({ data, plan }: { data: AppData; plan: GoalPlan }) {
  const chart = useMemo(() => {
    const points = new Map<
      string,
      { date: string; actual?: number; goal?: number }
    >();
    for (const w of plan.weights) {
      points.set(w.date, { date: w.date, actual: w.weightKg });
    }
    // 目標ペース線(週ごとの点=小さなゴール)
    for (let d = 0; d <= plan.totalDays; d += 7) {
      const date = addDays(plan.startDate, d);
      const p = points.get(date) ?? { date };
      p.goal = plan.targetOn(date);
      points.set(date, p);
    }
    const endP = points.get(plan.endDate) ?? { date: plan.endDate };
    endP.goal = plan.target;
    points.set(plan.endDate, endP);

    // X軸は「開始からの日数」の数値軸にする。日付をカテゴリ扱いにすると
    // 記録がある区間だけ詰まってペース線が折れて見えるため
    return [...points.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p) => ({ ...p, day: daysBetween(plan.startDate, p.date) }));
  }, [plan.weights, plan]);

  const dayLabelOf = (day: number) => labelMD(addDays(plan.startDate, day));

  return (
    <div className="rounded-[18px] border bg-card px-4 pb-3 pt-3.5">
      <div className="flex items-baseline justify-between px-1">
        <p className="text-[13px] font-semibold text-muted-foreground">
          ゴールまでの体重推移
        </p>
        <p className="text-[12px] text-muted-foreground [font-variant-numeric:tabular-nums]">
          {labelMD(plan.endDate)}に <b className="text-foreground">{plan.target.toFixed(1)}</b> kg
        </p>
      </div>

      <div className="mt-1 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chart}
            margin={{ top: 10, right: 14, bottom: 0, left: -16 }}
          >
            <XAxis
              dataKey="day"
              type="number"
              domain={[0, plan.totalDays]}
              tickFormatter={dayLabelOf}
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
                name === "actual" ? "体重" : "目標",
              ]}
              labelFormatter={(day) => dayLabelOf(Number(day))}
              contentStyle={{
                borderRadius: 11,
                fontSize: 12,
                border: "1px solid #e0e0e0",
                boxShadow: "none",
              }}
            />
            {/* 目標ペース: 週ごとの点が小さなゴール */}
            <Line
              type="monotone"
              dataKey="goal"
              stroke={GOAL_GRAY}
              strokeWidth={1.8}
              strokeDasharray="5 5"
              dot={{ r: 2.5, fill: "#fff", stroke: GOAL_GRAY, strokeWidth: 1.5 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke={ACTION_BLUE}
              strokeWidth={2.2}
              dot={{ r: 2.5, fill: ACTION_BLUE, strokeWidth: 0 }}
              connectNulls
            />
            {/* 大きなゴール */}
            <ReferenceDot
              x={plan.totalDays}
              y={plan.target}
              r={5}
              fill={ACTION_BLUE}
              stroke="#fff"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-1 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[2px] w-5 rounded bg-[#0066cc]" />
          実際の体重
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[2px] w-5 rounded [background:repeating-linear-gradient(90deg,#a1a1aa_0_4px,transparent_4px_8px)]" />
          目標ペース(点=小さなゴール)
        </span>
      </div>
    </div>
  );
}
