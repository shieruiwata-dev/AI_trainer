import {
  AlertTriangle,
  Check,
  Dumbbell,
  HelpCircle,
  Scale,
  Target,
  Utensils,
  X,
} from "lucide-react";
import {
  UI_TYPE_TITLE,
  isConfirmationUi,
  payloadRows,
  type UiType,
} from "@/lib/aiChat";
import { cn } from "@/lib/utils";

function iconFor(ui: UiType) {
  const cls = "h-[18px] w-[18px]";
  switch (ui) {
    case "meal_confirmation":
      return <Utensils className={cls} strokeWidth={1.8} />;
    case "weight_confirmation":
      return <Scale className={cls} strokeWidth={1.8} />;
    case "workout_plan":
    case "workout_set":
      return <Dumbbell className={cls} strokeWidth={1.8} />;
    case "goal_confirmation":
      return <Target className={cls} strokeWidth={1.8} />;
    case "onboarding_question":
      return <HelpCircle className={cls} strokeWidth={1.8} />;
    case "safety_notice":
    case "error":
      return <AlertTriangle className={cls} strokeWidth={1.8} />;
    default:
      return null;
  }
}

/**
 * ai-chat の ui_type に応じたカード表示。
 * pending_action_id がある確認カードには「この内容で記録」ボタンを出す。
 */
export function ChatActionCard({
  uiType,
  actionData,
  safety,
  decision,
  busy = false,
  onConfirm,
  onReject,
}: {
  uiType: UiType;
  actionData?: Record<string, unknown> | null;
  safety?: { level?: string; note?: string };
  decision?: "confirm" | "reject";
  busy?: boolean;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const pendingId =
    (actionData?.pending_action_id as string | undefined) ?? undefined;
  const action = actionData?.action as
    | { type?: string; payload?: Record<string, unknown> }
    | undefined;
  const rows = payloadRows(action?.payload);
  const title = UI_TYPE_TITLE[uiType] ?? "確認";
  const isAlert = uiType === "error" || uiType === "safety_notice";
  const showButtons = isConfirmationUi(uiType) && !!pendingId;

  if (uiType === "text") return null;

  return (
    <div
      className={cn(
        "mt-3 rounded-[16px] border bg-card p-4",
        isAlert && "border-destructive/30 bg-destructive/5"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 text-[13px] font-semibold",
          isAlert ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {iconFor(uiType)}
        {title}
      </div>

      {safety?.note && (
        <p className="mt-2 text-[13px] leading-[1.5] text-muted-foreground">
          {safety.note}
        </p>
      )}

      {rows.length > 0 && (
        <dl className="mt-3 space-y-1.5">
          {rows.map((r) => (
            <div key={r.key} className="flex items-baseline justify-between gap-3">
              <dt className="text-[13px] text-muted-foreground">{r.label}</dt>
              <dd className="text-[15px] font-semibold [font-variant-numeric:tabular-nums]">
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {showButtons && !decision && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-primary px-4 py-2.5 text-[15px] font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            <Check className="h-4 w-4" strokeWidth={2.4} />
            この内容で記録
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onReject}
            className="flex items-center justify-center gap-1.5 rounded-[12px] border px-4 py-2.5 text-[15px] text-muted-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
            キャンセル
          </button>
        </div>
      )}

      {decision === "confirm" && (
        <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#34c759]/15 px-3 py-1 text-[12px] font-medium text-[#248a3d]">
          <Check className="h-3 w-3" strokeWidth={2.5} />
          記録しました
        </p>
      )}
      {decision === "reject" && (
        <p className="mt-3 text-[12px] text-muted-foreground">
          キャンセルしました
        </p>
      )}
    </div>
  );
}
