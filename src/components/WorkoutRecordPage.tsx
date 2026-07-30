import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MiniCalendar } from "@/components/MiniCalendar";
import { WorkoutSetsCard } from "@/components/WorkoutSetsCard";
import type { AppData } from "@/hooks/useAppData";
import type { WorkoutSetRecord } from "@/lib/types";
import { todayStr } from "@/lib/utils";

/** 部位ごとの表示名と色(グラフの積み上げに使用) */
const PART_META: Record<string, { label: string; color: string }> = {
  shoulders: { label: "肩", color: "#0066cc" },
  chest: { label: "胸", color: "#2fa8a0" },
  back: { label: "背中", color: "#8b7ff0" },
  legs: { label: "脚", color: "#6aa84f" },
  arms: { label: "腕", color: "#e8a13c" },
  core: { label: "体幹", color: "#e06e8a" },
  full_body: { label: "全身", color: "#5a9ff2" },
  other: { label: "その他", color: "#a1a1aa" },
};

function labelMD(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${Number(m)}/${Number(d)}`;
}

/** 筋トレ記録ページ: 今日の筋トレ / カレンダー+選択日のメニュー / 部位別ボリューム */
export function WorkoutRecordPage({ data }: { data: AppData }) {
  const today = todayStr();
  const [selectedDate, setSelectedDate] = useState(today);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  // セッションID → 部位
  const partBySession = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of data.workouts) {
      map.set(w.id, w.focusArea && PART_META[w.focusArea] ? w.focusArea : "other");
    }
    return map;
  }, [data.workouts]);

  const setsByDate = useMemo(() => {
    const map = new Map<string, WorkoutSetRecord[]>();
    for (const s of data.workoutSets) {
      if (!map.has(s.date)) map.set(s.date, []);
      map.get(s.date)!.push(s);
    }
    return map;
  }, [data.workoutSets]);

  // カレンダーのドット: セット記録 or セッションがある日
  const markedDates = useMemo(() => {
    const set = new Set<string>(setsByDate.keys());
    for (const w of data.workouts) set.add(w.date);
    return set;
  }, [setsByDate, data.workouts]);

  // 選択日のメニュー(種目ごとにセット数と最大重量)
  const dayMenu = useMemo(() => {
    const sets = setsByDate.get(selectedDate) ?? [];
    const groups: { name: string; count: number; topWeight: number | null }[] =
      [];
    const idx = new Map<string, number>();
    for (const s of sets) {
      if (!idx.has(s.exerciseName)) {
        idx.set(s.exerciseName, groups.length);
        groups.push({ name: s.exerciseName, count: 0, topWeight: null });
      }
      const g = groups[idx.get(s.exerciseName)!];
      g.count++;
      if (s.weightKg != null)
        g.topWeight = Math.max(g.topWeight ?? 0, s.weightKg);
    }
    // セット記録が無い日はセッションのタイトルを表示
    const sessions = data.workouts.filter((w) => w.date === selectedDate);
    return { groups, sessions };
  }, [setsByDate, selectedDate, data.workouts]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-[max(calc(env(safe-area-inset-bottom,0px)+0.75rem),1rem)] pt-1">
        {/* ===== 今日の筋トレ(チャット上部カードと同一) ===== */}
        <div className="h-[248px]">
          <WorkoutSetsCard sets={data.todayWorkoutSets} shadow={false} />
        </div>

        {/* ===== カレンダー + 選択日のメニュー ===== */}
        <div className="flex gap-3">
          <MiniCalendar
            month={month}
            onMonthChange={setMonth}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            markedDates={markedDates}
            today={today}
          />

          {/* 選択日のトレーニングメニュー */}
          <div className="flex min-w-0 flex-1 flex-col rounded-[16px] bg-secondary px-3 py-3">
            <p className="text-[12px] font-semibold text-muted-foreground">
              {labelMD(selectedDate)}のメニュー
            </p>
            {dayMenu.groups.length === 0 && dayMenu.sessions.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-center text-[12px] leading-relaxed text-muted-foreground/70">
                  記録なし
                </p>
              </div>
            ) : (
              <ul className="no-scrollbar mt-1.5 flex-1 space-y-2 overflow-y-auto">
                {dayMenu.groups.map((g) => (
                  <li key={g.name}>
                    <p className="truncate text-[13px] font-medium leading-tight">
                      {g.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground [font-variant-numeric:tabular-nums]">
                      {g.count}セット
                      {g.topWeight != null && ` ・ 最大${g.topWeight}kg`}
                    </p>
                  </li>
                ))}
                {dayMenu.groups.length === 0 &&
                  dayMenu.sessions.map((s) => (
                    <li key={s.id}>
                      <p className="truncate text-[13px] font-medium leading-tight">
                        {s.name}
                      </p>
                      {s.detail && (
                        <p className="text-[11px] text-muted-foreground">
                          {s.detail}
                        </p>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>

        {/* ===== 部位別ボリュームグラフ ===== */}
        <VolumeChart data={data} partBySession={partBySession} />
      </div>
    </div>
  );
}

/** 日ごとの筋トレボリューム(重量×レップ数の合計)を部位別に積み上げ表示 */
function VolumeChart({
  data,
  partBySession,
}: {
  data: AppData;
  partBySession: Map<string, string>;
}) {
  const chart = useMemo(() => {
    // 日付 → 部位 → ボリューム
    const byDate = new Map<string, Map<string, number>>();
    for (const s of data.workoutSets) {
      const volume = (s.weightKg ?? 0) * (s.reps ?? 0);
      if (volume <= 0) continue;
      const part = partBySession.get(s.sessionId ?? "") ?? "other";
      if (!byDate.has(s.date)) byDate.set(s.date, new Map());
      const parts = byDate.get(s.date)!;
      parts.set(part, (parts.get(part) ?? 0) + volume);
    }

    const dates = [...byDate.keys()].sort().slice(-14); // 直近14日分
    const presentParts = Object.keys(PART_META).filter((p) =>
      dates.some((d) => byDate.get(d)!.has(p))
    );
    const rows = dates.map((date) => {
      const row: Record<string, number | string> = { label: labelMD(date) };
      for (const p of presentParts) {
        row[p] = Math.round(byDate.get(date)!.get(p) ?? 0);
      }
      return row;
    });
    return { rows, presentParts };
  }, [data.workoutSets, partBySession]);

  return (
    <div className="rounded-[16px] border bg-card px-4 pb-3 pt-3.5">
      <p className="px-1 text-[13px] font-semibold text-muted-foreground">
        筋トレボリューム
        <span className="ml-1.5 font-normal">(重量×レップ×セット)</span>
      </p>

      {chart.rows.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-muted-foreground">
          セットを記録するとボリュームが表示されます。
          <br />
          チャットで「ベンチプレス 60kgを8回」のように伝えてください
        </p>
      ) : (
        <>
          <div className="mt-1 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chart.rows}
                margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
                barCategoryGap="30%"
              >
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#7a7a7a" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#7a7a7a" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  formatter={(v, name) => [
                    `${Number(v).toLocaleString()} kg`,
                    PART_META[String(name)]?.label ?? name,
                  ]}
                  contentStyle={{
                    borderRadius: 11,
                    fontSize: 12,
                    border: "1px solid #e0e0e0",
                    boxShadow: "none",
                  }}
                />
                {chart.presentParts.map((p, i) => (
                  <Bar
                    key={p}
                    dataKey={p}
                    stackId="volume"
                    fill={PART_META[p].color}
                    radius={
                      i === chart.presentParts.length - 1 ? [3, 3, 0, 0] : 0
                    }
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* 部位の凡例 */}
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            {chart.presentParts.map((p) => (
              <span
                key={p}
                className="flex items-center gap-1 text-[11px] text-muted-foreground"
              >
                <span
                  className="inline-block h-2 w-2 rounded-[3px]"
                  style={{ background: PART_META[p].color }}
                />
                {PART_META[p].label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
