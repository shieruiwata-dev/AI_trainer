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
      {/* 上段: 目標チップ(タップで目標設定へ)+ 摂取カロリー */}
      <div className="flex items-start justify-between px-1">
        <Link
          to="/settings"
          aria-label="目標を設定する"
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
        <p className="text-[34px] font-bold leading-none tracking-[-0.02em] [font-variant-numeric:tabular-nums]">
          {todayCalories}
          <span className="ml-1.5 text-[15px] font-normal text-muted-foreground">
            kcal
          </span>
        </p>
      </div>

      {/* PFCゲージ */}
      <div className="mt-3 grid grid-cols-3 gap-1">
        <MacroGauge
          label="タンパク質"
          value={proteinG}
          target={targets?.proteinG ?? null}
        />
        <MacroGauge label="脂質" value={fatG} target={targets?.fatG ?? null} />
        <MacroGauge
          label="炭水化物"
          value={carbsG}
          target={targets?.carbsG ?? null}
        />
      </div>
    </div>
  );
}

/** 270度の円弧ゲージ(PFC 1項目分) */
function MacroGauge({
  label,
  value,
  target,
}: {
  label: string;
  value: number;
  target: number | null;
}) {
  const fmt = (n: number) => n.toFixed(1);
  const r = 33;
  const C = 2 * Math.PI * r;
  const arcLen = 0.75 * C; // 270度
  const ratio = target ? Math.min(1, value / target) : 0;

  // 達成度チップ: 80%未満=不足(グレー) / 80〜115%=範囲内(緑) / それ以上=オーバー(赤)
  const status = (() => {
    if (!target) return null;
    const p = value / target;
    if (p < 0.8)
      return {
        cls: "bg-muted text-muted-foreground",
        text: `-${fmt(target - value)}g`,
        check: false,
      };
    if (p <= 1.15)
      return {
        cls: "bg-[#34c759]/15 text-[#248a3d]",
        text: "目標範囲内",
        check: true,
      };
    return {
      cls: "bg-destructive/10 text-destructive",
      text: `+${fmt(value - target)}g`,
      check: false,
    };
  })();

  return (
    <div className="flex flex-col items-center">
      <p className="text-[13px] font-semibold">{label}</p>
      <div className="relative mt-1 h-[70px] w-[70px]">
        <svg viewBox="0 0 80 80" className="h-full w-full">
          <g transform="rotate(135 40 40)">
            <circle
              cx="40"
              cy="40"
              r={r}
              fill="none"
              stroke="hsl(240 12% 92%)"
              strokeWidth="6.5"
              strokeLinecap="round"
              strokeDasharray={`${arcLen} ${C}`}
            />
            {target != null && ratio > 0 && (
              <circle
                cx="40"
                cy="40"
                r={r}
                fill="none"
                stroke="hsl(210 100% 40%)"
                strokeWidth="6.5"
                strokeLinecap="round"
                strokeDasharray={`${arcLen * ratio} ${C}`}
                className="transition-[stroke-dasharray] duration-500"
              />
            )}
          </g>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-[15px] font-bold text-primary [font-variant-numeric:tabular-nums]">
            {fmt(value)}
            <span className="text-[10px] font-semibold">g</span>
          </p>
        </div>
      </div>
      <p className="text-[12px] text-muted-foreground [font-variant-numeric:tabular-nums]">
        {target != null ? `/ ${fmt(target)}g` : "—"}
      </p>
      {status && (
        <span
          className={cn(
            "mt-1.5 inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-[11px] font-medium [font-variant-numeric:tabular-nums]",
            status.cls
          )}
        >
          {status.check && <Check className="h-3 w-3" strokeWidth={2.5} />}
          {status.text}
        </span>
      )}
    </div>
  );
}
