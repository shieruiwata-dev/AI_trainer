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

/** Step2: 身体情報。ここでもカロリーやPFCは算出しない */
export default function OnboardingBody() {
  const navigate = useNavigate();
  const saved = loadOnboardingState();
  const [height, setHeight] = useState(saved.height_cm?.toString() ?? "");
  const [weight, setWeight] = useState(saved.current_weight_kg?.toString() ?? "");
  const [age, setAge] = useState(saved.age?.toString() ?? "");
  const [sex, setSex] = useState<"male" | "female" | "">(saved.sex ?? "");

  const valid =
    Number(height) > 0 && Number(weight) > 0 && Number(age) > 0 && sex !== "";

  function next() {
    if (!valid) return;
    saveOnboardingState(
      mergeOnboardingState(loadOnboardingState(), {
        height_cm: height,
        current_weight_kg: weight,
        age,
        sex,
      })
    );
    void setOnboardingStep("goal_timeline");
    navigate("/onboarding/timeline", { replace: true });
  }

  return (
    <OnboardingShell
      step={2}
      total={4}
      title="身体情報を教えてください"
      description="目標づくりの計算に使います。"
      onBack={() => navigate("/onboarding/purpose")}
    >
      <div className="flex flex-col gap-4">
        <Field label="身長 (cm)">
          <Input
            inputMode="decimal"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            placeholder="例: 172"
          />
        </Field>
        <Field label="現在の体重 (kg)">
          <Input
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="例: 68"
          />
        </Field>
        <Field label="年齢">
          <Input
            inputMode="numeric"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="例: 28"
          />
        </Field>
        <Field label="性別">
          <div className="flex gap-3">
            {(["male", "female"] as const).map((v) => (
              <Button
                key={v}
                type="button"
                variant={sex === v ? "default" : "outline"}
                onClick={() => setSex(v)}
                className="flex-1 rounded-xl active:scale-95"
              >
                {v === "male" ? "男性" : "女性"}
              </Button>
            ))}
          </div>
        </Field>

        <Button
          disabled={!valid}
          onClick={next}
          className="mt-4 h-12 rounded-xl text-base active:scale-95"
        >
          次へ
        </Button>
      </div>
    </OnboardingShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
