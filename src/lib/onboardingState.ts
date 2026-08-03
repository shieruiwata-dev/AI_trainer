/**
 * 目標設計オンボーディングでユーザーが答えた項目をフロント側で保持する。
 * ai-chat 呼び出し時に goal_context.onboarding_state として Dify へ渡す。
 */

export interface OnboardingState {
  purpose_type?:
    | "cut"
    | "bulk"
    | "maintain"
    | "strength"
    | "health"
    | "undecided";
  current_weight_kg?: number;
  height_cm?: number;
  age?: number;
  sex?: "male" | "female";
  target_weight_kg?: number;
  target_date?: string;
  duration_months?: number;
  available_training_days?: number;
  activity_level?: string;
}

const STORAGE_KEY = "fitcoach.onboardingState.v1";

const ONBOARDING_KEYS = [
  "purpose_type",
  "current_weight_kg",
  "height_cm",
  "age",
  "sex",
  "target_weight_kg",
  "target_date",
  "duration_months",
  "available_training_days",
  "activity_level",
] as const;

const NUMERIC_KEYS = new Set([
  "current_weight_kg",
  "height_cm",
  "age",
  "target_weight_kg",
  "duration_months",
  "available_training_days",
]);

const KEY_ALIASES: Record<string, keyof OnboardingState> = {
  purpose: "purpose_type",
  goal_type: "purpose_type",
  goal: "purpose_type",
  objective: "purpose_type",
  current_weight: "current_weight_kg",
  currentWeightKg: "current_weight_kg",
  weight_kg: "current_weight_kg",
  weight: "current_weight_kg",
  body_weight_kg: "current_weight_kg",
  height: "height_cm",
  heightCm: "height_cm",
  target_weight: "target_weight_kg",
  targetWeightKg: "target_weight_kg",
  targetWeight: "target_weight_kg",
  target_date: "target_date",
  targetDate: "target_date",
  deadline: "target_date",
  duration: "duration_months",
  duration_month: "duration_months",
  durationMonths: "duration_months",
  period_months: "duration_months",
  training_days: "available_training_days",
  trainingDays: "available_training_days",
  weekly_training_days: "available_training_days",
  weeklyTrainingDays: "available_training_days",
  availableTrainingDays: "available_training_days",
};

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value
    .replace(/[０-９．]/g, (c) =>
      c === "．" ? "." : String.fromCharCode(c.charCodeAt(0) - 0xfee0)
    )
    .replace(/,/g, "");
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const num = Number(match[0]);
  return Number.isFinite(num) ? num : null;
}

function normalizePurpose(value: unknown): OnboardingState["purpose_type"] | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (["strength", "筋力"].includes(raw)) return "strength";
  if (["health", "healthy", "健康"].includes(raw)) return "health";
  if (["undecided", "unknown", "未定"].includes(raw)) return "undecided";
  if (["cut", "diet", "lose", "loss", "fat_loss", "減量", "ダイエット"].includes(raw)) return "cut";
  if (["bulk", "gain", "muscle_gain", "増量", "バルク", "筋肥大"].includes(raw)) return "bulk";
  if (["maintain", "maintenance", "keep", "維持", "キープ"].includes(raw)) return "maintain";
  if (/(減量|ダイエット|痩せ|やせ|絞|cut|lose|diet)/i.test(raw)) return "cut";
  if (/(増量|バルク|筋肥大|大きく|bulk|gain|muscle)/i.test(raw)) return "bulk";
  if (/(維持|キープ|maintain|keep)/i.test(raw)) return "maintain";
  return null;
}

function normalizeSex(value: unknown): OnboardingState["sex"] | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (["male", "man", "men", "m", "男性", "男"].includes(raw)) return "male";
  if (["female", "woman", "women", "f", "女性", "女"].includes(raw)) return "female";
  if (/(男性|男|male|man|men)/i.test(raw)) return "male";
  if (/(女性|女|female|woman|women)/i.test(raw)) return "female";
  return null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  const normalized = text.replace(/[０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0)
  );
  const match = normalized.match(/(20\d{2})[-/年]\s*(\d{1,2})[-/月]\s*(\d{1,2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^20\d{2}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  return null;
}

function normalizeKey(key: string): keyof OnboardingState | null {
  if (key in EMPTY_SHAPE) return key as keyof OnboardingState;
  return KEY_ALIASES[key] ?? null;
}

export function loadOnboardingState(): OnboardingState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? mergeOnboardingState({}, parsed as Record<string, unknown>)
      : {};
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
    const normalizedKey = normalizeKey(key);
    if (!normalizedKey) continue;
    if (NUMERIC_KEYS.has(normalizedKey)) {
      const num = normalizeNumber(value);
      if (num !== null && Number.isFinite(num)) {
        (next as Record<string, unknown>)[normalizedKey] = num;
      }
      continue;
    }
    if (normalizedKey === "purpose_type") {
      const purpose = normalizePurpose(value);
      if (purpose) next.purpose_type = purpose;
      continue;
    }
    if (normalizedKey === "sex") {
      const sex = normalizeSex(value);
      if (sex) next.sex = sex;
      continue;
    }
    if (normalizedKey === "target_date") {
      const date = normalizeDate(value);
      if (date) next.target_date = date;
      continue;
    }
  }
  return next;
}

export function isEmptyOnboardingState(state: OnboardingState): boolean {
  return ONBOARDING_KEYS.every((key) => state[key] === undefined || state[key] === null || state[key] === "");
}

/** Difyへ渡す前に余計なキー・空値を落とした onboarding_state にする */
export function toOnboardingContext(state: OnboardingState): Record<string, unknown> | null {
  const normalized = mergeOnboardingState({}, state as Record<string, unknown>);
  const entries = ONBOARDING_KEYS
    .map((key) => [key, normalized[key]] as const)
    .filter(([, value]) => value !== undefined && value !== null && value !== "");
  return entries.length > 0 ? Object.fromEntries(entries) : null;
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
  activity_level: true,
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

  if (/(男性|男|メンズ|male|\bman\b|\bmen\b)/i.test(t)) out.sex = "male";
  else if (/(女性|女|レディース|female|\bwoman\b|\bwomen\b)/i.test(t)) out.sex = "female";

  const days = t.match(/週\s*(\d)\s*(?:回|日)/) ?? t.match(/(?:トレーニング|筋トレ|運動)[^0-9]{0,8}(\d)\s*(?:回|日)/);
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
