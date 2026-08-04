import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { todayStr, uid } from "@/lib/utils";
import {
  DEFAULT_PROFILE,
  type MealDetail,
  type MealLog,
  type Profile,
  type TrainerMemory,
  type WeightLog,
  type WorkoutLog,
  type WorkoutSetRecord,
} from "@/lib/types";

/**
 * データ保存層。
 * - Supabase が設定されていれば匿名認証でクラウド保存
 * - 未設定ならローカルストレージ保存(Lovable プレビューでもそのまま動く)
 */
export interface DataStore {
  readonly mode: "supabase" | "local";
  getProfile(): Promise<Profile>;
  saveProfile(profile: Profile): Promise<void>;

  listWeightLogs(): Promise<WeightLog[]>;
  addWeightLog(log: Omit<WeightLog, "id">): Promise<void>;
  deleteWeightLog(id: string): Promise<void>;

  listMealLogs(): Promise<MealLog[]>;
  addMealLog(log: Omit<MealLog, "id">): Promise<void>;
  deleteMealLog(id: string): Promise<void>;

  /**
   * 記録ページ(/log)用: 指定した月の食事だけを写真パスつきで返す(時刻昇順)。
   * 全期間を取る listMealLogs と違い、表示中の月に絞ってサーバー側で範囲指定する
   * (データが溜まっても重くならないようにするため)。
   */
  listMealDetailsForMonth(year: number, month0: number): Promise<MealDetail[]>;

  listWorkoutLogs(): Promise<WorkoutLog[]>;
  addWorkoutLog(log: Omit<WorkoutLog, "id">): Promise<void>;
  deleteWorkoutLog(id: string): Promise<void>;

  /** 直近のセット記録(AIチャット経由で workout_sets に保存されたもの) */
  listRecentWorkoutSets(): Promise<WorkoutSetRecord[]>;

  /**
   * トレーナーが会話から学んだ、このユーザーについての記憶(ChatGPT/Claudeのメモリー機能と同じ考え方)。
   * 生成はDify側(会話のたびに新事実を判定)。ここは一覧表示と削除のみ担当する。
   */
  listTrainerMemories(): Promise<TrainerMemory[]>;
  deleteTrainerMemory(id: string): Promise<void>;
}

// ---------- ローカルストレージ実装 ----------

const LS_KEYS = {
  profile: "fitcoach.profile",
  weights: "fitcoach.weights",
  meals: "fitcoach.meals",
  workouts: "fitcoach.workouts",
} as const;

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

class LocalStore implements DataStore {
  readonly mode = "local" as const;

  async getProfile(): Promise<Profile> {
    return lsGet<Profile>(LS_KEYS.profile, DEFAULT_PROFILE);
  }
  async saveProfile(profile: Profile): Promise<void> {
    lsSet(LS_KEYS.profile, profile);
  }

  async listWeightLogs(): Promise<WeightLog[]> {
    return lsGet<WeightLog[]>(LS_KEYS.weights, []).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }
  async addWeightLog(log: Omit<WeightLog, "id">): Promise<void> {
    const all = lsGet<WeightLog[]>(LS_KEYS.weights, []);
    all.push({ createdAt: new Date().toISOString(), ...log, id: uid() });
    lsSet(LS_KEYS.weights, all);
  }
  async deleteWeightLog(id: string): Promise<void> {
    lsSet(
      LS_KEYS.weights,
      lsGet<WeightLog[]>(LS_KEYS.weights, []).filter((l) => l.id !== id)
    );
  }

  async listMealLogs(): Promise<MealLog[]> {
    return lsGet<MealLog[]>(LS_KEYS.meals, []).sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  }
  async addMealLog(log: Omit<MealLog, "id">): Promise<void> {
    const all = lsGet<MealLog[]>(LS_KEYS.meals, []);
    all.push({ ...log, id: uid() });
    lsSet(LS_KEYS.meals, all);
  }
  async deleteMealLog(id: string): Promise<void> {
    lsSet(
      LS_KEYS.meals,
      lsGet<MealLog[]>(LS_KEYS.meals, []).filter((l) => l.id !== id)
    );
  }

  async listMealDetailsForMonth(year: number, month0: number): Promise<MealDetail[]> {
    const prefix = `${year}-${String(month0 + 1).padStart(2, "0")}`;
    // ローカル保存の食事には時刻・写真が無い
    return lsGet<MealLog[]>(LS_KEYS.meals, [])
      .filter((m) => m.date.startsWith(prefix))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((m) => ({
        id: m.id,
        date: m.date,
        time: null,
        mealType: m.mealType,
        name: m.name,
        calories: m.calories,
        proteinG: m.proteinG ?? null,
        fatG: m.fatG ?? null,
        carbsG: m.carbsG ?? null,
        imagePath: null,
      }));
  }

  async listWorkoutLogs(): Promise<WorkoutLog[]> {
    return lsGet<WorkoutLog[]>(LS_KEYS.workouts, []).sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  }
  async addWorkoutLog(log: Omit<WorkoutLog, "id">): Promise<void> {
    const all = lsGet<WorkoutLog[]>(LS_KEYS.workouts, []);
    all.push({ ...log, id: uid() });
    lsSet(LS_KEYS.workouts, all);
  }
  async deleteWorkoutLog(id: string): Promise<void> {
    lsSet(
      LS_KEYS.workouts,
      lsGet<WorkoutLog[]>(LS_KEYS.workouts, []).filter((l) => l.id !== id)
    );
  }

  async listRecentWorkoutSets(): Promise<WorkoutSetRecord[]> {
    // セット単位の記録はAI(Supabase)経由のみ。ローカルモードでは空
    return [];
  }

  async listTrainerMemories(): Promise<TrainerMemory[]> {
    // 記憶はDifyとの会話から生まれるためAI(Supabase)経由のみ。ローカルモードでは空
    return [];
  }
  async deleteTrainerMemory(): Promise<void> {
    /* ローカルモードには記憶が無いため何もしない */
  }
}

// ---------- Supabase 実装 ----------
// バックエンド側スキーマ(src/integrations/supabase/types.ts 参照)への対応:
//   プロフィール → profiles(表示名・身長・現在体重)+ goals(目標タイプ・目標値・PFC目標)
//   体重         → body_measurements
//   食事         → meals
//   筋トレ       → workout_sessions
// AI(ai-chat / confirm-action)も同じテーブルに書き込むため、記録が一元化される。

/** タイムスタンプ文字列をローカル日付(YYYY-MM-DD)に変換 */
function toLocalDate(iso: string): string {
  return todayStr(new Date(iso));
}

const WORKOUT_CATEGORIES = ["strength", "cardio", "stretch"] as const;
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

class SupabaseStore implements DataStore {
  readonly mode = "supabase" as const;
  constructor(private userId: string) {}

  private get db() {
    return supabase!;
  }

  async getProfile(): Promise<Profile> {
    const [{ data: prof }, { data: goal }] = await Promise.all([
      this.db
        .from("profiles")
        .select("*")
        .eq("user_id", this.userId)
        .maybeSingle(),
      this.db
        .from("goals")
        .select("*")
        .eq("user_id", this.userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (!prof && !goal) return DEFAULT_PROFILE;
    const goalType = (["diet", "bulk", "maintain"] as const).includes(
      goal?.goal_type as "diet"
    )
      ? (goal!.goal_type as Profile["goalType"])
      : DEFAULT_PROFILE.goalType;
    return {
      name: prof?.display_name ?? "",
      goalType,
      heightCm: prof?.height_cm ?? null,
      // 開始体重の専用列は無いため profiles.current_weight_kg を利用
      startWeightKg: prof?.current_weight_kg ?? null,
      targetWeightKg: goal?.target_weight_kg ?? null,
      targetCalories: goal?.target_calories ?? null,
      targetProteinG: goal?.target_protein_g ?? null,
      targetFatG: goal?.target_fat_g ?? null,
      targetCarbsG: goal?.target_carbs_g ?? null,
      targetDate: goal?.target_date ?? null,
    };
  }

  async saveProfile(p: Profile): Promise<void> {
    const { error: profError } = await this.db.from("profiles").upsert({
      user_id: this.userId,
      display_name: p.name,
      height_cm: p.heightCm,
      current_weight_kg: p.startWeightKg,
    });
    if (profError) throw profError;

    // アクティブな goal を更新、無ければ作成
    const { data: goal } = await this.db
      .from("goals")
      .select("id")
      .eq("user_id", this.userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const goalValues = {
      goal_type: p.goalType,
      target_weight_kg: p.targetWeightKg,
      target_calories: p.targetCalories,
    };
    if (goal) {
      const { error } = await this.db
        .from("goals")
        .update(goalValues)
        .eq("id", goal.id);
      if (error) throw error;
    } else {
      const { error } = await this.db.from("goals").insert({
        user_id: this.userId,
        is_active: true,
        ...goalValues,
      });
      if (error) throw error;
    }
  }

  async listWeightLogs(): Promise<WeightLog[]> {
    const { data, error } = await this.db
      .from("body_measurements")
      .select("id, measured_at, weight_kg, note, created_at")
      .order("measured_at", { ascending: true });
    if (error) throw error;
    return (data ?? [])
      .filter((r) => r.weight_kg != null)
      .map((r) => ({
        id: r.id,
        date: toLocalDate(r.measured_at),
        weightKg: Number(r.weight_kg),
        note: r.note ?? undefined,
        // 同じ日を訂正したときにどちらが新しい申告かを判断するために使う
        createdAt: r.created_at ?? undefined,
      }));
  }
  async addWeightLog(log: Omit<WeightLog, "id">): Promise<void> {
    const { error } = await this.db.from("body_measurements").insert({
      user_id: this.userId,
      measured_at: `${log.date}T12:00:00`,
      weight_kg: log.weightKg,
      note: log.note ?? null,
    });
    if (error) throw error;
  }
  async deleteWeightLog(id: string): Promise<void> {
    const { error } = await this.db
      .from("body_measurements")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }

  async listMealLogs(): Promise<MealLog[]> {
    const { data, error } = await this.db
      .from("meals")
      .select("*")
      .order("eaten_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      date: toLocalDate(r.eaten_at),
      mealType: MEAL_TYPES.includes(r.meal_type as "snack")
        ? (r.meal_type as MealLog["mealType"])
        : "snack",
      name: r.raw_text ?? r.estimation_note ?? "食事",
      calories: Number(r.calories),
      proteinG: r.protein_g,
      fatG: r.fat_g,
      carbsG: r.carbs_g,
    }));
  }
  async addMealLog(log: Omit<MealLog, "id">): Promise<void> {
    const { error } = await this.db.from("meals").insert({
      user_id: this.userId,
      eaten_at: `${log.date}T12:00:00`,
      meal_type: log.mealType,
      raw_text: log.name,
      source_type: "manual",
      calories: log.calories,
      protein_g: log.proteinG ?? 0,
      fat_g: log.fatG ?? 0,
      carbs_g: log.carbsG ?? 0,
    });
    if (error) throw error;
  }
  async deleteMealLog(id: string): Promise<void> {
    const { error } = await this.db.from("meals").delete().eq("id", id);
    if (error) throw error;
  }

  async listMealDetailsForMonth(year: number, month0: number): Promise<MealDetail[]> {
    // 表示中の月だけをサーバー側で範囲指定して取る(列も使う分だけに絞る)
    const start = new Date(year, month0, 1);
    const end = new Date(year, month0 + 1, 1);
    const { data, error } = await this.db
      .from("meals")
      .select(
        "id, eaten_at, meal_type, raw_text, estimation_note, calories, protein_g, fat_g, carbs_g, image_path"
      )
      .gte("eaten_at", start.toISOString())
      .lt("eaten_at", end.toISOString())
      .order("eaten_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => {
      const at = new Date(r.eaten_at);
      return {
        id: r.id,
        date: toLocalDate(r.eaten_at),
        time: `${String(at.getHours()).padStart(2, "0")}:${String(
          at.getMinutes()
        ).padStart(2, "0")}`,
        mealType: MEAL_TYPES.includes(r.meal_type as "snack")
          ? (r.meal_type as MealDetail["mealType"])
          : "snack",
        name: r.raw_text ?? r.estimation_note ?? "食事",
        calories: Number(r.calories) || 0,
        proteinG: r.protein_g,
        fatG: r.fat_g,
        carbsG: r.carbs_g,
        imagePath: r.image_path ?? null,
      };
    });
  }

  async listWorkoutLogs(): Promise<WorkoutLog[]> {
    const { data, error } = await this.db
      .from("workout_sessions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      date: toLocalDate(r.started_at ?? r.created_at),
      category: WORKOUT_CATEGORIES.includes(r.focus_area as "strength")
        ? (r.focus_area as WorkoutLog["category"])
        : "strength",
      focusArea: r.focus_area,
      name: r.title ?? "トレーニング",
      detail:
        r.estimated_minutes != null ? `${r.estimated_minutes}分` : undefined,
      note: r.condition_note ?? undefined,
    }));
  }
  async addWorkoutLog(log: Omit<WorkoutLog, "id">): Promise<void> {
    const { error } = await this.db.from("workout_sessions").insert({
      user_id: this.userId,
      title: log.name,
      focus_area: log.category,
      status: "completed",
      started_at: `${log.date}T12:00:00`,
      condition_note: log.note ?? null,
    });
    if (error) throw error;
  }
  async deleteWorkoutLog(id: string): Promise<void> {
    const { error } = await this.db
      .from("workout_sessions")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }

  /**
   * 直近のセット記録を返す(日時の昇順)。
   *
   * 取得は **新しい方から** 500件にすること。昇順+limitだと「いちばん古い500件」に
   * なり、記録が500件を超えた時点で今日のセットが画面から消える
   * (週3回×15セットで約3ヶ月。2026-08-03に修正)。
   * 一方 WorkoutSetsCard は配列順に「1セット目・2セット目…」を並べるため、
   * 返す配列は従来どおり昇順に戻す。
   */
  async listRecentWorkoutSets(): Promise<WorkoutSetRecord[]> {
    const { data, error } = await this.db
      .from("workout_sets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data ?? [])
      .map((r) => ({
        id: r.id,
        sessionId: r.session_id,
        date: toLocalDate(r.completed_at ?? r.created_at),
        exerciseName: r.exercise_name,
        setNumber: r.set_number,
        weightKg: r.actual_weight_kg ?? r.target_weight_kg,
        reps: r.actual_reps ?? r.target_reps,
        completedAt: r.completed_at,
      }))
      .reverse();
  }

  async listTrainerMemories(): Promise<TrainerMemory[]> {
    // trainer_memories はまだ生成済み型(integrations/supabase/types.ts)に無い
    // (柴崎さん側でテーブル作成待ち。作成後に型を再生成したら as any を外せる)。
    // テーブルが存在しない間はエラーを投げるので、呼び出し側(Trainer.tsx)で
    // キャッチして空一覧として扱う
    const { data, error } = await (this.db as SupabaseClientAny)
      .from("trainer_memories")
      .select("id, content, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as TrainerMemoryRow[]).map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.created_at,
    }));
  }
  async deleteTrainerMemory(id: string): Promise<void> {
    const { error } = await (this.db as SupabaseClientAny)
      .from("trainer_memories")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }
}

/** trainer_memories が生成済み型に載るまでの一時的な最小定義 */
interface TrainerMemoryRow {
  id: string;
  content: string;
  created_at: string;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientAny = any;

// ---------- ストアの初期化 ----------

let storePromise: Promise<DataStore> | null = null;

export function getStore(): Promise<DataStore> {
  if (!storePromise) {
    storePromise = initStore();
  }
  return storePromise;
}

async function initStore(): Promise<DataStore> {
  // デモビルド(VITE_FORCE_DEMO)では常にローカル保存
  if (!isSupabaseConfigured || !supabase) return new LocalStore();
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) throw new Error("未ログイン");
    return new SupabaseStore(userId);
  } catch (e) {
    console.warn(
      "Supabase に接続できなかったため、ローカル保存モードで動作します:",
      e
    );
    return new LocalStore();
  }
}

/** ログイン/ログアウト後にストアのキャッシュを破棄して作り直させる */
export function resetStore(): void {
  storePromise = null;
}
