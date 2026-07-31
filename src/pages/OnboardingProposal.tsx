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
import {
  LearningContentCard,
  type OnboardingContent,
} from "@/components/LearningContentCard";
import { VideoPlayerDialog } from "@/components/VideoPlayerDialog";
import { supabase } from "@/integrations/supabase/client";
import { confirmGoal, sendAiChat } from "@/lib/aiChat";
import {
  GOAL_STEP_INDEX,
  GOAL_STEP_TOTAL,
  completeOnboarding,
  fetchExperienceProfile,
  isExperienceAssessed,
  setOnboardingStep,
  type ExperienceProfile,
} from "@/lib/onboardingStep";
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

/** Step6〜9: AIの目標提案とユーザー承認。承認するまで目標は保存しない */
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
  const [trainingLevel, setTrainingLevel] = useState<string | null>(null);
  const [contents, setContents] = useState<OnboardingContent[]>([]);
  const [contentProgress, setContentProgress] = useState<
    Record<string, string>
  >({});
  const [playing, setPlaying] = useState<OnboardingContent | null>(null);
  const [experience, setExperience] = useState<ExperienceProfile | null>(null);
  const requested = useRef(false);

  const needsWeightConfirm = weightCandidates.length > 1;

  async function request(extra?: string, profile?: ExperienceProfile) {
    const exp = profile ?? experience;
    // 経験ヒアリング未完了なら目標案生成APIを呼ばない
    if (!isExperienceAssessed(exp)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const state = loadOnboardingState();
      const res = await sendAiChat({
        experienceProfile: {
          training_level: exp!.training_level,
          nutrition_level: exp!.nutrition_level,
          training_experience_months: exp!.training_experience_months,
          training_load_management: exp!.training_load_management,
          pfc_knowledge: exp!.pfc_knowledge,
          food_logging_experience: exp!.food_logging_experience,
        },
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
    void (async () => {
      const exp = await fetchExperienceProfile();
      setExperience(exp);
      if (!isExperienceAssessed(exp)) {
        await setOnboardingStep("experience");
        navigate("/onboarding/experience", { replace: true });
        return;
      }
      setNutritionLevel(exp?.nutrition_level ?? null);
      setTrainingLevel(exp?.training_level ?? null);
      void request(undefined, exp!);
    })();
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const [profileRes, measureRes, goalRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("nutrition_level, training_level, current_weight_kg")
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

      const nLevel = (profileRes.data?.nutrition_level as string | null) ?? null;
      const tLevel = (profileRes.data?.training_level as string | null) ?? null;
      void loadContents(auth.user.id, nLevel, tLevel);
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

  async function loadContents(
    userId: string,
    nLevel: string | null,
    tLevel: string | null
  ) {
    const wanted: { target_type: string; target_level: string }[] = [];
    if (nLevel && nLevel !== "advanced")
      wanted.push({ target_type: "nutrition", target_level: nLevel });
    if (tLevel && tLevel !== "advanced")
      wanted.push({ target_type: "training", target_level: tLevel });
    if (wanted.length === 0) return;

    const { data, error } = await supabase
      .from("onboarding_contents")
      .select(
        "id, title, description, video_url, thumbnail_url, duration_seconds, status, target_type, target_level"
      )
      .in("status", ["published", "coming_soon"])
      .in(
        "target_type",
        wanted.map((w) => w.target_type)
      )
      .order("sort_order", { ascending: true });
    if (error || !data) return;

    const filtered = data.filter((row) =>
      wanted.some(
        (w) =>
          w.target_type === row.target_type && w.target_level === row.target_level
      )
    ) as OnboardingContent[];
    setContents(filtered);

    if (filtered.length > 0) {
      const { data: prog } = await supabase
        .from("user_content_progress")
        .select("content_id, status")
        .eq("user_id", userId)
        .in(
          "content_id",
          filtered.map((c) => c.id)
        );
      if (prog) {
        setContentProgress(
          Object.fromEntries(prog.map((p) => [p.content_id, p.status]))
        );
      }
    }
  }

  async function saveProgress(
    content: OnboardingContent,
    status: "skipped" | "completed"
  ) {
    setContentProgress((prev) => ({ ...prev, [content.id]: status }));
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await supabase.from("user_content_progress").upsert(
      {
        user_id: auth.user.id,
        content_id: content.id,
        status,
        skipped_at: status === "skipped" ? new Date().toISOString() : null,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,content_id" }
    );
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
      await completeOnboarding();
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
      step={GOAL_STEP_INDEX.goal_proposal}
      total={GOAL_STEP_TOTAL}
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
            footerSlot={
              <>
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
                <MacroExplainerCard
                  level={nutritionLevel}
                  proteinG={kpiNum(proposal, "protein_g")}
                  fatG={kpiNum(proposal, "fat_g")}
                  carbsG={kpiNum(proposal, "carbs_g")}
                />
                <LearningContentCard
                  heading={
                    nutritionLevel === "beginner"
                      ? "はじめる前に3分で確認"
                      : "食事管理のポイント"
                  }
                  description="カロリーとPFCの基本を短い動画で確認できます。"
                  level={nutritionLevel}
                  contents={contents.filter(
                    (c) => c.target_type === "nutrition"
                  )}
                  progress={contentProgress}
                  onWatch={(c) => setPlaying(c)}
                  onSkip={(c) => void saveProgress(c, "skipped")}
                />
                <LearningContentCard
                  heading={
                    trainingLevel === "beginner"
                      ? "筋トレの基礎を確認"
                      : "トレーニングのポイント"
                  }
                  description="フォームと負荷設定の基本を短い動画で確認できます。"
                  level={trainingLevel}
                  contents={contents.filter((c) => c.target_type === "training")}
                  progress={contentProgress}
                  onWatch={(c) => setPlaying(c)}
                  onSkip={(c) => void saveProgress(c, "skipped")}
                />
              </>
            }
          />
          <VideoPlayerDialog
            content={playing}
            onClose={() => setPlaying(null)}
            onEnded={(c) => void saveProgress(c, "completed")}
          />
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
