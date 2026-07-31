import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import OnboardingShell from "@/components/OnboardingShell";
import { GoalProposalCard } from "@/components/GoalProposalCard";
import { MacroExplainerCard } from "@/components/MacroExplainerCard";
import {
  WeightConfirmCard,
  type WeightCandidate,
} from "@/components/WeightConfirmCard";
import { GoalSwitchDialog } from "@/components/GoalSwitchDialog";
import { supabase } from "@/integrations/supabase/client";
import { confirmGoal, sendAiChat } from "@/lib/aiChat";
import { setOnboardingStep } from "@/lib/onboardingStep";
import {
  loadOnboardingState,
  mergeOnboardingState,
  saveOnboardingState,
  toOnboardingContext,
} from "@/lib/onboardingState";
import { resetStore } from "@/lib/store";

function kpiNum(proposal: Record<string, unknown>, key: string): number | null {
  const kpis = proposal.kpis;
  const raw =
    kpis && typeof kpis === "object"
      ? (kpis as Record<string, unknown>)[key]
      : undefined;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() && !Number.isNaN(Number(raw)))
    return Number(raw);
  return null;
}

/** Step5/6: AIの目標提案とユーザー承認。承認するまで目標は保存しない */
export default function OnboardingProposal() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState("");
  const [nutritionLevel, setNutritionLevel] = useState<string | null>(null);
  const [weightCandidates, setWeightCandidates] = useState<WeightCandidate[]>([]);
  const [confirmedWeight, setConfirmedWeight] = useState<number | null>(null);
  const [activeGoal, setActiveGoal] = useState<{
    purpose: string | null;
    title: string | null;
  } | null>(null);
  const [switchOpen, setSwitchOpen] = useState(false);
  const requested = useRef(false);

  const needsWeightConfirm = weightCandidates.length > 1;

  async function request(extra?: string) {
    setLoading(true);
    try {
      const state = loadOnboardingState();
      const res = await sendAiChat({
        message:
          extra ??
          "ヒアリング内容をもとに、目標プランを提案してください。目標体重・期日・カロリー・PFCを含めてください。",
        onboardingState: toOnboardingContext(state),
      });
      if (res.collected_fields) {
        saveOnboardingState(mergeOnboardingState(state, res.collected_fields));
      }
      setProposal(res.proposal ?? null);
      setMessage(res.message ?? "");
    } catch {
      setProposal(null);
      setMessage("目標の提案に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    void request();
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const [profileRes, measureRes, goalRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("nutrition_level, current_weight_kg")
          .eq("user_id", auth.user.id)
          .maybeSingle(),
        supabase
          .from("body_measurements")
          .select("weight_kg, measured_at")
          .eq("user_id", auth.user.id)
          .not("weight_kg", "is", null)
          .order("measured_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("goals")
          .select("purpose_type, goal_type, title")
          .eq("user_id", auth.user.id)
          .eq("is_active", true)
          .maybeSingle(),
      ]);

      setNutritionLevel(
        (profileRes.data?.nutrition_level as string | null) ?? null
      );
      if (goalRes.data) {
        setActiveGoal({
          purpose:
            (goalRes.data.purpose_type as string | null) ??
            (goalRes.data.goal_type as string | null) ??
            null,
          title: (goalRes.data.title as string | null) ?? null,
        });
      }

      const state = loadOnboardingState();
      const raw: WeightCandidate[] = [];
      const push = (id: string, label: string, note: string, v: unknown) => {
        const n = typeof v === "number" ? v : Number(v);
        if (!Number.isFinite(n) || n <= 0) return;
        if (raw.some((c) => Math.abs(c.weightKg - n) < 0.35)) return;
        raw.push({ id, label, note, weightKg: Math.round(n * 10) / 10 });
      };
      push(
        "input",
        "今回入力した体重",
        "オンボーディングで入力した値",
        state.current_weight_kg
      );
      push(
        "measurement",
        "直近の体重記録",
        measureRes.data?.measured_at
          ? new Date(measureRes.data.measured_at as string).toLocaleDateString(
              "ja-JP"
            )
          : "記録された測定値",
        measureRes.data?.weight_kg
      );
      push(
        "profile",
        "プロフィールの体重",
        "登録済みの現在体重",
        profileRes.data?.current_weight_kg
      );
      if (raw.length > 1) setWeightCandidates(raw);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStart() {
    if (!proposal) return;
    if (needsWeightConfirm && confirmedWeight == null) return;
    const nextPurpose =
      typeof proposal.purpose_type === "string" ? proposal.purpose_type : null;
    if (activeGoal && nextPurpose && activeGoal.purpose !== nextPurpose) {
      setSwitchOpen(true);
      return;
    }
    void approve();
  }

  async function approve() {
    if (!proposal) return;
    setBusy(true);
    try {
      const payload =
        confirmedWeight != null
          ? { ...proposal, current_weight_kg: confirmedWeight }
          : proposal;
      await confirmGoal(payload);
      await setOnboardingStep("done");
      resetStore();
      toast.success("目標を保存しました。今日からこの方針で進めましょう。");
      navigate("/goal", { replace: true });
    } catch {
      toast.error("目標の保存に失敗しました。もう一度お試しください。");
    } finally {
      setBusy(false);
      setSwitchOpen(false);
    }
  }

  return (
    <OnboardingShell
      step={4}
      total={4}
      title="AIからの目標プラン"
      description="内容を確認して、納得できたら開始してください。"
      onBack={() => navigate("/onboarding/timeline")}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          目標を作成しています…
        </div>
      ) : proposal ? (
        <>
          <GoalProposalCard
            proposal={proposal}
            busy={busy}
            startDisabled={needsWeightConfirm && confirmedWeight == null}
            onStart={handleStart}
            onAdjust={(msg) => void request(msg)}
          />
          {needsWeightConfirm && (
            <WeightConfirmCard
              candidates={weightCandidates}
              value={confirmedWeight}
              onConfirm={(w) => {
                setConfirmedWeight(w);
                const state = loadOnboardingState();
                saveOnboardingState(
                  mergeOnboardingState(state, { current_weight_kg: w })
                );
              }}
            />
          )}
          <GoalSwitchDialog
            open={switchOpen}
            busy={busy}
            currentGoalLabel={activeGoal?.title ?? activeGoal?.purpose ?? null}
            nextGoalLabel={
              typeof proposal.goal_title === "string"
                ? proposal.goal_title
                : null
            }
            onConfirm={() => void approve()}
            onCancel={() => setSwitchOpen(false)}
          />
          <MacroExplainerCard
            level={nutritionLevel}
            proteinG={kpiNum(proposal, "protein_g")}
            fatG={kpiNum(proposal, "fat_g")}
            carbsG={kpiNum(proposal, "carbs_g")}
          />
        </>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {message || "目標の提案を受け取れませんでした。"}
          </p>
          <Button
            onClick={() => void request()}
            className="h-12 w-full rounded-xl active:scale-95"
          >
            もう一度提案してもらう
          </Button>
        </div>
      )}
    </OnboardingShell>
  );
}
