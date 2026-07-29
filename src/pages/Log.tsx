import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BackLink from "@/components/BackLink";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppData } from "@/hooks/useAppData";
import { formatDateJa, todayStr } from "@/lib/utils";
import {
  MEAL_TYPE_LABEL,
  WORKOUT_CATEGORY_LABEL,
  type MealType,
  type WorkoutCategory,
} from "@/lib/types";

const ACTION_BLUE = "#0066cc";

export default function Log() {
  const data = useAppData();

  return (
    <div className="animate-fade-in space-y-5 p-4 pb-[max(calc(env(safe-area-inset-bottom,0px)+1rem),1.5rem)] pt-[max(calc(env(safe-area-inset-top,0px)+0.5rem),0.75rem)]">
      <BackLink />
      <header className="px-1">
        <h1 className="text-[28px] leading-[1.14]">記録</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          毎日の記録が、変化への一番の近道。
        </p>
      </header>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-2.5">
        <StatCard value={`${data.streakDays}`} unit="日" label="連続記録" />
        <StatCard
          value={`${data.todayCalories}`}
          unit="kcal"
          label="今日の摂取"
        />
        <StatCard
          value={data.latestWeightKg != null ? `${data.latestWeightKg}` : "–"}
          unit="kg"
          label="体重"
        />
      </div>

      <Tabs defaultValue="weight">
        <TabsList>
          <TabsTrigger value="weight">体重</TabsTrigger>
          <TabsTrigger value="meal">食事</TabsTrigger>
          <TabsTrigger value="workout">筋トレ</TabsTrigger>
        </TabsList>

        <TabsContent value="weight">
          <WeightTab data={data} />
        </TabsContent>
        <TabsContent value="meal">
          <MealTab data={data} />
        </TabsContent>
        <TabsContent value="workout">
          <WorkoutTab data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  value,
  unit,
  label,
}: {
  value: string;
  unit: string;
  label: string;
}) {
  return (
    <div className="rounded-[18px] border bg-card px-3 py-3.5 text-center">
      <p className="text-[22px] font-semibold leading-none tracking-[-0.02em] [font-variant-numeric:tabular-nums]">
        {value}
        <span className="ml-0.5 text-[12px] font-normal text-muted-foreground">
          {unit}
        </span>
      </p>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

type Data = ReturnType<typeof useAppData>;

function WeightTab({ data }: { data: Data }) {
  const [date, setDate] = useState(todayStr());
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);

  const { profile } = data;
  const weightProgress = (() => {
    const { startWeightKg, targetWeightKg } = profile;
    const current = data.latestWeightKg;
    if (startWeightKg == null || targetWeightKg == null || current == null)
      return null;
    const total = startWeightKg - targetWeightKg;
    if (total === 0) return 100;
    return Math.min(100, Math.max(0, ((startWeightKg - current) / total) * 100));
  })();

  const chartData = data.weights.slice(-14).map((w) => ({
    date: formatDateJa(w.date),
    weight: w.weightKg,
  }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const w = parseFloat(weight);
    if (!date || isNaN(w) || w <= 0 || w > 500) {
      toast.error("体重を正しく入力してください");
      return;
    }
    setSaving(true);
    try {
      await data.store!.addWeightLog({ date, weightKg: w });
      await data.reload();
      setWeight("");
      toast.success("体重を記録しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await data.store!.deleteWeightLog(id);
    await data.reload();
  }

  return (
    <div className="space-y-4">
      {/* 推移グラフ */}
      {chartData.length >= 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px]">推移</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 5, right: 5, bottom: 0, left: -22 }}
                >
                  <defs>
                    <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ACTION_BLUE} stopOpacity={0.16} />
                      <stop offset="100%" stopColor={ACTION_BLUE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#7a7a7a" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={["dataMin - 1", "dataMax + 1"]}
                    tick={{ fontSize: 11, fill: "#7a7a7a" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(v) => [`${v} kg`, "体重"]}
                    contentStyle={{
                      borderRadius: 11,
                      fontSize: 13,
                      border: "1px solid #e0e0e0",
                      boxShadow: "none",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="weight"
                    stroke={ACTION_BLUE}
                    strokeWidth={2}
                    fill="url(#weightFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {weightProgress != null && (
              <div className="mt-3">
                <Progress value={weightProgress} />
                <p className="mt-2 text-[13px] text-muted-foreground">
                  目標 {profile.targetWeightKg}kg まで達成率{" "}
                  <span className="[font-variant-numeric:tabular-nums]">
                    {Math.round(weightProgress)}%
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="w-date">日付</Label>
                <Input
                  id="w-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={todayStr()}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="w-kg">体重 (kg)</Label>
                <Input
                  id="w-kg"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  placeholder="65.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={saving || !data.store}
            >
              記録する
            </Button>
          </form>
        </CardContent>
      </Card>

      <HistoryList
        items={[...data.weights]
          .reverse()
          .slice(0, 30)
          .map((w) => ({
            id: w.id,
            title: `${w.weightKg} kg`,
            sub: formatDateJa(w.date),
          }))}
        onDelete={remove}
        emptyText="まだ記録がありません。今日の体重から始めましょう。"
      />
    </div>
  );
}

function MealTab({ data }: { data: Data }) {
  const [date, setDate] = useState(todayStr());
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [carbs, setCarbs] = useState("");
  const [saving, setSaving] = useState(false);

  const numOrNull = (s: string): number | null => {
    if (!s.trim()) return null;
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const kcal = parseInt(calories, 10);
    if (!date || !name.trim() || isNaN(kcal) || kcal < 0) {
      toast.error("内容とカロリーを入力してください");
      return;
    }
    setSaving(true);
    try {
      await data.store!.addMealLog({
        date,
        mealType,
        name: name.trim(),
        calories: kcal,
        proteinG: numOrNull(protein),
        fatG: numOrNull(fat),
        carbsG: numOrNull(carbs),
      });
      await data.reload();
      setName("");
      setCalories("");
      setProtein("");
      setFat("");
      setCarbs("");
      toast.success("食事を記録しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await data.store!.deleteMealLog(id);
    await data.reload();
  }

  const calorieRatio =
    data.profile.targetCalories != null && data.profile.targetCalories > 0
      ? Math.min(100, (data.todayCalories / data.profile.targetCalories) * 100)
      : null;

  return (
    <div className="space-y-4">
      {calorieRatio != null && (
        <Card>
          <CardContent className="p-5">
            <Progress value={calorieRatio} />
            <p className="mt-2 text-[13px] text-muted-foreground [font-variant-numeric:tabular-nums]">
              今日 {data.todayCalories} / {data.profile.targetCalories} kcal
              (残り{" "}
              {Math.max(
                0,
                (data.profile.targetCalories ?? 0) - data.todayCalories
              )}{" "}
              kcal)
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="m-date">日付</Label>
                <Input
                  id="m-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={todayStr()}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-type">区分</Label>
                <NativeSelect
                  id="m-type"
                  value={mealType}
                  onChange={(v) => setMealType(v as MealType)}
                  options={MEAL_TYPE_LABEL}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-name">食事内容</Label>
              <Input
                id="m-name"
                placeholder="例: 鶏むね肉のサラダ"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="m-kcal">カロリー (kcal)</Label>
                <Input
                  id="m-kcal"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="450"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-protein">タンパク質 (g・任意)</Label>
                <Input
                  id="m-protein"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  placeholder="30"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-fat">脂質 (g・任意)</Label>
                <Input
                  id="m-fat"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  placeholder="15"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-carbs">炭水化物 (g・任意)</Label>
                <Input
                  id="m-carbs"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  placeholder="50"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={saving || !data.store}
            >
              記録する
            </Button>
          </form>
        </CardContent>
      </Card>

      <HistoryList
        items={data.meals.slice(0, 30).map((m) => ({
          id: m.id,
          title: `${m.name}(${m.calories} kcal)`,
          sub: `${formatDateJa(m.date)} ${MEAL_TYPE_LABEL[m.mealType]}`,
        }))}
        onDelete={remove}
        emptyText="まだ記録がありません。今日食べたものを記録しましょう。"
      />
    </div>
  );
}

function WorkoutTab({ data }: { data: Data }) {
  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState<WorkoutCategory>("strength");
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !name.trim()) {
      toast.error("種目名を入力してください");
      return;
    }
    setSaving(true);
    try {
      await data.store!.addWorkoutLog({
        date,
        category,
        name: name.trim(),
        detail: detail.trim() || undefined,
      });
      await data.reload();
      setName("");
      setDetail("");
      toast.success("ナイストレーニング。記録しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await data.store!.deleteWorkoutLog(id);
    await data.reload();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="t-date">日付</Label>
                <Input
                  id="t-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={todayStr()}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-cat">種類</Label>
                <NativeSelect
                  id="t-cat"
                  value={category}
                  onChange={(v) => setCategory(v as WorkoutCategory)}
                  options={WORKOUT_CATEGORY_LABEL}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-name">種目</Label>
              <Input
                id="t-name"
                placeholder="例: スクワット"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-detail">内容(任意)</Label>
              <Input
                id="t-detail"
                placeholder="例: 10回 × 3セット / 30分"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={saving || !data.store}
            >
              記録する
            </Button>
          </form>
        </CardContent>
      </Card>

      <HistoryList
        items={data.workouts.slice(0, 30).map((w) => ({
          id: w.id,
          title: `${w.name}${w.detail ? `(${w.detail})` : ""}`,
          sub: `${formatDateJa(w.date)} ${WORKOUT_CATEGORY_LABEL[w.category]}`,
        }))}
        onDelete={remove}
        emptyText="まだ記録がありません。軽い運動からでOK。"
      />
    </div>
  );
}

function NativeSelect({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: Record<string, string>;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-11 w-full appearance-none rounded-[11px] border border-input bg-card px-3.5 py-2 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {Object.entries(options).map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}

function HistoryList({
  items,
  onDelete,
  emptyText,
}: {
  items: { id: string; title: string; sub: string }[];
  onDelete: (id: string) => Promise<void>;
  emptyText: string;
}) {
  // confirm() はプレビュー環境でブロックされることがあるため2段階タップで確認
  const [armedId, setArmedId] = useState<string | null>(null);

  function handleDelete(id: string) {
    if (armedId === id) {
      setArmedId(null);
      onDelete(id);
      toast("削除しました");
    } else {
      setArmedId(id);
      setTimeout(() => {
        setArmedId((cur) => (cur === id ? null : cur));
      }, 3000);
    }
  }

  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-[14px] text-muted-foreground">
        {emptyText}
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-[18px] border bg-card">
      <ul className="divide-y">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-2 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium">{item.title}</p>
              <p className="text-[13px] text-muted-foreground">{item.sub}</p>
            </div>
            <button
              className={cn(
                "flex h-8 shrink-0 items-center justify-center gap-1 rounded-full transition-[transform,colors] active:scale-95",
                armedId === item.id
                  ? "bg-destructive px-3 text-[13px] font-medium text-destructive-foreground"
                  : "w-8 text-muted-foreground hover:text-destructive"
              )}
              onClick={() => handleDelete(item.id)}
              aria-label={armedId === item.id ? "タップして削除を確定" : "削除"}
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.8} />
              {armedId === item.id && "削除"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
