import { AlertTriangle, Check, Target } from "lucide-react";
import { cn } from "@/lib/utils";

type P = Record<string, unknown>;

const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return null;
};
const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;
const obj = (v: unknown): P =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as P) : {};

const PURPOSE_JA: Record<string, string> = {
  cut: "減量",
  diet: "減量",
  lose: "減量",
  fat_loss: "減量",
  bulk: "増量",
  gain: "増量",
  muscle_gain: "増量",
  maintain: "維持",
  recomp: "体組成改善",
  health: "健康維持",
};

const DIFFICULTY_JA: Record<string, string> = {
  easy: "やさしい",
  low: "やさしい",
  normal: "標準",
  moderate: "標準",
  medium: "標準",
  hard: "ハード",
  high: "ハード",
  aggressive: "攻めた設定",
};

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}年${map.month}月${map.day}日`;
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string;
}) {
  if (value == null) return null;
  return (
    <div className="flex-1 rounded-[11px] bg-secondary py-2 text-center">
      <p className="text-[16px] font-semibold leading-tight tracking-[-0.02em] [font-variant-numeric:tabular-nums]">
        {value}
        <span className="text-[11px] font-normal text-muted-foreground">
          {unit}
        </span>
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

/**
 * ui_type = goal_confirmation の目標提案カード。
 * proposal(goal_title / purpose_type / target_date / target_metrics / kpis / difficulty / warnings)を表示する。
 */
export function GoalProposalCard({
  proposal,
  decision,
  busy = false,
  onStart,
  onAdjust,
}: {
  proposal: P;
  decision?: "confirm" | "reject";
  busy?: boolean;
  onStart: () => void;
  onAdjust: (message: string) => void;
}) {
  const kpis = obj(proposal.kpis);
  const metrics = obj(proposal.target_metrics);
  const purposeRaw = str(proposal.purpose_type);
  const purpose = purposeRaw ? PURPOSE_JA[purposeRaw] ?? purposeRaw : null;
  const difficultyRaw = str(proposal.difficulty);
  const difficulty = difficultyRaw
    ? DIFFICULTY_JA[difficultyRaw] ?? difficultyRaw
    : null;
  const targetDate = formatDate(str(proposal.target_date));
  const bodyWeight = num(metrics.body_weight_kg);
  const warnings = Array.isArray(proposal.warnings)
    ? (proposal.warnings as unknown[])
        .map((w) => (typeof w === "string" ? w : ""))
        .filter(Boolean)
    : str(proposal.warnings)
      ? [str(proposal.warnings) as string]
      : [];

  const showButtons = !decision;

  return (
    <div className="mt-3 overflow-hidden rounded-[18px] border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-[#f0f0f0] px-4 py-3">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
          <Target className="h-[16px] w-[16px]" strokeWidth={1.8} />
          目標プラン
        </span>
        {difficulty && (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
            強度: {difficulty}
          </span>
        )}
      </div>

      <div className="px-4 py-3.5">
        {str(proposal.goal_title) && (
          <p className="text-[17px] font-semibold tracking-[-0.02em]">
            {str(proposal.goal_title)}
          </p>
        )}
        <p className="mt-1 text-[13px] text-muted-foreground">
          {purpose && (
            <>
              目的: <b className="text-foreground">{purpose}</b>
            </>
          )}
          {targetDate && (
            <span className={cn(purpose && "ml-3")}>
              期限: <b className="text-foreground">{targetDate}</b>
            </span>
          )}
        </p>

        {bodyWeight != null && (
          <p className="mt-3 flex items-baseline gap-1.5">
            <span className="text-[34px] font-bold leading-none tracking-[-0.02em] [font-variant-numeric:tabular-nums]">
              {bodyWeight}
            </span>
            <span className="text-[14px] text-muted-foreground">
              kg ・ 目標体重
            </span>
          </p>
        )}

        {num(kpis.daily_calories_kcal) != null && (
          <p className="mt-3 text-[15px]">
            1日の目安{" "}
            <b className="text-[18px] [font-variant-numeric:tabular-nums]">
              {num(kpis.daily_calories_kcal)}
            </b>
            <span className="text-[13px] text-muted-foreground"> kcal</span>
          </p>
        )}

        <div className="mt-2 flex gap-2">
          <Stat label="タンパク質" value={num(kpis.protein_g)} unit="g" />
          <Stat label="脂質" value={num(kpis.fat_g)} unit="g" />
          <Stat label="炭水化物" value={num(kpis.carbs_g)} unit="g" />
        </div>

        <div className="mt-2 flex gap-2">
          <Stat
            label="筋トレ / 週"
            value={num(kpis.strength_sessions_per_week)}
            unit="回"
          />
          <Stat
            label="有酸素 / 週"
            value={num(kpis.cardio_sessions_per_week)}
            unit="回"
          />
          <Stat
            label="体重測定 / 週"
            value={num(kpis.weigh_ins_per_week)}
            unit="回"
          />
        </div>

        {warnings.length > 0 && (
          <ul className="mt-3 space-y-1.5 rounded-[10px] bg-destructive/5 px-3 py-2.5">
            {warnings.map((w) => (
              <li
                key={w}
                className="flex items-start gap-1.5 text-[12px] leading-[1.5] text-destructive"
              >
                <AlertTriangle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  strokeWidth={1.8}
                />
                {w}
              </li>
            ))}
          </ul>
        )}
      </div>

      {showButtons && (
        <div className="px-4 pb-4">
          <button
            type="button"
            disabled={busy}
            onClick={onStart}
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-primary text-[15px] font-medium text-primary-foreground transition-transform active:scale-[0.97] disabled:opacity-50"
          >
            <Check className="h-4 w-4" strokeWidth={2.4} />
            この目標で始める
          </button>
          <div className="mt-2 flex flex-wrap gap-2">
            {["もっと攻めたい", "もう少しゆるくしたい", "期限を変える"].map(
              (label) => (
                <button
                  key={label}
                  type="button"
                  disabled={busy}
                  onClick={() => onAdjust(label)}
                  className="rounded-full border bg-card px-4 py-2 text-[13px] text-foreground transition-transform active:scale-[0.97] disabled:opacity-50"
                >
                  {label}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {decision === "confirm" && (
        <p className="mx-4 mb-4 inline-flex items-center gap-1 rounded-full bg-[#34c759]/15 px-3 py-1.5 text-[12px] font-medium text-[#248a3d]">
          <Check className="h-3 w-3" strokeWidth={2.5} />
          この目標で開始しました
        </p>
      )}
    </div>
  );
}
