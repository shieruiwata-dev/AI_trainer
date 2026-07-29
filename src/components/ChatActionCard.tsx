import {
  AlertTriangle,
  Check,
  Dumbbell,
  Lightbulb,
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

// ---------- payload 取り出しヘルパー ----------

type P = Record<string, unknown>;

const num = (v: unknown): number | null =>
  typeof v === "number" && !isNaN(v) ? v : null;
const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v : null;

const MEAL_TYPE_JA: Record<string, string> = {
  breakfast: "朝食",
  lunch: "昼食",
  dinner: "夕食",
  snack: "間食",
  unknown: "食事",
};

const FOCUS_AREA_JA: Record<string, string> = {
  shoulders: "肩",
  chest: "胸",
  back: "背中",
  legs: "脚",
  arms: "腕",
  core: "体幹",
  full_body: "全身",
};

function formatDateJa(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function iconFor(ui: UiType) {
  const cls = "h-[16px] w-[16px]";
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
    case "safety_notice":
    case "error":
      return <AlertTriangle className={cls} strokeWidth={1.8} />;
    default:
      return null;
  }
}

/**
 * ai-chat の ui_type に応じた確認カード。
 * デザイン仕様は docs/ai-spec.md の payload 構造に対応。
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
  // text は本文のみ、onboarding_question は質問文+候補チップで完結するためカード無し
  if (uiType === "text" || uiType === "onboarding_question") return null;

  const pendingId =
    (actionData?.pending_action_id as string | undefined) ?? undefined;
  const action = actionData?.action as
    | { type?: string; confidence?: number; payload?: P }
    | undefined;
  const payload = (action?.payload ?? {}) as P;
  const confidence = num(action?.confidence);
  const isAlert = uiType === "error" || uiType === "safety_notice";
  const showButtons = isConfirmationUi(uiType) && !!pendingId && !decision;
  const confirmLabel =
    uiType === "workout_plan" ? "このメニューで開始" : "この内容で記録";

  return (
    <div
      className={cn(
        "mt-3 overflow-hidden rounded-[18px] border bg-card",
        isAlert && "border-destructive/40 bg-destructive/5"
      )}
    >
      {/* ヘッダー: タイトル + 確信度バッジ */}
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b px-4 py-3",
          isAlert ? "border-destructive/15" : "border-[#f0f0f0]"
        )}
      >
        <span
          className={cn(
            "flex items-center gap-1.5 text-[13px] font-semibold",
            isAlert ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {iconFor(uiType)}
          {UI_TYPE_TITLE[uiType] ?? "確認"}
        </span>
        {uiType === "workout_plan" && num(payload.estimated_minutes) != null ? (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
            約{num(payload.estimated_minutes)}分
          </span>
        ) : (
          confidence != null &&
          !isAlert && (
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
              AI推定 {Math.round(confidence * 100)}%
            </span>
          )
        )}
      </div>

      {/* 本文 */}
      <div className="px-4 py-3.5">
        {uiType === "meal_confirmation" && <MealBody payload={payload} />}
        {uiType === "weight_confirmation" && <WeightBody payload={payload} />}
        {uiType === "workout_plan" && <WorkoutPlanBody payload={payload} />}
        {uiType === "workout_set" && <WorkoutSetBody payload={payload} />}
        {(uiType === "goal_confirmation" || uiType === "error") && (
          <GenericBody payload={payload} />
        )}
        {uiType === "safety_notice" && null}

        {safety?.note && (
          <p
            className={cn(
              "mt-2.5 rounded-[10px] px-3 py-2.5 text-[13px] leading-[1.5]",
              isAlert || safety.level === "urgent" || safety.level === "caution"
                ? "bg-destructive/10 text-destructive"
                : "bg-[#fafafc] text-muted-foreground"
            )}
          >
            {safety.note}
          </p>
        )}
      </div>

      {/* アクション */}
      {showButtons && (
        <div className="flex gap-2 px-4 pb-4">
          <button
            type="button"
            disabled={busy}
            onClick={onReject}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-primary text-[15px] text-primary transition-transform active:scale-[0.97] disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="flex h-11 flex-[1.4] items-center justify-center gap-1.5 rounded-full bg-primary text-[15px] font-medium text-primary-foreground transition-transform active:scale-[0.97] disabled:opacity-50"
          >
            <Check className="h-4 w-4" strokeWidth={2.4} />
            {confirmLabel}
          </button>
        </div>
      )}

      {decision === "confirm" && (
        <p className="mx-4 mb-4 inline-flex items-center gap-1 rounded-full bg-[#34c759]/15 px-3 py-1.5 text-[12px] font-medium text-[#248a3d]">
          <Check className="h-3 w-3" strokeWidth={2.5} />
          記録しました
        </p>
      )}
      {decision === "reject" && (
        <p className="mx-4 mb-4 inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-[12px] text-muted-foreground">
          <X className="h-3 w-3" strokeWidth={2.5} />
          キャンセルしました
        </p>
      )}
    </div>
  );
}

// ---------- ui_type 別ボディ ----------

/** 食事: 品目リスト → カロリー大 → PFCチップ → 推定メモ */
function MealBody({ payload }: { payload: P }) {
  const items = Array.isArray(payload.items) ? (payload.items as P[]) : [];
  const kcal = num(payload.calories);
  const mealType = MEAL_TYPE_JA[str(payload.meal_type) ?? ""] ?? null;

  return (
    <div>
      {items.length > 0 && (
        <ul className="space-y-1">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex items-baseline justify-between text-[15px]"
            >
              <span>{str(it.name) ?? "食品"}</span>
              <span className="text-[14px] text-muted-foreground [font-variant-numeric:tabular-nums]">
                {num(it.amount) ?? ""}
                {str(it.unit) ?? ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      {kcal != null && (
        <p className="mt-2 flex items-baseline gap-1.5">
          <span className="text-[34px] font-bold leading-none tracking-[-0.02em] [font-variant-numeric:tabular-nums]">
            {kcal}
          </span>
          <span className="text-[14px] text-muted-foreground">
            kcal{mealType && ` ・ ${mealType}`}
          </span>
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <MacroChip label="タンパク質" value={num(payload.protein_g)} />
        <MacroChip label="脂質" value={num(payload.fat_g)} />
        <MacroChip label="炭水化物" value={num(payload.carbs_g)} />
      </div>
      {str(payload.estimation_note) && (
        <p className="mt-3 flex items-start gap-1.5 rounded-[10px] bg-[#fafafc] px-3 py-2.5 text-[12px] leading-[1.5] text-muted-foreground">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
          {str(payload.estimation_note)}
        </p>
      )}
    </div>
  );
}

function MacroChip({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex-1 rounded-[11px] bg-secondary py-2 text-center">
      <p className="text-[16px] font-semibold leading-tight tracking-[-0.02em] [font-variant-numeric:tabular-nums]">
        {value ?? "—"}
        <span className="text-[11px] font-normal text-muted-foreground">g</span>
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

/** 体重: 数値大 + 日付 + 体脂肪率 */
function WeightBody({ payload }: { payload: P }) {
  const kg = num(payload.weight_kg);
  const fat = num(payload.body_fat_percent);
  const date = formatDateJa(str(payload.measured_at));
  return (
    <div>
      <p className="flex items-baseline gap-1.5">
        <span className="text-[34px] font-bold leading-none tracking-[-0.02em] [font-variant-numeric:tabular-nums]">
          {kg ?? "—"}
        </span>
        <span className="text-[14px] text-muted-foreground">
          kg{date && ` ・ ${date}`}
        </span>
      </p>
      {fat != null && (
        <p className="mt-2 text-[14px] text-muted-foreground [font-variant-numeric:tabular-nums]">
          体脂肪率 {fat}%
        </p>
      )}
      {str(payload.note) && (
        <p className="mt-2 text-[13px] text-muted-foreground">
          {str(payload.note)}
        </p>
      )}
    </div>
  );
}

/** 筋トレメニュー: サマリー + 種目リスト(セット×回数・休憩・コツ) */
function WorkoutPlanBody({ payload }: { payload: P }) {
  const exercises = Array.isArray(payload.exercises)
    ? (payload.exercises as P[])
    : [];
  const focus = FOCUS_AREA_JA[str(payload.focus_area) ?? ""] ??
    str(payload.focus_area);

  return (
    <div>
      <p className="mb-1 text-[13px] text-muted-foreground">
        {str(payload.title) && (
          <span className="mr-3 text-[15px] font-semibold text-foreground">
            {str(payload.title)}
          </span>
        )}
        {focus && (
          <>
            部位: <b className="text-foreground">{focus}</b>
          </>
        )}
        <span className="ml-3">
          種目: <b className="text-foreground">{exercises.length}</b>
        </span>
      </p>
      <ul>
        {exercises.map((ex, i) => (
          <li
            key={i}
            className={cn(
              "py-2.5",
              i < exercises.length - 1 && "border-b border-[#f0f0f0]"
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[16px] font-semibold tracking-[-0.02em]">
                <span className="mr-1.5 text-[13px] font-normal text-muted-foreground">
                  {num(ex.order) ?? i + 1}
                </span>
                {str(ex.exercise_name) ?? "種目"}
              </span>
              <span className="shrink-0 text-[15px] font-semibold text-primary [font-variant-numeric:tabular-nums]">
                {num(ex.target_sets) ?? "—"}セット × {num(ex.target_reps) ?? "—"}回
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-muted-foreground [font-variant-numeric:tabular-nums]">
              {num(ex.target_weight_kg) != null &&
                `${num(ex.target_weight_kg)}kg ・ `}
              {num(ex.rest_seconds) != null && `休憩 ${num(ex.rest_seconds)}秒`}
            </p>
            {Array.isArray(ex.coaching_cues) && ex.coaching_cues.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(ex.coaching_cues as string[]).map((cue) => (
                  <span
                    key={cue}
                    className="rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground"
                  >
                    {cue}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
      {str(payload.rationale) && (
        <p className="mt-2 flex items-start gap-1.5 rounded-[10px] bg-[#fafafc] px-3 py-2.5 text-[12px] leading-[1.5] text-muted-foreground">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
          {str(payload.rationale)}
        </p>
      )}
    </div>
  );
}

/** セット記録: 種目 + 重量×回数 */
function WorkoutSetBody({ payload }: { payload: P }) {
  return (
    <div>
      <p className="text-[15px] font-semibold tracking-[-0.02em]">
        {str(payload.exercise_name) ?? "種目"}
        {num(payload.set_number) != null && (
          <span className="ml-2 text-[13px] font-normal text-muted-foreground">
            セット{num(payload.set_number)}
          </span>
        )}
      </p>
      <p className="mt-1.5 flex items-baseline gap-1.5 [font-variant-numeric:tabular-nums]">
        <span className="text-[34px] font-bold leading-none tracking-[-0.02em]">
          {num(payload.weight_kg) ?? "—"}
        </span>
        <span className="text-[14px] text-muted-foreground">kg ×</span>
        <span className="text-[34px] font-bold leading-none tracking-[-0.02em]">
          {num(payload.reps) ?? "—"}
        </span>
        <span className="text-[14px] text-muted-foreground">回</span>
      </p>
      {num(payload.rpe) != null && (
        <p className="mt-2 text-[13px] text-muted-foreground">
          きつさ(RPE): {num(payload.rpe)}
        </p>
      )}
    </div>
  );
}

/** 目標・プロフィール確認など: ラベル付き行の汎用表示 */
function GenericBody({ payload }: { payload: P }) {
  const rows = payloadRows(payload);
  if (rows.length === 0) return null;
  return (
    <dl className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.key} className="flex items-baseline justify-between gap-3">
          <dt className="text-[13px] text-muted-foreground">{r.label}</dt>
          <dd className="text-[15px] font-semibold [font-variant-numeric:tabular-nums]">
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
