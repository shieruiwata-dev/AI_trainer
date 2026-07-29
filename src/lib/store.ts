import { supabase } from "@/integrations/supabase/client";
import { uid } from "@/lib/utils";
import {
  DEFAULT_PROFILE,
  type MealLog,
  type Profile,
  type WeightLog,
  type WorkoutLog,
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

  listWorkoutLogs(): Promise<WorkoutLog[]>;
  addWorkoutLog(log: Omit<WorkoutLog, "id">): Promise<void>;
  deleteWorkoutLog(id: string): Promise<void>;
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
    all.push({ ...log, id: uid() });
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
}

// ---------- Supabase 実装 ----------
// テーブル定義は supabase/migrations/ を参照。匿名認証(Anonymous Sign-ins)を
// Supabase ダッシュボードで有効にしておくこと。

class SupabaseStore implements DataStore {
  readonly mode = "supabase" as const;
  constructor(private userId: string) {}

  private get db() {
    return supabase!;
  }

  async getProfile(): Promise<Profile> {
    const { data } = await this.db
      .from("profiles")
      .select("*")
      .eq("user_id", this.userId)
      .maybeSingle();
    if (!data) return DEFAULT_PROFILE;
    return {
      name: data.name ?? "",
      goalType: data.goal_type ?? "diet",
      heightCm: data.height_cm,
      startWeightKg: data.start_weight_kg,
      targetWeightKg: data.target_weight_kg,
      targetCalories: data.target_calories,
    };
  }

  async saveProfile(p: Profile): Promise<void> {
    const { error } = await this.db.from("profiles").upsert({
      user_id: this.userId,
      name: p.name,
      goal_type: p.goalType,
      height_cm: p.heightCm,
      start_weight_kg: p.startWeightKg,
      target_weight_kg: p.targetWeightKg,
      target_calories: p.targetCalories,
    });
    if (error) throw error;
  }

  async listWeightLogs(): Promise<WeightLog[]> {
    const { data, error } = await this.db
      .from("weight_logs")
      .select("*")
      .order("date", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      date: r.date,
      weightKg: Number(r.weight_kg),
      note: r.note ?? undefined,
    }));
  }
  async addWeightLog(log: Omit<WeightLog, "id">): Promise<void> {
    const { error } = await this.db.from("weight_logs").insert({
      user_id: this.userId,
      date: log.date,
      weight_kg: log.weightKg,
      note: log.note ?? null,
    });
    if (error) throw error;
  }
  async deleteWeightLog(id: string): Promise<void> {
    const { error } = await this.db.from("weight_logs").delete().eq("id", id);
    if (error) throw error;
  }

  async listMealLogs(): Promise<MealLog[]> {
    const { data, error } = await this.db
      .from("meal_logs")
      .select("*")
      .order("date", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      date: r.date,
      mealType: r.meal_type,
      name: r.name,
      calories: Number(r.calories),
      proteinG: r.protein_g,
      fatG: r.fat_g,
      carbsG: r.carbs_g,
    }));
  }
  async addMealLog(log: Omit<MealLog, "id">): Promise<void> {
    const { error } = await this.db.from("meal_logs").insert({
      user_id: this.userId,
      date: log.date,
      meal_type: log.mealType,
      name: log.name,
      calories: log.calories,
      protein_g: log.proteinG ?? null,
      fat_g: log.fatG ?? null,
      carbs_g: log.carbsG ?? null,
    });
    if (error) throw error;
  }
  async deleteMealLog(id: string): Promise<void> {
    const { error } = await this.db.from("meal_logs").delete().eq("id", id);
    if (error) throw error;
  }

  async listWorkoutLogs(): Promise<WorkoutLog[]> {
    const { data, error } = await this.db
      .from("workout_logs")
      .select("*")
      .order("date", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      date: r.date,
      category: r.category,
      name: r.name,
      detail: r.detail ?? undefined,
      note: r.note ?? undefined,
    }));
  }
  async addWorkoutLog(log: Omit<WorkoutLog, "id">): Promise<void> {
    const { error } = await this.db.from("workout_logs").insert({
      user_id: this.userId,
      date: log.date,
      category: log.category,
      name: log.name,
      detail: log.detail ?? null,
      note: log.note ?? null,
    });
    if (error) throw error;
  }
  async deleteWorkoutLog(id: string): Promise<void> {
    const { error } = await this.db.from("workout_logs").delete().eq("id", id);
    if (error) throw error;
  }
}

// ---------- ストアの初期化 ----------

let storePromise: Promise<DataStore> | null = null;

export function getStore(): Promise<DataStore> {
  if (!storePromise) {
    storePromise = initStore();
  }
  return storePromise;
}

async function initStore(): Promise<DataStore> {
  if (!supabase) return new LocalStore();
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
