import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import OnboardingShell from "@/components/OnboardingShell";
import { setOnboardingStep } from "@/lib/onboardingStep";
import {
  loadOnboardingState,
  mergeOnboardingState,
  saveOnboardingState,
} from "@/lib/onboardingState";

const OPTIONS = [
  { value: "cut", label: "体脂肪を落としたい" },
  { value: "bulk", label: "筋肉を増やしたい" },
  { value: "strength", label: "筋力を伸ばしたい" },
  { value: "health", label: "健康的な身体を作りたい" },
  { value: "undecided", label: "まだ決まっていない" },
] as const;

/** Step1: 目的選択。ここでは目標(体重・期日・カロリー)は一切作らない */
export default function OnboardingPurpose() {
  const navigate = useNavigate();
  const current = loadOnboardingState().purpose_type;

  function choose(value: string) {
    saveOnboardingState(
      mergeOnboardingState(loadOnboardingState(), { purpose_type: value })
    );
    void setOnboardingStep("goal_body");
    navigate("/onboarding/body", { replace: true });
  }

  return (
    <OnboardingShell
      step={1}
      total={4}
      title="今、最も近い目標を教えてください"
      description="ここではまだ目標は決まりません。あとで一緒に作ります。"
    >
      <div className="flex flex-col gap-3">
        {OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={current === option.value ? "default" : "outline"}
            onClick={() => choose(option.value)}
            className="h-auto justify-start rounded-xl px-5 py-4 text-base active:scale-95"
          >
            {option.label}
          </Button>
        ))}
      </div>
    </OnboardingShell>
  );
}
