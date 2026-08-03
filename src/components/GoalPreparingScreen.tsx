import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

/**
 * AI目標プランの生成待ち画面(%が育つ演出)。
 *
 * 実際の応答時間は分からないので、擬似的な進捗を刻む:
 * - 待っている間: 92%に向かって徐々に減速しながら進む(92%で足踏み)
 * - done になったら: 一気に100%まで走り、少し見せてから onComplete を呼ぶ
 * 数値はすべて下の定数で調整できる。
 */

const TICK_MS = 80;
/** 待機中はここまでしか進まない(応答が来ない限り100%にしない) */
const HOLD_AT = 92;
/** 待機中の進み方: (残り) * EASE + FLOOR ずつ進む */
const EASE = 0.018;
const FLOOR = 0.05;
/** done後の1tickあたりの進み */
const FINISH_STEP = 4;
/** 100%を見せてから画面を切り替えるまでの間 */
const COMPLETE_DELAY_MS = 400;

const ITEMS = [
  { label: "カロリー", at: 18 },
  { label: "炭水化物", at: 36 },
  { label: "タンパク質", at: 54 },
  { label: "脂質", at: 72 },
  { label: "総合バランス", at: 96 },
];

function statusText(p: number): string {
  if (p < 25) return "基礎代謝(BMR)を計算しています…";
  if (p < 50) return "活動量を反映しています…";
  if (p < 75) return "PFCバランスを調整しています…";
  return "プランをまとめています…";
}

export default function GoalPreparingScreen({
  done,
  onComplete,
}: {
  /** 裏の処理(EDF)が終わったら true にする */
  done: boolean;
  /** 100%の表示が終わったら呼ばれる */
  onComplete: () => void;
}) {
  const [percent, setPercent] = useState(0);
  const doneRef = useRef(done);
  doneRef.current = done;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const completedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      setPercent((p) => {
        if (doneRef.current) return Math.min(100, p + FINISH_STEP);
        return Math.min(HOLD_AT, p + (HOLD_AT - p) * EASE + FLOOR);
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (percent < 100 || completedRef.current) return;
    completedRef.current = true;
    const t = setTimeout(() => onCompleteRef.current(), COMPLETE_DELAY_MS);
    return () => clearTimeout(t);
  }, [percent]);

  const shown = Math.min(100, Math.floor(percent));

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-10">
      <p className="text-center text-6xl font-bold tracking-tight tabular-nums">
        {shown}%
      </p>
      <h1 className="mt-4 text-center text-2xl font-bold leading-snug">
        あなた専用のプランを
        <br />
        作成しています
      </h1>

      <div className="mt-8 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 ease-ios"
          style={{ width: `${shown}%` }}
        />
      </div>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        {statusText(shown)}
      </p>

      <div className="mt-8 rounded-[18px] border bg-card px-5 py-4">
        <p className="text-sm font-semibold text-muted-foreground">
          1日の目安を計算中
        </p>
        <ul className="mt-3 flex flex-col gap-3">
          {ITEMS.map(({ label, at }) => (
            <li key={label} className="flex items-center justify-between">
              <span className="text-[15px] font-medium">{label}</span>
              {percent >= at ? (
                <span className="flex h-6 w-6 animate-pop-in items-center justify-center rounded-full bg-primary">
                  <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                </span>
              ) : (
                <span className="h-6 w-6 rounded-full border border-[#e0e0e0]" />
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
