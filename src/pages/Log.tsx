import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppData } from "@/hooks/useAppData";
import { formatDateJa, todayStr } from "@/lib/utils";
import {
  MEAL_TYPE_LABEL,
  WORKOUT_CATEGORY_LABEL,
  type MealType,
  type WorkoutCategory,
} from "@/lib/types";

export default function Log() {
  const data = useAppData();

  return (
    <div className="animate-fade-in space-y-4 p-4">
      <header className="pt-2">
        <h1 className="text-2xl font-bold">記録</h1>
        <p className="text-sm text-muted-foreground">
          毎日の記録が、変化への一番の近道です
        </p>
      </header>

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

type Data = ReturnType<typeof useAppData>;

function WeightTab({ data }: { data: Data }) {
  const [date, setDate] = useState(todayStr());
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);

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
      toast.success("体重を記録しました!");
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
      <Card>
        <CardContent className="p-4">
          <form onSubmit={submit} className="space-y-3">
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
            <Button type="submit" className="w-full" disabled={saving || !data.store}>
              記録する
            </Button>
          </form>
        </CardContent>
      </Card>

      <HistoryList
        items={[...data.weights].reverse().slice(0, 30).map((w) => ({
          id: w.id,
          title: `${w.weightKg} kg`,
          sub: formatDateJa(w.date),
        }))}
        onDelete={remove}
        emptyText="まだ記録がありません。今日の体重から始めましょう!"
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
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const kcal = parseInt(calories, 10);
    if (!date || !name.trim() || isNaN(kcal) || kcal < 0) {
      toast.error("内容とカロリーを入力してください");
      return;
    }
    setSaving(true);
    try {
      const p = protein ? parseFloat(protein) : null;
      await data.store!.addMealLog({
        date,
        mealType,
        name: name.trim(),
        calories: kcal,
        proteinG: p != null && !isNaN(p) ? p : null,
      });
      await data.reload();
      setName("");
      setCalories("");
      setProtein("");
      toast.success("食事を記録しました!");
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

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <form onSubmit={submit} className="space-y-3">
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
                <select
                  id="m-type"
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as MealType)}
                  className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {Object.entries(MEAL_TYPE_LABEL).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
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
                <Label htmlFor="m-protein">たんぱく質 (g・任意)</Label>
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
            </div>
            <Button type="submit" className="w-full" disabled={saving || !data.store}>
              記録する
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        今日の合計: <b>{data.todayCalories} kcal</b>
        {data.todayProteinG > 0 && (
          <>
            {" "}/ たんぱく質 <b>{data.todayProteinG} g</b>
          </>
        )}
      </p>

      <HistoryList
        items={data.meals.slice(0, 30).map((m) => ({
          id: m.id,
          title: `${m.name}(${m.calories} kcal)`,
          sub: `${formatDateJa(m.date)} ${MEAL_TYPE_LABEL[m.mealType]}`,
        }))}
        onDelete={remove}
        emptyText="まだ記録がありません。今日食べたものを記録しましょう!"
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
      toast.success("ナイストレーニング!記録しました💪");
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
        <CardContent className="p-4">
          <form onSubmit={submit} className="space-y-3">
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
                <select
                  id="t-cat"
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as WorkoutCategory)
                  }
                  className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {Object.entries(WORKOUT_CATEGORY_LABEL).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
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
            <Button type="submit" className="w-full" disabled={saving || !data.store}>
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
        emptyText="まだ記録がありません。軽い運動からでOK!"
      />
    </div>
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
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between rounded-xl border bg-card px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.sub}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => {
              if (confirm("この記録を削除しますか?")) onDelete(item.id);
            }}
            aria-label="削除"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
