import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OnboardingShell from "@/components/OnboardingShell";
import { setOnboardingStep } from "@/lib/onboardingStep";
import {
  loadOnboardingState,
  mergeOnboardingState,
  saveOnboardingState,
} from "@/lib/onboardingState";

const DURATIONS = [1, 2, 3, 6, 12];

/** Step4: 期限・希望ペース。期日はここでユーザーが決めるまで作らない */
export default function OnboardingTimeline() {
  const navigate = useNavigate();
  const saved = loadOnboardingState();
  const [months, setMonths] = useState<number | null>(
    saved.duration_months ?? null
  );
  const [days, setDays] = useState<number | null>(
    saved.available_training_days ?? null
  );
  const [targetWeight, setTargetWeight] = useState(
    saved.target_weight_kg?.toString() ?? ""
  );

  const valid = months !== null && days !== null;

  function next() {
    if (!valid) return;
    saveOnboardingState(
      mergeOnboardingState(loadOnboardingState(), {
        duration_months: months,
        available_training_days: days,
        target_weight_kg: targetWeight,
      })
    );
    void setOnboardingStep("goal_proposal");
    navigate("/onboarding/proposal", { replace: true });
  }

  return (
    <OnboardingShell
      step={4}
      total={4}
      title="いつまでに、どのくらいのペースで?"
      description="ここで決めた期間をもとにAIが目標を提案します。"
      onBack={() => navigate("/onboarding/body")}
    >
      <div className="flex flex-col gap-6">
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">期間</p>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((m) => (
              <Button
                key={m}
                variant={months === m ? "default" : "outline"}
                onClick={() => setMonths(m)}
                className="rounded-xl active:scale-95"
              >
                {m}ヶ月
              </Button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            週に運動できる日数
          </p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <Button
                key={d}
                variant={days === d ? "default" : "outline"}
                onClick={() => setDays(d)}
                className="w-12 rounded-xl px-0 active:scale-95"
              >
                {d}
              </Button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            目標体重 (kg) ※任意・未入力ならAIが提案します
          </span>
          <Input
            inputMode="decimal"
            value={targetWeight}
            onChange={(e) => setTargetWeight(e.target.value)}
            placeholder="未入力でもOK"
          />
        </label>

        <Button
          disabled={!valid}
          onClick={next}
          className="h-12 rounded-xl text-base active:scale-95"
        >
          AIに目標を提案してもらう
        </Button>
      </div>
    </OnboardingShell>
  );
}
