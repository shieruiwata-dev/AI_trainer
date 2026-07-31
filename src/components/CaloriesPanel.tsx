import { Link } from "react-router-dom";
import { Check, ChevronDown } from "lucide-react";
import { calcMacroTargets } from "@/lib/nutrition";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  /** チャット上部のスワイプカードでは影あり、記録ページ内では影なし */
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
        "rounded-[18px] border bg-card px-4 pb-3.5 pt-3.5",
        shadow && "shadow-[0_3px_14px_rgba(0,0,0,0.07)]"
      )}
    >
      {/* 上段: 目標チップ(タップで目標ページへ)+ 摂取カロリー */}
      <div className="flex items-start justify-between px-1">
        <Link
          to="/goal"
          aria-label="目標を見る"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 rounded-[12px] bg-muted px-3.5 py-2 transition-transform active:scale-95"
        >
          <span>
            <span className="block text-[11px] leading-none text-muted-foreground">
              目標
            </span>
            <span className="mt-1 block text-[15px] font-semibold leading-none [font-variant-numeric:tabular-nums]">
              {hasTarget ? `${targetCalories} kcal` : "未設定"}
            </span>
          </span>
          <ChevronDown
            className="h-4 w-4 -rotate-90 text-muted-foreground"
            strokeWidth={2}
          />
        </Link>
        <div className="text-right">
          <p className="text-[34px] font-bold leading-none tracking-[-0.02em] [font-variant-numeric:tabular-nums]">
            {todayCalories}
            <span className="ml-1 text-[15px] font-normal text-muted-foreground">
              / {hasTarget ? targetCalories : "--"} kcal
            </span>
          </p>
          <p className="mt-1.5 text-[12px] text-muted-foreground [font-variant-numeric:tabular-nums]">
            {!hasTarget
              ? "目標未設定"
              : targetCalories! - todayCalories > 0
                ? `残り ${targetCalories! - todayCalories} kcal`
                : targetCalories! - todayCalories === 0
                  ? "達成"
                  : `目標より +${todayCalories - targetCalories!} kcal`}
          </p>
        </div>

      </div>

      {/* PFCゲージ(横棒) */}
      <div className="mt-3 space-y-2.5 px-1">
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

/** 横棒ゲージ(PFC 1項目分): ラベル+達成度チップ / 実績・目標 / バー */
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
  const remaining = hasTarget ? Math.max(target! - value, 0) : 0;

  // 未達=残り / 達成 / 超過=目標より+X
  const status = (() => {
    if (!hasTarget)
      return { cls: "bg-muted text-muted-foreground", text: "目標未設定", check: false };
    if (value < target!)
      return {
        cls: "bg-muted text-muted-foreground",
        text: `残り ${fmt(remaining)}g`,
        check: false,
      };
    if (value === target!)
      return {
        cls: "bg-[#34c759]/15 text-[#248a3d]",
        text: "達成",
        check: true,
      };
    return {
      cls: "bg-destructive/10 text-destructive",
      text: `目標より +${fmt(value - target!)}g`,
      check: false,
    };
  })();

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
          {label}
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium [font-variant-numeric:tabular-nums]",
              status.cls
            )}
          >
            {status.check && <Check className="h-3 w-3" strokeWidth={2.5} />}
            {status.text}
          </span>
        </p>
        <p className="shrink-0 text-[13px] text-muted-foreground [font-variant-numeric:tabular-nums]">
          <span className="text-[15px] font-bold text-primary">
            {fmt(value)}
          </span>
          {hasTarget ? ` / ${fmt(target!)}g` : " g"}
        </p>
      </div>
      <div className="mt-1 h-[6px] overflow-hidden rounded-full bg-[hsl(240_12%_92%)]">
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

