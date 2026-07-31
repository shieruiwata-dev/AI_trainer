import { Info } from "lucide-react";

export type NutritionLevel = "beginner" | "intermediate" | "advanced" | string;

function Row({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <li className="text-[13px] leading-[1.6]">
      <p className="font-medium text-foreground">
        ・{label}
        <span className="ml-1 [font-variant-numeric:tabular-nums]">{value}</span>
      </p>
      {note && <p className="pl-3 text-muted-foreground">{note}</p>}
    </li>
  );
}

/**
 * 「この数値の意味」解説カード。
 * nutrition_level に応じて説明の詳しさを変える(advancedでは基本説明を省略)。
 */
export function MacroExplainerCard({
  level,
  proteinG,
  fatG,
  carbsG,
}: {
  level: NutritionLevel | null | undefined;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
}) {
  if (level === "advanced") return null;
  if (proteinG == null && fatG == null && carbsG == null) return null;

  const beginner = level !== "intermediate";

  return (
    <div className="mt-3 overflow-hidden rounded-[18px] border bg-card">
      <div className="flex items-center gap-1.5 border-b border-[#f0f0f0] px-4 py-3 text-[13px] font-semibold text-muted-foreground">
        <Info className="h-[16px] w-[16px]" strokeWidth={1.8} />
        この数値の意味
      </div>
      <div className="px-4 py-3.5">
        {beginner ? (
          <>
            <p className="text-[13px] font-semibold text-foreground">
              PFCとは
            </p>
            <p className="mt-1 text-[13px] leading-[1.7] text-muted-foreground">
              P＝タンパク質、F＝脂質、C＝炭水化物です。
            </p>
            <p className="mt-3 text-[13px] font-semibold text-foreground">
              今回の設定
            </p>
            <ul className="mt-1.5 space-y-2">
              {proteinG != null && (
                <Row
                  label="タンパク質"
                  value={`${proteinG}g`}
                  note="筋肉を増やし、回復を支えるための目安です。"
                />
              )}
              {fatG != null && (
                <Row
                  label="脂質"
                  value={`${fatG}g`}
                  note="ホルモンや健康維持に必要な量を確保しています。"
                />
              )}
              {carbsG != null && (
                <Row
                  label="炭水化物"
                  value={`${carbsG}g`}
                  note="筋力トレーニングのエネルギー源として多めに設定しています。"
                />
              )}
            </ul>
            <p className="mt-3 rounded-[10px] bg-secondary px-3 py-2.5 text-[12px] leading-[1.6] text-muted-foreground">
              最初から毎日完全一致させる必要はありません。まずは総カロリーとタンパク質を優先してください。
            </p>
          </>
        ) : (
          <p className="text-[13px] leading-[1.7] text-muted-foreground">
            P/F/Cは
            {proteinG != null && (
              <b className="text-foreground">タンパク質{proteinG}g</b>
            )}
            {fatG != null && (
              <>
                ・<b className="text-foreground">脂質{fatG}g</b>
              </>
            )}
            {carbsG != null && (
              <>
                ・<b className="text-foreground">炭水化物{carbsG}g</b>
              </>
            )}
            。総カロリーとタンパク質を優先し、脂質は下限を確保、残りを炭水化物で調整してください。
          </p>
        )}
      </div>
    </div>
  );
}

export default MacroExplainerCard;
