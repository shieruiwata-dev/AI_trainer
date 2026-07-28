import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Loader2, TrendingUp, TrendingDown, Minus, Activity, Zap, Flame } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "初期設定 | 筋トレ専属トレーナーAI" },
      { name: "description", content: "2人のトレーナーに、あんたの体を教えてくれ。" },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: OnboardingPage,
});

type GoalType = "bulk" | "cut" | "maintain";
type ActivityLevel = "low" | "medium" | "high";

const GOALS: { value: GoalType; label: string; desc: string; icon: typeof TrendingUp }[] = [
  { value: "bulk", label: "増量する", desc: "デカくなる。筋肉を積み上げる。", icon: TrendingUp },
  { value: "cut", label: "減量する", desc: "絞る。余計な脂肪を削ぎ落とす。", icon: TrendingDown },
  { value: "maintain", label: "維持する", desc: "今の状態をキープする。", icon: Minus },
];

const ACTIVITIES: { value: ActivityLevel; label: string; desc: string; icon: typeof Activity }[] = [
  { value: "low", label: "低め", desc: "デスクワーク中心。運動はほとんどしない。", icon: Activity },
  { value: "medium", label: "普通", desc: "週2〜3回、体を動かす習慣がある。", icon: Zap },
  { value: "high", label: "高め", desc: "毎日のように動く。肉体労働かアスリート。", icon: Flame },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [height, setHeight] = useState("170");
  const [weight, setWeight] = useState("65");
  const [goal, setGoal] = useState<GoalType | null>(null);
  const [activity, setActivity] = useState<ActivityLevel | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 4;
  const progress = ((step + 1) / totalSteps) * 100;

  async function finish() {
    setError(null);
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("セッションが切れた。もう一度ログインしてくれ。");

      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: userData.user.id,
          height_cm: Number(height),
          weight_kg: Number(weight),
          goal_type: goal,
          activity_level: activity,
          onboarded: true,
        });
      if (error) throw error;
      navigate({ to: "/home" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗した。");
    } finally {
      setSaving(false);
    }
  }

  const canProceed =
    (step === 0 && Number(height) > 0) ||
    (step === 1 && Number(weight) > 0) ||
    (step === 2 && goal !== null) ||
    (step === 3 && activity !== null);

  function next() {
    if (step < totalSteps - 1) setStep(step + 1);
    else finish();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Progress */}
      <div className="px-6 pt-8">
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span>ステップ {step + 1} / {totalSteps}</span>
            <button
              onClick={() => step > 0 && setStep(step - 1)}
              disabled={step === 0}
              className="text-primary disabled:opacity-30"
            >
              ← 戻る
            </button>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-card">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col px-6 pt-10 pb-6">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
          {step === 0 && (
            <NumberStep
              title="身長を教えてくれ。"
              subtitle="サクラ:「正確な数字が、正確なプランを作るのよ。」"
              unit="cm"
              value={height}
              onChange={setHeight}
            />
          )}
          {step === 1 && (
            <NumberStep
              title="今の体重は?"
              subtitle="ゴウ:「これが起点だ。ここから変えていくぞ。」"
              unit="kg"
              value={weight}
              onChange={setWeight}
            />
          )}
          {step === 2 && (
            <CardStep
              title="目標はどれだ?"
              subtitle="ゴウ:「決めろ。決めた瞬間から始まる。」"
              options={GOALS}
              selected={goal}
              onSelect={setGoal}
            />
          )}
          {step === 3 && (
            <CardStep
              title="普段の活動量は?"
              subtitle="サクラ:「消費カロリーの計算に使わせてもらうわね。」"
              options={ACTIVITIES}
              selected={activity}
              onSelect={setActivity}
            />
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
              {error}
            </div>
          )}

          <div className="mt-auto pt-8">
            <button
              onClick={next}
              disabled={!canProceed || saving}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-black text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <>
                  {step === totalSteps - 1 ? "契約完了" : "次へ"}
                  <ArrowRight className="h-5 w-5" strokeWidth={3} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NumberStep({
  title, subtitle, unit, value, onChange,
}: { title: string; subtitle: string; unit: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <h1 className="text-3xl leading-tight">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{subtitle}</p>

      <div className="mt-12 flex items-end justify-center gap-3">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="num w-40 border-b-4 border-primary bg-transparent text-center text-7xl text-foreground outline-none"
        />
        <span className="pb-3 text-2xl font-bold text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function CardStep<T extends string>({
  title, subtitle, options, selected, onSelect,
}: {
  title: string;
  subtitle: string;
  options: { value: T; label: string; desc: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[];
  selected: T | null;
  onSelect: (v: T) => void;
}) {
  return (
    <div>
      <h1 className="text-3xl leading-tight">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{subtitle}</p>

      <div className="mt-8 flex flex-col gap-3">
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={`flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all active:scale-[0.98] ${
                active
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card"
              }`}
            >
              <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
                active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}>
                <Icon className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-black text-foreground">{opt.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{opt.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
