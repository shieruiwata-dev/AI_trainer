import {
  AlertTriangle,
  Check,
  Dumbbell,
  HelpCircle,
  Pencil,
  Scale,
  Target,
  Utensils,
  X,
} from "lucide-react";
import {
  UI_TYPE_TITLE,
  getPayload,
  isConfirmationUi,
  labelFor,
  formatValue,
  formatJapaneseDateTime,
  payloadRows,
  pickArray,
  pickNumber,
  pickString,
  pickStringList,
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

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="text-[15px] font-semibold [font-variant-numeric:tabular-nums]">
        {value}
      </dd>
    </div>
  );
}

function MacroBar({
  protein,
  fat,
  carbs,
}: {
  protein?: number;
  fat?: number;
  carbs?: number;
}) {
  if (protein === undefined && fat === undefined && carbs === undefined)
    return null;
  const cell = (label: string, v?: number) => (
    <div className="flex-1 rounded-[12px] bg-muted/40 px-2 py-2 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-[15px] font-semibold [font-variant-numeric:tabular-nums]">
        {v === undefined ? "-" : `${v}g`}
      </p>
    </div>
  );
  return (
    <div className="mt-3 flex gap-2">
      {cell("P", protein)}
      {cell("F", fat)}
      {cell("C", carbs)}
    </div>
  );
}

/** ---- ui_type 別の本文 ---- */

function MealBody({ p }: { p: Record<string, unknown> }) {
  const items = pickArray(p, "items", "foods", "food_items");
  const rows =
    items.length > 0
      ? items.map((it, i) => ({
          key: String(i),
          name:
            pickString(it, "name", "food_name", "food", "title") ?? "食品",
          amount:
            pickString(it, "amount", "quantity", "portion") ??
            (pickNumber(it, "amount_g", "grams") !== undefined
              ? `${pickNumber(it, "amount_g", "grams")}g`
              : ""),
          kcal: pickNumber(it, "calories", "kcal"),
        }))
      : [];

  const mealType = pickString(p, "meal_type");
  const calories = pickNumber(p, "calories", "kcal", "total_calories");
  const note = pickString(p, "note", "notes", "memo", "estimation_note");

  return (
    <>
      {mealType && (
        <p className="mt-2 text-[13px] text-muted-foreground">
          {formatValue("meal_type", mealType)}
        </p>
      )}

      {rows.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {rows.map((r) => (
            <li
              key={r.key}
              className="flex items-baseline justify-between gap-3"
            >
              <span className="text-[15px]">
                {r.name}
                {r.amount ? ` ${r.amount}` : ""}
              </span>
              {r.kcal !== undefined && (
                <span className="text-[13px] text-muted-foreground [font-variant-numeric:tabular-nums]">
                  {r.kcal}kcal
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <dl className="mt-3 space-y-1.5">
          {payloadRows(p, [
            "meal_type",
            "calories",
            "kcal",
            "protein_g",
            "fat_g",
            "carbs_g",
            "note",
            "notes",
            "memo",
          ]).map((r) => (
            <Row key={r.key} label={r.label} value={r.value} />
          ))}
        </dl>
      )}

      {calories !== undefined && (
        <p className="mt-3 text-[28px] font-black leading-none [font-variant-numeric:tabular-nums]">
          {calories}
          <span className="ml-1 text-[13px] font-semibold text-muted-foreground">
            kcal
          </span>
        </p>
      )}

      <MacroBar
        protein={pickNumber(p, "protein_g", "protein")}
        fat={pickNumber(p, "fat_g", "fat")}
        carbs={pickNumber(p, "carbs_g", "carbs")}
      />

      {note && (
        <p className="mt-3 text-[13px] leading-[1.5] text-muted-foreground">
          {note}
        </p>
      )}
    </>
  );
}

function WeightBody({ p }: { p: Record<string, unknown> }) {
  const date = pickString(p, "date", "measured_at", "measured_on");
  const weight = pickNumber(p, "weight_kg", "weight");
  const fat = pickNumber(p, "body_fat_percentage", "body_fat", "fat_percent");
  const note = pickString(p, "note", "notes", "memo");
  return (
    <dl className="mt-3 space-y-1.5">
      <Row label="測定日" value={date ?? ""} />
      <Row label="体重" value={weight !== undefined ? `${weight}kg` : ""} />
      <Row label="体脂肪率" value={fat !== undefined ? `${fat}%` : ""} />
      <Row label="メモ" value={note ?? ""} />
    </dl>
  );
}

function WorkoutPlanBody({ p }: { p: Record<string, unknown> }) {
  const name = pickString(p, "name", "plan_name", "title", "menu_name");
  const part = pickString(p, "body_part", "target", "muscle_group", "part");
  const minutes = pickNumber(p, "estimated_minutes", "duration_min", "minutes");
  const exercises = pickArray(p, "exercises", "items", "menu");
  const cues = pickStringList(p, "coaching_cues", "cues", "tips");

  return (
    <>
      {name && <p className="mt-2 text-[17px] font-bold">{name}</p>}
      <div className="mt-1 flex flex-wrap gap-2 text-[13px] text-muted-foreground">
        {part && <span>{part}</span>}
        {minutes !== undefined && <span>目安 {minutes}分</span>}
      </div>

      {exercises.length > 0 && (
        <ul className="mt-3 space-y-2">
          {exercises.map((ex, i) => {
            const exName =
              pickString(ex, "name", "exercise", "exercise_name") ?? "種目";
            const sets = pickNumber(ex, "sets", "set_count");
            const reps = pickString(ex, "reps", "rep_range", "repetitions");
            const rest = pickNumber(ex, "rest_sec", "rest_seconds", "rest");
            const detail = [
              sets !== undefined ? `${sets}セット` : "",
              reps ? `${reps}回` : "",
              rest !== undefined ? `休憩${rest}秒` : "",
            ]
              .filter(Boolean)
              .join(" / ");
            return (
              <li key={i} className="rounded-[12px] bg-muted/40 px-3 py-2">
                <p className="text-[15px] font-semibold">{exName}</p>
                {detail && (
                  <p className="mt-0.5 text-[13px] text-muted-foreground [font-variant-numeric:tabular-nums]">
                    {detail}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {cues.length > 0 && (
        <ul className="mt-3 space-y-1">
          {cues.map((c, i) => (
            <li
              key={i}
              className="flex gap-2 text-[13px] leading-[1.5] text-muted-foreground"
            >
              <span className="text-primary">・</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function WorkoutSetBody({ p }: { p: Record<string, unknown> }) {
  const name = pickString(p, "exercise", "exercise_name", "name");
  const weight = pickNumber(p, "weight_kg", "weight");
  const reps = pickNumber(p, "reps", "repetitions");
  const setNo = pickNumber(p, "set_number", "set", "set_index");
  const rpe = pickNumber(p, "rpe");
  return (
    <dl className="mt-3 space-y-1.5">
      <Row label="種目" value={name ?? ""} />
      <Row label="重量" value={weight !== undefined ? `${weight}kg` : ""} />
      <Row label="回数" value={reps !== undefined ? `${reps}回` : ""} />
      <Row
        label="セット番号"
        value={setNo !== undefined ? `${setNo}セット目` : ""}
      />
      <Row label="RPE" value={rpe !== undefined ? String(rpe) : ""} />
    </dl>
  );
}

function GoalBody({ p }: { p: Record<string, unknown> }) {
  const goalType = pickString(p, "goal_type", "goal");
  const targetWeight = pickNumber(p, "target_weight_kg", "target_weight");
  const deadline = pickString(p, "deadline", "target_date", "due_date");
  const kcal = pickNumber(p, "target_calories", "calories");
  return (
    <>
      <dl className="mt-3 space-y-1.5">
        <Row
          label={labelFor("goal_type")}
          value={goalType ? formatValue("goal_type", goalType) : ""}
        />
        <Row
          label="目標体重"
          value={targetWeight !== undefined ? `${targetWeight}kg` : ""}
        />
        <Row label="期限" value={deadline ?? ""} />
        <Row
          label="目標カロリー"
          value={kcal !== undefined ? `${kcal}kcal` : ""}
        />
      </dl>
      <MacroBar
        protein={pickNumber(p, "target_protein_g", "protein_g")}
        fat={pickNumber(p, "target_fat_g", "fat_g")}
        carbs={pickNumber(p, "target_carbs_g", "carbs_g")}
      />
    </>
  );
}

/**
 * ai-chat の ui_type に応じたカード表示。
 * 生JSON・内部フィールドは一切表示しない(必要なら console.log のみ)。
 */
export function ChatActionCard({
  uiType,
  actionData,
  safety,
  decision,
  busy = false,
  onConfirm,
  onReject,
  onEdit,
}: {
  uiType: UiType;
  actionData?: Record<string, unknown> | null;
  safety?: { level?: string; note?: string };
  decision?: "confirm" | "reject";
  busy?: boolean;
  onConfirm: () => void;
  onReject: () => void;
  onEdit?: () => void;
}) {
  const pendingId =
    (actionData?.pending_action_id as string | undefined) ?? undefined;
  const payload = getPayload(actionData);
  const title = UI_TYPE_TITLE[uiType] ?? "確認";
  const isAlert = uiType === "error" || uiType === "safety_notice";
  const showButtons = isConfirmationUi(uiType) && !!pendingId && !decision;

  // text / onboarding_question は吹き出し + suggestions のみ(カードなし)
  if (uiType === "text" || uiType === "onboarding_question") return null;

  // error は message のみ(Chat 側の吹き出し)。補足カードは出さない
  if (uiType === "error") return null;

  if (uiType === "safety_notice") {
    if (!safety?.note) return null;
    return (
      <div className="mt-3 rounded-[16px] border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-destructive">
          {iconFor(uiType)}
          {title}
        </div>
        <p className="mt-2 text-[13px] leading-[1.5] text-muted-foreground">
          {safety.note}
        </p>
      </div>
    );
  }

  const confirmLabel =
    uiType === "workout_plan"
      ? "このメニューで開始"
      : uiType === "goal_confirmation"
        ? "この目標で設定"
        : "この内容で記録";
  const editLabel = uiType === "workout_plan" ? "変更" : "修正";

  return (
    <div className={cn("mt-3 rounded-[16px] border bg-card p-4", isAlert && "border-destructive/30")}>
      <div className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground">
        {iconFor(uiType)}
        {title}
      </div>

      {uiType === "meal_confirmation" && <MealBody p={payload} />}
      {uiType === "weight_confirmation" && <WeightBody p={payload} />}
      {uiType === "workout_plan" && <WorkoutPlanBody p={payload} />}
      {uiType === "workout_set" && <WorkoutSetBody p={payload} />}
      {uiType === "goal_confirmation" && <GoalBody p={payload} />}

      {safety?.note && (
        <p className="mt-3 text-[13px] leading-[1.5] text-muted-foreground">
          {safety.note}
        </p>
      )}

      {showButtons && (
        <div className="mt-4 space-y-2">
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="flex w-full items-center justify-center gap-1.5 rounded-[12px] bg-primary px-4 py-2.5 text-[15px] font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            <Check className="h-4 w-4" strokeWidth={2.4} />
            {confirmLabel}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onEdit}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] border px-4 py-2.5 text-[15px] text-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              <Pencil className="h-4 w-4" strokeWidth={2} />
              {editLabel}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onReject}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] border px-4 py-2.5 text-[15px] text-muted-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              <X className="h-4 w-4" strokeWidth={2.2} />
              キャンセル
            </button>
          </div>
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
