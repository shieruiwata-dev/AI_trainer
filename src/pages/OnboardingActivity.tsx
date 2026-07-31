import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import OnboardingShell from "@/components/OnboardingShell";
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

const ACTIVITY_OPTIONS = [
  { value: "sedentary", label: "ほとんど運動しない(デスクワーク中心)" },
  { value: "light", label: "軽い運動を週1〜2回" },
  { value: "moderate", label: "中程度の運動を週3〜4回" },
  { value: "high", label: "強い運動を週5〜6回" },
  { value: "very_high", label: "毎日ハードに動いている" },
] as const;

const DAYS = [1, 2, 3, 4, 5, 6, 7];

/** Step3: 運動習慣。ここでも目標やカロリーは作らない */
export default function OnboardingActivity() {
  const navigate = useNavigate();
  const saved = loadOnboardingState();
  const [activity, setActivity] = useState<string | null>(
    saved.activity_level ?? null
  );
  const [days, setDays] = useState<number | null>(
    saved.available_training_days ?? null
  );

  const valid = activity !== null && days !== null;

  function next() {
    if (!valid) return;
    saveOnboardingState(
      mergeOnboardingState(loadOnboardingState(), {
        activity_level: activity,
        available_training_days: days,
      })
    );
    void setOnboardingStep("experience");
    navigate("/onboarding/experience", { replace: true });
  }

  return (
    <OnboardingShell
      step={GOAL_STEP_INDEX.goal_activity}
      total={GOAL_STEP_TOTAL}
      title="普段の運動習慣を教えてください"
      description="消費カロリーとトレーニング頻度の目安に使います。"
      onBack={() => navigate("/onboarding/body")}
    >
      <div className="flex flex-col gap-6">
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            活動量
          </p>
          <div className="flex flex-col gap-3">
            {ACTIVITY_OPTIONS.map((o) => (
              <Button
                key={o.value}
                variant={activity === o.value ? "default" : "outline"}
                onClick={() => setActivity(o.value)}
                className="h-auto justify-start rounded-xl px-5 py-4 text-left text-base active:scale-95"
              >
                {o.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            週に何日トレーニングできますか?
          </p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <Button
                key={d}
                variant={days === d ? "default" : "outline"}
                onClick={() => setDays(d)}
                className="w-14 rounded-xl active:scale-95"
              >
                {d}日
              </Button>
            ))}
          </div>
        </div>

        <Button
          disabled={!valid}
          onClick={next}
          className="h-12 rounded-xl text-base active:scale-95"
        >
          次へ
        </Button>
      </div>
    </OnboardingShell>
  );
}
