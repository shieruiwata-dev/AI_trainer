import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { calcMacroTargets } from "@/lib/nutrition";
import type { Profile } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

/** 今日の食事パネル(目標チップ + 摂取kcal + PFCゲージ)。チャット上部と食事記録ページで共用 */
export function CaloriesPanel({
  todayCalories,
  profile,
  proteinG,
  fatG,
  carbsG,
  shadow = true,
}: {
  todayCalories: number;
  profile: Profile;
  proteinG: number;
  fatG: number;
  carbsG: number;
  /** チャット上部のスワイプカードでは影あり、食事記録ページ内では影なし */
  shadow?: boolean;
}) {
  const targetCalories = profile.targetCalories;
  const hasTarget = targetCalories != null && targetCalories > 0;
  // PFC目標: サーバー(goals)の算出値を優先し、無ければ目標カロリーから概算
  const fallback = hasTarget ? calcMacroTargets(targetCalories) : null;
  const targets =
    hasTarget || profile.targetProteinG != null
      ? {
          proteinG: profile.targetProteinG ?? fallback?.proteinG ?? null,
          fatG: profile.targetFatG ?? fallback?.fatG ?? null,
          carbsG: profile.targetCarbsG ?? fallback?.carbsG ?? null,
        }
      : null;

  return (
    <div
      className={cn(
        "rounded-[18px] border bg-card px-3.5 pb-2.5 pt-2.5",
        shadow && "shadow-[0_3px_14px_rgba(0,0,0,0.07)]"
      )}
    >
      {/* 上段: 目標チップ(タップで目標ページへ)+ 摂取カロリー */}
      <div className="flex items-start justify-between px-1">
        <Link
          to="/goal"
          aria-label="目標を見る"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 rounded-[12px] bg-muted px-3 py-1.5 transition-transform active:scale-95"
        >
          <span>
            <span className="block text-[10px] leading-none text-muted-foreground">
              目標
            </span>
            <span className="mt-0.5 block text-[13px] font-semibold leading-none [font-variant-numeric:tabular-nums]">
              {hasTarget ? `${formatNumber(targetCalories)} kcal` : "未設定"}
            </span>
          </span>
          <ChevronDown
            className="h-4 w-4 -rotate-90 text-muted-foreground"
            strokeWidth={2}
          />
        </Link>
        <div className="text-right">
          <p className="text-[28px] font-bold leading-none tracking-[-0.02em] [font-variant-numeric:tabular-nums]">
            {formatNumber(todayCalories)}
            <span className="ml-1 text-[13px] font-normal text-muted-foreground">
              / {hasTarget ? formatNumber(targetCalories) : "--"} kcal
            </span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground [font-variant-numeric:tabular-nums]">
            {!hasTarget
              ? "目標未設定"
              : targetCalories! - todayCalories > 0
                ? `残り ${formatNumber(targetCalories! - todayCalories)} kcal`
                : targetCalories! - todayCalories === 0
                  ? "達成"
                  : `目標より +${formatNumber(todayCalories - targetCalories!)} kcal`}
          </p>
        </div>
      </div>

      {/* PFCゲージ(横棒) */}
      <div className="mt-2 space-y-1.5 px-1">
        <MacroBar
          label="タンパク質"
          value={proteinG}
          target={targets?.proteinG ?? null}
        />
        <MacroBar label="脂質" value={fatG} target={targets?.fatG ?? null} />
        <MacroBar
          label="炭水化物"
          value={carbsG}
          target={targets?.carbsG ?? null}
        />
      </div>
    </div>
  );
}

/** 横棒ゲージ(PFC 1項目分): ラベル / 摂取・目標 / 残り / バー */
function MacroBar({
  label,
  value,
  target,
}: {
  label: string;
  value: number;
  target: number | null;
}) {
  const fmt = (n: number) => n.toFixed(1);
  const hasTarget = target != null && target > 0;
  const ratio = hasTarget ? Math.min(1, value / target!) : 0;

  return (
    <div>
      <p className="text-[13px] font-semibold leading-tight">{label}</p>
      <p className="mt-0.5 text-[15px] font-bold leading-none [font-variant-numeric:tabular-nums]">
        <span className="text-primary">{fmt(value)}</span>
        <span className="mx-1 text-muted-foreground">/</span>
        <span className="text-muted-foreground">
          {hasTarget ? `${fmt(target!)} g` : "-- g"}
        </span>
      </p>
      <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-[hsl(240_12%_92%)]">
        {hasTarget && (
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${ratio * 100}%` }}
          />
        )}
      </div>
    </div>
  );
}
