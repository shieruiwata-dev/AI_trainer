import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OnboardingShell from "@/components/OnboardingShell";
import { RulerPicker } from "@/components/RulerPicker";
import { WheelPicker } from "@/components/WheelPicker";
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
const CM_PER_INCH = 2.54;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** 性別の選択肢。other は「回答しない」を含む受け皿 */
const SEX_OPTIONS = [
  { value: "male", label: "男性", symbol: "♂" },
  { value: "female", label: "女性", symbol: "♀" },
  { value: "other", label: "その他・回答しない", symbol: "⚲" },
] as const;

/** 単位切替のセグメント(kg/lbs・cm/ft・in で共用) */
function UnitToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="mx-auto flex w-56 rounded-full bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "h-10 flex-1 rounded-full text-[15px] font-semibold transition-colors",
            value === o.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** 身長ホイールの選択肢。cm は1cm刻み、ft/in は1インチ刻み(値は常にcm) */
function heightItems(unit: "cm" | "ftin") {
  const items: { value: number; label: string }[] = [];
  if (unit === "cm") {
    for (let cm = 120; cm <= 220; cm++) items.push({ value: cm, label: `${cm} cm` });
  } else {
    for (let inch = 48; inch <= 87; inch++) {
      const cm = Math.round(inch * CM_PER_INCH);
      items.push({
        value: cm,
        label: `${Math.floor(inch / 12)}' ${inch % 12}"`,
      });
    }
  }
  return items;
}

/** ホイールの選択肢に無い値は最も近いものへ寄せる */
function nearest(items: { value: number }[], v: number) {
  return items.reduce(
    (best, i) => (Math.abs(i.value - v) < Math.abs(best - v) ? i.value : best),
    items[0].value
  );
}

/**
 * Step2: 身体情報。1画面1項目で順に聞く(身長 → 体重 → 年齢 → 性別)。
 * 体重は定規をスワイプする感覚的なUI(RulerPicker)で入力する。
 * ここでもカロリーやPFCは算出しない
 */
export default function OnboardingBody() {
  const navigate = useNavigate();
  const saved = loadOnboardingState();
  const [sub, setSub] = useState<SubStep>("height");

  // 身長は内部では常にcmで持ち、表示だけ単位に合わせて変換する
  const [heightCm, setHeightCm] = useState<number>(saved.height_cm ?? 165);
  const [heightUnit, setHeightUnit] = useState<"cm" | "ftin">("cm");
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

  function finish(sex: "male" | "female" | "other") {
    saveOnboardingState(
      mergeOnboardingState(loadOnboardingState(), {
        height_cm: heightCm,
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
    const items = heightItems(heightUnit);
    return (
      <OnboardingShell
        {...shell}
        title="身長は?"
        description="1日の目標カロリーの計算に使います。"
      >
        <div className="flex flex-col gap-8">
          {/* 単位切替(ft・in / cm) */}
          <UnitToggle
            options={[
              { value: "ftin", label: "ft・in" },
              { value: "cm", label: "cm" },
            ]}
            value={heightUnit}
            onChange={(u) => {
              setHeightUnit(u);
              setHeightCm(nearest(heightItems(u), heightCm));
            }}
          />

          <WheelPicker
            key={heightUnit}
            ariaLabel="身長"
            items={items}
            value={nearest(items, heightCm)}
            onChange={setHeightCm}
          />

          <Button
            onClick={() => advance({ height_cm: heightCm }, "weight")}
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
          <UnitToggle
            options={[
              { value: "lbs", label: "lbs" },
              { value: "kg", label: "kg" },
            ]}
            value={unit}
            onChange={setUnit}
          />

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
        {SEX_OPTIONS.map(({ value, label, symbol }) => (
          <Button
            key={value}
            variant={saved.sex === value ? "default" : "outline"}
            onClick={() => finish(value)}
            className="h-auto justify-start gap-3 rounded-xl px-5 py-4 text-base active:scale-95"
          >
            <span aria-hidden className="text-[20px] leading-none">
              {symbol}
            </span>
            {label}
          </Button>
        ))}
      </div>
    </OnboardingShell>
  );
}
