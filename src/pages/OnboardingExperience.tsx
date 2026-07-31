import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type StepKey =
  | "training_duration"
  | "training_load_management"
  | "pfc_knowledge"
  | "food_logging_experience";

const STEPS: {
  key: StepKey;
  title: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: "training_duration",
    title: "筋トレの経験はどれくらいですか?",
    options: [
      { value: "none", label: "経験なし" },
      { value: "under_six_months", label: "6ヶ月未満" },
      { value: "six_months_to_two_years", label: "6ヶ月〜2年" },
      { value: "over_two_years", label: "2年以上" },
    ],
  },
  {
    key: "training_load_management",
    title: "トレーニングの重量・強度はどう決めていますか?",
    options: [
      { value: "unknown", label: "わからない" },
      { value: "intuitive", label: "感覚で決めている" },
      { value: "previous_record", label: "前回の記録を参考にする" },
      { value: "rpe_rir", label: "RPE / RIR で管理している" },
    ],
  },
  {
    key: "pfc_knowledge",
    title: "PFC(タンパク質・脂質・炭水化物)の知識は?",
    options: [
      { value: "none", label: "知らない" },
      { value: "heard", label: "聞いたことがある" },
      { value: "understands", label: "だいたい理解している" },
      { value: "can_manage", label: "自分で管理できる" },
    ],
  },
  {
    key: "food_logging_experience",
    title: "食事記録の経験はどれくらいですか?",
    options: [
      { value: "none", label: "経験なし" },
      { value: "few_days", label: "数日だけ" },
      { value: "under_one_month", label: "1ヶ月未満" },
      { value: "over_one_month", label: "1ヶ月以上" },
    ],
  },
];

export default function OnboardingExperience() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<StepKey, string>>>({});
  const [busy, setBusy] = useState(false);

  const step = STEPS[index];

  async function submit(final: Record<string, string>) {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "complete-experience-onboarding",
        { body: final }
      );
      if (error || data?.ok !== true) throw error ?? new Error("failed");
      navigate("/onboarding/purpose", { replace: true });
    } catch {
      toast.error("保存に失敗しました。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  function choose(value: string) {
    const next = { ...answers, [step.key]: value };
    setAnswers(next);
    if (index < STEPS.length - 1) {
      setIndex(index + 1);
    } else {
      void submit(next as Record<string, string>);
    }
  }

  return (
    <div className="flex min-h-full flex-col px-6 py-8">
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          {index > 0 && (
            <button
              type="button"
              onClick={() => setIndex(index - 1)}
              className="-ml-1 rounded-full p-1 text-muted-foreground active:scale-95"
              aria-label="前の質問へ戻る"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <span className="text-sm font-semibold text-muted-foreground">
            {index + 1}/{STEPS.length}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((index + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <h1 className="mb-8 text-2xl font-bold leading-snug">{step.title}</h1>

      <div className="flex flex-col gap-3">
        {step.options.map((option) => (
          <Button
            key={option.value}
            variant={answers[step.key] === option.value ? "default" : "outline"}
            disabled={busy}
            onClick={() => choose(option.value)}
            className="h-auto justify-start rounded-xl px-5 py-4 text-base active:scale-95"
          >
            {option.label}
          </Button>
        ))}
      </div>

      {busy && (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          保存しています…
        </div>
      )}
    </div>
  );
}
