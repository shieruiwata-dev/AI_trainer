import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OnboardingShell from "@/components/OnboardingShell";
import { RulerPicker } from "@/components/RulerPicker";
import {
  GOAL_STEP_INDEX,
  GOAL_STEP_TOTAL,
  setOnboardingStep,
} from "@/lib/onboardingStep";
import {
  loadOnboardingState,
  mergeOnboardingState,
  saveOnboardingState,
} from "@/lib/onboardingState";
import { cn } from "@/lib/utils";

/** 身体情報の入力順(1画面1項目) */
const SUB_STEPS = ["height", "weight", "age", "sex"] as const;
type SubStep = (typeof SUB_STEPS)[number];

const KG_PER_LBS = 0.453_592_37;
const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Step2: 身体情報。1画面1項目で順に聞く(身長 → 体重 → 年齢 → 性別)。
 * 体重は定規をスワイプする感覚的なUI(RulerPicker)で入力する。
 * ここでもカロリーやPFCは算出しない
 */
export default function OnboardingBody() {
  const navigate = useNavigate();
  const saved = loadOnboardingState();
  const [sub, setSub] = useState<SubStep>("height");

  const [height, setHeight] = useState(saved.height_cm?.toString() ?? "");
  const [age, setAge] = useState(saved.age?.toString() ?? "");
  // 体重は内部では常にkgで持ち、表示だけ単位に合わせて変換する
  const [weightKg, setWeightKg] = useState<number>(
    saved.current_weight_kg ?? 60
  );
  const [unit, setUnit] = useState<"kg" | "lbs">("kg");

  /** 入力済みの項目を保存して次のサブ画面へ */
  function advance(patch: Record<string, unknown>, nextSub: SubStep | null) {
    saveOnboardingState(mergeOnboardingState(loadOnboardingState(), patch));
    if (nextSub) {
      setSub(nextSub);
      return;
    }
  }

  function finish(sex: "male" | "female") {
    saveOnboardingState(
      mergeOnboardingState(loadOnboardingState(), {
        height_cm: height,
        current_weight_kg: round1(weightKg),
        age,
        sex,
      })
    );
    void setOnboardingStep("goal_activity");
    navigate("/onboarding/activity", { replace: true });
  }

  function back() {
    const i = SUB_STEPS.indexOf(sub);
    if (i > 0) setSub(SUB_STEPS[i - 1]);
    else navigate("/onboarding/purpose");
  }

  const shell = {
    step: GOAL_STEP_INDEX.goal_body,
    total: GOAL_STEP_TOTAL,
    onBack: back,
  };

  if (sub === "height") {
    const valid = Number(height) > 0;
    return (
      <OnboardingShell
        {...shell}
        title="身長を教えてください"
        description="目標づくりの計算に使います。"
      >
        <div className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              身長 (cm)
            </span>
            <Input
              inputMode="decimal"
              autoFocus
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="例: 172"
              className="h-14 text-xl"
            />
          </label>
          <Button
            disabled={!valid}
            onClick={() => advance({ height_cm: height }, "weight")}
            className="h-12 rounded-xl text-base active:scale-95"
          >
            次へ
          </Button>
        </div>
      </OnboardingShell>
    );
  }

  if (sub === "weight") {
    const isKg = unit === "kg";
    const display = isKg ? weightKg : round1(weightKg / KG_PER_LBS);
    return (
      <OnboardingShell
        {...shell}
        title="現在の体重は?"
        description="1日の目標カロリーの計算に使います。"
      >
        <div className="flex flex-col gap-10">
          {/* 単位切替(kg / lbs) */}
          <div className="mx-auto flex w-56 rounded-full bg-muted p-1">
            {(["lbs", "kg"] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                aria-pressed={unit === u}
                className={cn(
                  "h-10 flex-1 rounded-full text-[15px] font-semibold transition-colors",
                  unit === u
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {u}
              </button>
            ))}
          </div>

          {/* 現在値 + 定規 */}
          <div>
            <p className="text-center text-[15px] text-muted-foreground">
              現在の体重
            </p>
            <p className="mt-1 text-center text-[44px] font-bold leading-none tracking-[-0.02em] [font-variant-numeric:tabular-nums]">
              {display.toFixed(1)}
              <span className="ml-2 text-[24px] font-semibold">{unit}</span>
            </p>
            <div className="mt-8">
              <RulerPicker
                key={unit}
                ariaLabel={`現在の体重(${unit})`}
                value={display}
                min={isKg ? 30 : 66}
                max={isKg ? 200 : 440}
                step={0.1}
                mediumEvery={0.5}
                majorEvery={1}
                pxPerStep={8}
                onChange={(v) =>
                  setWeightKg(isKg ? v : round1(v * KG_PER_LBS))
                }
              />
            </div>
          </div>

          <Button
            onClick={() =>
              advance({ current_weight_kg: round1(weightKg) }, "age")
            }
            className="h-12 rounded-xl text-base active:scale-95"
          >
            次へ
          </Button>
        </div>
      </OnboardingShell>
    );
  }

  if (sub === "age") {
    const valid = Number(age) > 0;
    return (
      <OnboardingShell
        {...shell}
        title="年齢を教えてください"
        description="基礎代謝の計算に使います。"
      >
        <div className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              年齢
            </span>
            <Input
              inputMode="numeric"
              autoFocus
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="例: 28"
              className="h-14 text-xl"
            />
          </label>
          <Button
            disabled={!valid}
            onClick={() => advance({ age }, "sex")}
            className="h-12 rounded-xl text-base active:scale-95"
          >
            次へ
          </Button>
        </div>
      </OnboardingShell>
    );
  }

  // sub === "sex"
  return (
    <OnboardingShell
      {...shell}
      title="性別を教えてください"
      description="基礎代謝の計算に使います。"
    >
      <div className="flex flex-col gap-3">
        {(
          [
            ["male", "男性"],
            ["female", "女性"],
          ] as const
        ).map(([v, label]) => (
          <Button
            key={v}
            variant={saved.sex === v ? "default" : "outline"}
            onClick={() => finish(v)}
            className="h-auto justify-start rounded-xl px-5 py-4 text-base active:scale-95"
          >
            {label}
          </Button>
        ))}
      </div>
    </OnboardingShell>
  );
}
