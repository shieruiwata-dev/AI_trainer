import { useState } from "react";
import { ChevronDown, Info, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-1.5 space-y-1">
      {items.map((t) => (
        <li
          key={t}
          className="text-[13px] leading-[1.7] text-muted-foreground"
        >
          ・{t}
        </li>
      ))}
    </ul>
  );
}

function isBulk(purpose: string | null | undefined) {
  const p = (purpose ?? "").toLowerCase();
  return (
    p.includes("bulk") ||
    p.includes("gain") ||
    p.includes("増量") ||
    p.includes("muscle")
  );
}

const TODO_BULK = [
  "毎食タンパク質を1品入れる",
  "3食で足りなければ間食を追加する",
  "週4回以上体重を測る",
  "揚げ物やお菓子だけでカロリーを増やさない",
];

const TODO_CUT = [
  "飲み物のカロリーを減らす",
  "毎食タンパク質を入れる",
  "主食量を一定にする",
  "週4回以上体重を測る",
];

const MEALS_BULK: [string, string][] = [
  ["朝", "ごはん1杯・卵2個・納豆・味噌汁"],
  ["昼", "定食(ごはん大盛り)・焼き魚か鶏肉・野菜"],
  ["間食", "おにぎり1個＋プロテイン、またはバナナ＋ヨーグルト"],
  ["夜", "ごはん1杯・肉か魚150g・野菜・汁物"],
];

const MEALS_CUT: [string, string][] = [
  ["朝", "ごはん軽め1杯・卵2個・味噌汁"],
  ["昼", "定食(ごはん普通)・鶏肉か魚・野菜多め"],
  ["間食", "無糖ヨーグルトかプロテイン(甘い飲み物の代わりに)"],
  ["夜", "ごはん軽め・肉か魚150g・野菜・汁物"],
];

/**
 * 「この数値の意味」解説カード。
 * nutrition_level に応じて説明の詳しさを変える(advancedでは基本説明を省略)。
 */
export function MacroExplainerCard({
  level,
  proteinG,
  fatG,
  carbsG,
  purpose,
  videoAvailable = false,
  onWatchVideo,
}: {
  level: NutritionLevel | null | undefined;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
  purpose?: string | null;
  videoAvailable?: boolean;
  onWatchVideo?: () => void;
}) {
  const advanced = level === "advanced";
  const beginner = level !== "intermediate" && !advanced;
  const [open, setOpen] = useState(beginner);
  const bulk = isBulk(purpose);
  const meals = bulk ? MEALS_BULK : MEALS_CUT;

  if (advanced) return null;
  if (proteinG == null && fatG == null && carbsG == null) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-[18px] border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-1.5 px-4 py-3 text-[13px] font-semibold text-muted-foreground",
          open && "border-b border-border"
        )}
      >
        <Info className="h-[16px] w-[16px]" strokeWidth={1.8} />
        この数値の意味
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 transition-transform",
            open && "rotate-180"
          )}
          strokeWidth={1.8}
        />
      </button>
      <div className={cn("px-4 py-3.5", !open && "hidden")}>
        {beginner ? (
          <>
            {/* 1. PFCとは */}
            <p className="text-[13px] font-semibold text-foreground">PFCとは</p>
            <Bullets
              items={["P＝タンパク質", "F＝脂質", "C＝炭水化物"]}
            />

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
                  note="トレーニングのエネルギー源になります。"
                />
              )}
            </ul>

            {/* 2. 最初に優先すること */}
            <p className="mt-4 text-[13px] font-semibold text-foreground">
              最初に優先すること
            </p>
            <Bullets
              items={["1. 総カロリー", "2. タンパク質", "3. 体重記録"]}
            />
            <p className="mt-2 rounded-[10px] bg-secondary px-3 py-2.5 text-[12px] leading-[1.6] text-muted-foreground">
              最初からPFCを毎日ぴったり合わせる必要はありません。まずは総カロリーとタンパク質を優先し、慣れてきたら脂質と炭水化物も調整してください。
            </p>

            {/* 3. 今日からやること */}
            <p className="mt-4 text-[13px] font-semibold text-foreground">
              今日からやること
            </p>
            <Bullets items={bulk ? TODO_BULK : TODO_CUT} />

            {/* 4. 1日の食事例 */}
            <p className="mt-4 text-[13px] font-semibold text-foreground">
              1日の食事例
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {meals.map(([when, text]) => (
                <li key={when} className="flex gap-2 text-[13px] leading-[1.6]">
                  <span className="w-8 shrink-0 font-medium text-foreground">
                    {when}
                  </span>
                  <span className="text-muted-foreground">{text}</span>
                </li>
              ))}
            </ul>

            {/* 5. 調整ルール */}
            <p className="mt-4 text-[13px] font-semibold text-foreground">
              調整ルール
            </p>
            <p className="mt-1.5 text-[13px] leading-[1.7] text-muted-foreground">
              {bulk
                ? "2〜3週間、週平均体重が増えない場合は、1日100〜150kcal追加してください。"
                : "2〜3週間、週平均体重が減らない場合は、1日100〜150kcal減らしてください。"}
            </p>

            {/* 6. 動画導線 */}
            <div className="mt-4 rounded-[12px] border border-border px-3 py-3">
              <p className="text-[13px] font-semibold text-foreground">
                食事管理の基本を3分で確認
              </p>
              {videoAvailable && onWatchVideo ? (
                <button
                  type="button"
                  onClick={onWatchVideo}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-[12px] bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-transform active:scale-95"
                >
                  <PlayCircle className="h-4 w-4" strokeWidth={1.8} />
                  動画を見る
                </button>
              ) : (
                <p className="mt-1 text-[12px] text-muted-foreground">
                  動画は準備中です
                </p>
              )}
            </div>
          </>
        ) : (
          <>
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
            <p className="mt-3 text-[13px] font-semibold text-foreground">
              調整ルール
            </p>
            <p className="mt-1 text-[13px] leading-[1.7] text-muted-foreground">
              {bulk
                ? "2〜3週間、週平均体重が増えない場合は、1日100〜150kcal追加してください。"
                : "2〜3週間、週平均体重が減らない場合は、1日100〜150kcal減らしてください。"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default MacroExplainerCard;
