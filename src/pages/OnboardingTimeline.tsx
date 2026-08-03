import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OnboardingShell from "@/components/OnboardingShell";
import { createTickHaptic } from "@/lib/haptics";
import {
  GOAL_STEP_INDEX,
  GOAL_STEP_TOTAL,
  setOnboardingStep,
} from "@/lib/onboardingStep";
import {
  loadOnboardingState,
  mergeOnboardingState,
  saveOnboardingState,
} from "@/lib/onboardingState";

/* ---- ペーススライダーの設定(数値はここでまとめて調整できる) ---- */
const PACE_MIN = 0.1;
const PACE_MAX = 1.0;
const PACE_STEP = 0.1;
const PACE_DEFAULT = 0.4;
/** この値以下=ゆっくり / この値以下=おすすめ / それ以上=速い */
const SLOW_MAX = 0.25;
const RECOMMENDED_MAX = 0.55;
/** 体脂肪1kg ≒ 7,700kcal → 1週間で1kgなら1日あたり1,100kcal */
const KCAL_PER_KG_PER_WEEK = 1100;

const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  very_high: 1.9,
};

/* ---- 速さのアイコン(歩く人 / 原付 / スーパーカー)。選択中だけ動く ---- */

interface IconProps {
  className?: string;
  active?: boolean;
}

function IconBase({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** 関節(viewBox座標)を回転の中心にするための style */
function jointStyle(x: number, y: number, delaySec = 0): React.CSSProperties {
  return {
    transformOrigin: `${x}px ${y}px`,
    transformBox: "view-box",
    animationDelay: `${delaySec}s`,
  };
}

/** 歩いている人(選択中: 前後の脚が入れ替わるまで振ってしっかりクロスさせる) */
function WalkerIcon({ className, active }: IconProps) {
  // 0%=描画済みポーズ → 50%=前後の手足が入れ替わった位置 → 100%=元に戻る。
  // 4本とも同じタイミングで振るので、25%と75%の瞬間に脚がクロスする
  return (
    <IconBase
      className={`${active ? "motion-safe:animate-pace-bob" : ""} ${className ?? ""}`}
    >
      <circle cx="13.4" cy="4" r="1.9" />
      <path d="M13.1 6.6 L12 13" />
      {/* 腕(肩=12.85,8.0 を軸に前後入れ替え) */}
      <path
        d="M12.85 8 L14.3 10.4 L14.9 12.7"
        className={active ? "motion-safe:animate-pace-arm-a" : ""}
        style={jointStyle(12.85, 8)}
      />
      <path
        d="M12.85 8 L11.3 10.3 L10.7 12.5"
        className={active ? "motion-safe:animate-pace-arm-b" : ""}
        style={jointStyle(12.85, 8)}
      />
      {/* 脚(股関節=12,13 を軸に前後入れ替え) */}
      <path
        d="M12 13 L14.5 16 L15.3 20.3"
        className={active ? "motion-safe:animate-pace-leg-a" : ""}
        style={jointStyle(12, 13)}
      />
      <path
        d="M12 13 L10 16.5 L7.6 19.6"
        className={active ? "motion-safe:animate-pace-leg-b" : ""}
        style={jointStyle(12, 13)}
      />
    </IconBase>
  );
}

/** 原付に乗っている人(選択中: エンジンの振動でカタカタ揺れる) */
function ScooterIcon({ className, active }: IconProps) {
  return (
    <IconBase
      className={`${active ? "motion-safe:animate-pace-putter" : ""} ${className ?? ""}`}
    >
      {/* 車体 */}
      <circle cx="4.6" cy="18.6" r="2" />
      <circle cx="19.2" cy="18.6" r="2" />
      <path d="M6.4 12.9 L10.6 12.9" />
      <path d="M6.9 12.9 C5.2 13.3 4.6 15 4.6 16.6" />
      <path d="M7.4 18.5 L12.9 18.5 L16.1 17.5" />
      <path d="M14.7 8.4 L19.2 16.6" />
      <path d="M13.4 8.9 L16 8" />
      {/* 乗っている人(背すじを伸ばして座る) */}
      <circle cx="9.6" cy="3.6" r="1.9" />
      <path d="M9.8 5.6 L9 12.6" />
      <path d="M9.7 7.3 L14.4 8.8" />
      <path d="M9 12.6 L11.7 14.8 L11.9 18.2" />
    </IconBase>
  );
}

/** スーパーカーに乗っている人(選択中: 車体が細かく震え、スピード線が流れる) */
function SupercarIcon({ className, active }: IconProps) {
  const line = active ? "motion-safe:animate-pace-speed-line" : "";
  return (
    <IconBase className={className}>
      {/* スピード線(車体とは別に流す) */}
      <path d="M1.4 8.3 h3" className={line} />
      <path d="M0.9 10.8 h2.2" className={line} style={{ animationDelay: "-0.35s" }} />
      {/* 車体まわり(震えは車体だけに掛ける) */}
      <g className={active ? "motion-safe:animate-pace-dash" : undefined}>
        <path d="M3.9 15.8 H3.3 C2.4 15.8 1.9 15.1 2.1 14.3 C2.3 13.5 2.9 13 3.7 12.8 L6.6 12.3 L9.6 10.2 C10.4 9.7 11.3 9.5 12.2 9.6 L14 9.8 C14.7 9.9 15.3 10.2 15.9 10.6 L17.6 12 L20.3 12.6 C21.2 12.8 21.9 13.6 21.8 14.5 C21.7 15.2 21.1 15.8 20.3 15.8 H19.6" />
        <path d="M8.9 15.8 H15.4" />
        <circle cx="6.6" cy="15.8" r="1.9" />
        <circle cx="17.6" cy="15.8" r="1.9" />
        {/* フロントガラスと乗っている人の頭 */}
        <path d="M10.6 12.6 L12.8 10.4" />
        <circle cx="11.3" cy="11.6" r="0.8" strokeWidth="1.3" />
      </g>
    </IconBase>
  );
}

const ZONES = [
  {
    id: "slow",
    label: "ゆっくり",
    pace: PACE_MIN,
    Icon: WalkerIcon,
    note: "無理なく続けやすい、余裕のあるペースです。",
  },
  {
    id: "recommended",
    label: "おすすめ",
    pace: PACE_DEFAULT,
    Icon: ScooterIcon,
    note: "バランスが良く、いちばん続けやすいおすすめのペースです。",
  },
  {
    id: "fast",
    label: "速い",
    pace: 0.8,
    Icon: SupercarIcon,
    note: "短期集中のペース。食事管理はかなりシビアになります。",
  },
] as const;

function zoneOf(pace: number) {
  if (pace <= SLOW_MAX) return ZONES[0];
  if (pace <= RECOMMENDED_MAX) return ZONES[1];
  return ZONES[2];
}

function roundPace(value: number) {
  const snapped = Math.round(value / PACE_STEP) * PACE_STEP;
  return Math.min(PACE_MAX, Math.max(PACE_MIN, Math.round(snapped * 100) / 100));
}

/** Step5: ペースを決めるとゴール時期と目安カロリーが変わる */
export default function OnboardingTimeline() {
  const navigate = useNavigate();
  const saved = loadOnboardingState();
  const [pace, setPace] = useState<number>(() =>
    saved.pace_kg_per_week ? roundPace(saved.pace_kg_per_week) : PACE_DEFAULT
  );
  const [targetWeight, setTargetWeight] = useState(
    saved.target_weight_kg?.toString() ?? ""
  );

  const hapticRef = useRef<ReturnType<typeof createTickHaptic> | null>(null);
  useEffect(() => {
    hapticRef.current = createTickHaptic();
    return () => hapticRef.current?.dispose();
  }, []);

  const gaining = saved.purpose_type === "bulk";
  const zone = zoneOf(pace);

  /* ゴールまでの見込み(現在体重と目標体重があるときだけ出せる) */
  const weeks = useMemo(() => {
    const current = saved.current_weight_kg;
    const target = Number(targetWeight);
    if (!current || !Number.isFinite(target) || target <= 0) return null;
    const diff = Math.abs(target - current);
    if (diff === 0) return null;
    return diff / pace;
  }, [saved.current_weight_kg, targetWeight, pace]);

  const durationText = useMemo(() => {
    if (weeks === null) return null;
    if (weeks < 1) return "1週間以内";
    if (weeks < 5) return `約${Math.round(weeks)}週間`;
    return `約${Math.max(2, Math.round(weeks / 4.345))}ヶ月`;
  }, [weeks]);

  /* 1日の目安カロリー(Mifflin-St Jeor + 活動係数 ± ペース分) */
  const dailyKcal = useMemo(() => {
    const { current_weight_kg: w, height_cm: h, age, sex } = saved;
    if (!w || !h || !age || !sex) return null;
    const bmr = 10 * w + 6.25 * h - 5 * age + (sex === "male" ? 5 : -161);
    const factor = ACTIVITY_FACTORS[saved.activity_level ?? ""] ?? 1.375;
    const tdee = bmr * factor;
    const daily = tdee + (gaining ? 1 : -1) * pace * KCAL_PER_KG_PER_WEEK;
    return Math.max(1000, Math.round(daily / 10) * 10);
  }, [saved, gaining, pace]);

  function changePace(next: number) {
    const v = roundPace(next);
    if (v === pace) return;
    hapticRef.current?.tick();
    setPace(v);
  }

  function next() {
    const durationMonths =
      weeks !== null ? Math.max(1, Math.round(weeks / 4.345)) : null;
    const merged = mergeOnboardingState(loadOnboardingState(), {
      pace_kg_per_week: pace,
      target_weight_kg: targetWeight,
      duration_months: durationMonths,
    });
    // 入力を消した/計算できないときは古い値を残さない(食い違った提案を防ぐ)
    if (!targetWeight.trim()) delete merged.target_weight_kg;
    if (durationMonths === null) delete merged.duration_months;
    saveOnboardingState(merged);
    void setOnboardingStep("goal_proposal");
    navigate("/onboarding/proposal", { replace: true });
  }

  const percent = ((pace - PACE_MIN) / (PACE_MAX - PACE_MIN)) * 100;

  return (
    <OnboardingShell
      step={GOAL_STEP_INDEX.target_period}
      total={GOAL_STEP_TOTAL}
      title="どのくらいのペースで進める?"
      description="ここで決めたペースをもとにAIが目標を提案します。"
      onBack={() => navigate("/onboarding/experience")}
    >
      <div className="flex flex-col gap-6">
        {/* 現在のペース */}
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            1週間で{gaining ? "増やす" : "減らす"}体重
          </p>
          <p className="mt-1 text-5xl font-bold tracking-tight">
            {pace.toFixed(1)}
            <span className="ml-1.5 text-2xl font-semibold">kg</span>
          </p>
        </div>

        {/* 速さアイコン + スライダー */}
        <div>
          <div className="mb-4 grid grid-cols-3">
            {ZONES.map(({ id, label, pace: jump, Icon }) => {
              const active = zone.id === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => changePace(jump)}
                  className={`flex flex-col items-center gap-1.5 transition-colors duration-300 active:scale-95 ${
                    active ? "text-primary" : "text-foreground"
                  }`}
                >
                  <Icon className="h-10 w-10" active={active} />
                  <span
                    className={`text-sm ${active ? "font-semibold" : "font-medium"}`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
          <input
            type="range"
            min={PACE_MIN}
            max={PACE_MAX}
            step={PACE_STEP}
            value={pace}
            onChange={(e) => changePace(Number(e.target.value))}
            aria-label={`1週間で${gaining ? "増やす" : "減らす"}体重`}
            className="h-8 w-full cursor-pointer appearance-none bg-transparent focus:outline-none
              [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full
              [&::-webkit-slider-thumb]:-mt-[13px] [&::-webkit-slider-thumb]:h-[30px] [&::-webkit-slider-thumb]:w-[30px]
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black/5
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:shadow-[0_3px_8px_rgba(0,0,0,0.18)]
              [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent
              [&::-moz-range-thumb]:h-[30px] [&::-moz-range-thumb]:w-[30px] [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-black/5 [&::-moz-range-thumb]:bg-white
              [&::-moz-range-thumb]:shadow-[0_3px_8px_rgba(0,0,0,0.18)]"
            style={{
              // トラック: 左=Action Blue / 右=ヘアライン
              // ※background(ショートハンド)だと更新時にbackgroundClipがリセットされ
              //   トラックが太いブロックになるので、backgroundImageを使うこと
              backgroundImage: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${percent}%, #e0e0e0 ${percent}%, #e0e0e0 100%)`,
              backgroundClip: "content-box",
              paddingTop: 14,
              paddingBottom: 14,
            }}
          />
        </div>

        {/* 目標体重(任意) */}
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            目標体重 (kg) ※任意・未入力ならAIが提案します
          </span>
          <Input
            inputMode="decimal"
            value={targetWeight}
            onChange={(e) => setTargetWeight(e.target.value)}
            placeholder="未入力でもOK"
          />
        </label>

        {/* 見込みカード */}
        <div className="rounded-[18px] bg-muted px-4 py-4">
          <p className="text-[15px] font-semibold leading-snug">
            {durationText ? (
              <>
                ゴールまで <span className="text-primary">{durationText}</span>{" "}
                の見込みです
              </>
            ) : (
              "このペースに合わせてAIが目標を提案します"
            )}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {zone.note}
          </p>
          {dailyKcal !== null && (
            <p className="mt-1.5 text-sm font-medium text-muted-foreground">
              1日の目安カロリー: {dailyKcal.toLocaleString()} kcal
            </p>
          )}
        </div>

        <Button
          onClick={next}
          className="h-12 rounded-xl text-base active:scale-95"
        >
          AIに目標を提案してもらう
        </Button>
      </div>
    </OnboardingShell>
  );
}
