/**
 * 目標設計オンボーディングでユーザーが答えた項目をフロント側で保持する。
 * ai-chat 呼び出し時に goal_context.onboarding_state として Dify へ渡す。
 */

export interface OnboardingState {
  purpose_type?: "cut" | "bulk" | "maintain";
  current_weight_kg?: number;
  height_cm?: number;
  age?: number;
  sex?: "male" | "female";
  target_weight_kg?: number;
  target_date?: string;
  duration_months?: number;
  available_training_days?: number;
}

const STORAGE_KEY = "fitcoach.onboardingState.v1";

const NUMERIC_KEYS = new Set([
  "current_weight_kg",
  "height_cm",
  "age",
  "target_weight_kg",
  "duration_months",
  "available_training_days",
]);

export function loadOnboardingState(): OnboardingState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as OnboardingState) : {};
  } catch {
    return {};
  }
}

export function saveOnboardingState(state: OnboardingState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* noop */
  }
}

/** 未定義/空を除いてマージ(後勝ち) */
export function mergeOnboardingState(
  base: OnboardingState,
  patch: Partial<Record<string, unknown>> | null | undefined
): OnboardingState {
  if (!patch || typeof patch !== "object") return base;
  const next: OnboardingState = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === "") continue;
    if (!(key in EMPTY_SHAPE)) continue;
    if (NUMERIC_KEYS.has(key)) {
      const num = typeof value === "number" ? value : Number(String(value).replace(/[^\d.]/g, ""));
      if (Number.isFinite(num)) {
        (next as Record<string, unknown>)[key] = num;
      }
      continue;
    }
    (next as Record<string, unknown>)[key] = value;
  }
  return next;
}

const EMPTY_SHAPE: Record<keyof OnboardingState, true> = {
  purpose_type: true,
  current_weight_kg: true,
  height_cm: true,
  age: true,
  sex: true,
  target_weight_kg: true,
  target_date: true,
  duration_months: true,
  available_training_days: true,
};

/**
 * ユーザーの自由入力から拾える項目だけを抽出する。
 * 例: 「178cm 72kg」「23歳男性」「週3回」「3ヶ月で減量」「目標65kgまで」
 */
export function extractOnboardingFields(text: string): Partial<OnboardingState> {
  const out: Partial<OnboardingState> = {};
  const t = text.replace(/[０-９．]/g, (c) =>
    c === "．" ? "." : String.fromCharCode(c.charCodeAt(0) - 0xfee0)
  );

  const height = t.match(/(\d{2,3}(?:\.\d)?)\s*(?:cm|センチ|センチメートル)/i);
  if (height) out.height_cm = Number(height[1]);

  // 目標体重(「目標」「まで」「にしたい」などの近傍)
  const targetWeight = t.match(
    /(?:目標(?:体重)?|target)[^0-9]{0,6}(\d{2,3}(?:\.\d)?)\s*(?:kg|キロ)/i
  ) ?? t.match(/(\d{2,3}(?:\.\d)?)\s*(?:kg|キロ)\s*(?:まで|に(?:したい|する|なりたい))/i);
  if (targetWeight) out.target_weight_kg = Number(targetWeight[1]);

  // 現在体重(目標として拾ったものは除外)
  const weights = [...t.matchAll(/(\d{2,3}(?:\.\d)?)\s*(?:kg|キロ)/gi)].map((m) =>
    Number(m[1])
  );
  const current = weights.find((w) => w !== out.target_weight_kg);
  if (current !== undefined) out.current_weight_kg = current;

  const age = t.match(/(\d{1,2})\s*(?:歳|才|yo|years? old)/i);
  if (age) out.age = Number(age[1]);

  if (/(男性|男|メンズ|male)/i.test(t)) out.sex = "male";
  else if (/(女性|女|レディース|female)/i.test(t)) out.sex = "female";

  const days = t.match(/週\s*(\d)\s*(?:回|日)/);
  if (days) out.available_training_days = Number(days[1]);

  const months = t.match(/(\d{1,2})\s*(?:ヶ月|ヵ月|カ月|か月|ケ月|months?)/i);
  if (months) out.duration_months = Number(months[1]);

  const date = t.match(/(20\d{2})[-/年]\s*(\d{1,2})[-/月]\s*(\d{1,2})/);
  if (date) {
    const [, y, m, d] = date;
    out.target_date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  if (/(減量|ダイエット|痩せ|やせ|絞|cut)/i.test(t)) out.purpose_type = "cut";
  else if (/(増量|バルク|筋肥大|大きく|bulk)/i.test(t)) out.purpose_type = "bulk";
  else if (/(維持|キープ|maintain)/i.test(t)) out.purpose_type = "maintain";

  return out;
}
