import { useCallback, useEffect, useMemo, useState } from "react";
import { getStore, type DataStore } from "@/lib/store";
import { latestPerDay } from "@/lib/weight";
import { todayStr } from "@/lib/utils";
import {
  DEFAULT_PROFILE,
  type MealLog,
  type Profile,
  type WeightLog,
  type WorkoutLog,
  type WorkoutSetRecord,
} from "@/lib/types";

export interface AppData {
  loading: boolean;
  storeMode: "supabase" | "local" | null;
  profile: Profile;
  weights: WeightLog[]; // 日付昇順
  meals: MealLog[]; // 日付降順
  workouts: WorkoutLog[]; // 日付降順
  latestWeightKg: number | null;
  todayCalories: number;
  todayProteinG: number;
  todayFatG: number;
  todayCarbsG: number;
  todayMeals: MealLog[];
  todayWorkouts: WorkoutLog[];
  /** 直近のセット記録すべて(日付つき) */
  workoutSets: WorkoutSetRecord[];
  todayWorkoutSets: WorkoutSetRecord[];
  streakDays: number;
  reload: () => Promise<void>;
  store: DataStore | null;
}

/** 記録がある日の集合から「今日または昨日を起点とした連続日数」を計算 */
export function calcStreak(dates: Set<string>): number {
  if (dates.size === 0) return 0;
  const day = new Date();
  // 今日に記録がなければ昨日から数える(今日はまだこれから記録するかもしれない)
  if (!dates.has(todayStr(day))) {
    day.setDate(day.getDate() - 1);
  }
  let streak = 0;
  while (dates.has(todayStr(day))) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

export function useAppData(): AppData {
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<DataStore | null>(null);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [workoutSets, setWorkoutSets] = useState<WorkoutSetRecord[]>([]);

  const reload = useCallback(async () => {
    const s = await getStore();
    setStore(s);
    const [p, w, m, wo, sets] = await Promise.all([
      s.getProfile(),
      s.listWeightLogs(),
      s.listMealLogs(),
      s.listWorkoutLogs(),
      s.listRecentWorkoutSets(),
    ]);
    setProfile(p);
    // 同じ日を訂正すると行が増えるので、1日1件(あとから保存した方)に絞る
    setWeights(latestPerDay(w));
    setMeals(m);
    setWorkouts(wo);
    setWorkoutSets(sets);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const today = todayStr();

  const derived = useMemo(() => {
    const todayMeals = meals.filter((m) => m.date === today);
    const todayWorkouts = workouts.filter((w) => w.date === today);
    const todayWorkoutSets = workoutSets.filter((s) => s.date === today);
    const todayCalories = todayMeals.reduce((sum, m) => sum + m.calories, 0);
    const todayProteinG = todayMeals.reduce(
      (sum, m) => sum + (m.proteinG ?? 0),
      0
    );
    const todayFatG = todayMeals.reduce((sum, m) => sum + (m.fatG ?? 0), 0);
    const todayCarbsG = todayMeals.reduce(
      (sum, m) => sum + (m.carbsG ?? 0),
      0
    );
    const latestWeightKg =
      weights.length > 0 ? weights[weights.length - 1].weightKg : null;

    const dates = new Set<string>();
    weights.forEach((l) => dates.add(l.date));
    meals.forEach((l) => dates.add(l.date));
    workouts.forEach((l) => dates.add(l.date));
    const streakDays = calcStreak(dates);

    return {
      todayMeals,
      todayWorkouts,
      todayWorkoutSets,
      todayCalories,
      todayProteinG,
      todayFatG,
      todayCarbsG,
      latestWeightKg,
      streakDays,
    };
  }, [weights, meals, workouts, workoutSets, today]);

  return {
    loading,
    storeMode: store?.mode ?? null,
    profile,
    weights,
    meals,
    workouts,
    workoutSets,
    ...derived,
    reload,
    store,
  };
}
