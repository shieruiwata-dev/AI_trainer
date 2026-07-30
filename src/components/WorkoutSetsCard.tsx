import type { WorkoutSetRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

/** 今日の筋トレカード: 種目名 + セットごとの重量/レップ数。チャット上部と筋トレ記録ページで共用 */
export function WorkoutSetsCard({
  sets,
  shadow = true,
}: {
  sets: WorkoutSetRecord[];
  /** チャット上部のスワイプカードでは影あり、記録ページ内では影なし */
  shadow?: boolean;
}) {
  // 種目ごとにグループ化(出現順を維持)
  const groups: { name: string; sets: WorkoutSetRecord[] }[] = [];
  const byName = new Map<string, WorkoutSetRecord[]>();
  for (const s of sets) {
    if (!byName.has(s.exerciseName)) {
      const list: WorkoutSetRecord[] = [];
      byName.set(s.exerciseName, list);
      groups.push({ name: s.exerciseName, sets: list });
    }
    byName.get(s.exerciseName)!.push(s);
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-[18px] border bg-card px-4 pb-3.5 pt-3.5",
        shadow && "shadow-[0_3px_14px_rgba(0,0,0,0.07)]"
      )}
    >
      <div className="flex items-center justify-between px-1">
        <p className="text-[13px] font-semibold text-muted-foreground">
          今日の筋トレ
        </p>
        {sets.length > 0 && (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary [font-variant-numeric:tabular-nums]">
            {sets.length}セット
          </span>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-3 text-center">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            まだ記録がありません。
            <br />
            チャットで「サイドレイズ 10kgを12回」のように
            <br />
            伝えるとここに記録されます
          </p>
        </div>
      ) : (
        <div className="no-scrollbar mt-2 flex-1 space-y-3 overflow-y-auto px-1">
          {groups.map((g) => (
            <div key={g.name}>
              <p className="text-[16px] font-semibold tracking-[-0.02em]">
                {g.name}
              </p>
              <ul>
                {g.sets.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-baseline gap-3 border-b border-[#f0f0f0] py-1.5 last:border-b-0"
                  >
                    <span className="w-16 shrink-0 text-[12px] text-muted-foreground">
                      {s.setNumber}セット目
                    </span>
                    <span className="flex-1 text-[16px] font-semibold tracking-[-0.02em] [font-variant-numeric:tabular-nums]">
                      {s.weightKg ?? "—"}
                      <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">
                        kg
                      </span>
                    </span>
                    <span className="text-[16px] font-semibold tracking-[-0.02em] [font-variant-numeric:tabular-nums]">
                      {s.reps ?? "—"}
                      <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">
                        回
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
