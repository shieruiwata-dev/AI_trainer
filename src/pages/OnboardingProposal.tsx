import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import OnboardingShell from "@/components/OnboardingShell";
import { GoalProposalCard } from "@/components/GoalProposalCard";
import { confirmGoal, sendAiChat } from "@/lib/aiChat";
import { setOnboardingStep } from "@/lib/onboardingStep";
import {
  loadOnboardingState,
  mergeOnboardingState,
  saveOnboardingState,
  toOnboardingContext,
} from "@/lib/onboardingState";
import { resetStore } from "@/lib/store";

/** Step5/6: AIの目標提案とユーザー承認。承認するまで目標は保存しない */
export default function OnboardingProposal() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState("");
  const requested = useRef(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function approve() {
    if (!proposal) return;
    setBusy(true);
    try {
      await confirmGoal(proposal);
      await setOnboardingStep("done");
      resetStore();
      toast.success("目標を保存しました。今日からこの方針で進めましょう。");
      navigate("/goal", { replace: true });
    } catch {
      toast.error("目標の保存に失敗しました。もう一度お試しください。");
    } finally {
      setBusy(false);
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
        <GoalProposalCard
          proposal={proposal}
          busy={busy}
          onStart={() => void approve()}
          onAdjust={(msg) => void request(msg)}
        />
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
