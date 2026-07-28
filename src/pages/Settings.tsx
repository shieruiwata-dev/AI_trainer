import { useEffect, useState } from "react";
import { toast } from "sonner";
import BackLink from "@/components/BackLink";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppData } from "@/hooks/useAppData";
import { GOAL_TYPE_LABEL, type GoalType } from "@/lib/types";
import { getTrainerMode } from "@/lib/trainer";

export default function Settings() {
  const data = useAppData();
  const [name, setName] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("diet");
  const [height, setHeight] = useState("");
  const [startWeight, setStartWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [targetCalories, setTargetCalories] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data.loading) return;
    const p = data.profile;
    setName(p.name);
    setGoalType(p.goalType);
    setHeight(p.heightCm?.toString() ?? "");
    setStartWeight(p.startWeightKg?.toString() ?? "");
    setTargetWeight(p.targetWeightKg?.toString() ?? "");
    setTargetCalories(p.targetCalories?.toString() ?? "");
  }, [data.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const num = (s: string): number | null => {
    if (!s.trim()) return null;
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await data.store!.saveProfile({
        name: name.trim(),
        goalType,
        heightCm: num(height),
        startWeightKg: num(startWeight),
        targetWeightKg: num(targetWeight),
        targetCalories: num(targetCalories),
      });
      await data.reload();
      toast.success("設定を保存しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  const mode = getTrainerMode();

  return (
    <div className="animate-fade-in space-y-5 p-4 pb-[max(calc(env(safe-area-inset-bottom,0px)+1rem),1.5rem)] pt-[max(calc(env(safe-area-inset-top,0px)+0.5rem),0.75rem)]">
      <BackLink />
      <header className="px-1">
        <h1 className="text-[28px] leading-[1.14]">設定</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          目標を設定すると、トレーナーのアドバイスがより具体的になります。
        </p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px]">プロフィールと目標</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="s-name">ニックネーム</Label>
              <Input
                id="s-name"
                placeholder="例: しえる"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-goal">目標タイプ</Label>
              <select
                id="s-goal"
                value={goalType}
                onChange={(e) => setGoalType(e.target.value as GoalType)}
                className="flex h-11 w-full appearance-none rounded-[11px] border border-input bg-card px-3.5 py-2 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {Object.entries(GOAL_TYPE_LABEL).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="s-height">身長 (cm)</Label>
                <Input
                  id="s-height"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="165"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-start">開始時の体重 (kg)</Label>
                <Input
                  id="s-start"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="70"
                  value={startWeight}
                  onChange={(e) => setStartWeight(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-target">目標体重 (kg)</Label>
                <Input
                  id="s-target"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="60"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-kcal">1日の目標カロリー</Label>
                <Input
                  id="s-kcal"
                  type="number"
                  inputMode="numeric"
                  placeholder="1800"
                  value={targetCalories}
                  onChange={(e) => setTargetCalories(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={saving || data.loading || !data.store}
            >
              保存する
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px]">接続状態</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 text-[14px]">
          <StatusRow
            label="データ保存"
            value={
              data.storeMode === "supabase"
                ? "Supabase(クラウド保存)"
                : "この端末のみ(ローカル保存)"
            }
            ok={data.storeMode === "supabase"}
          />
          <StatusRow
            label="AIトレーナー"
            value={
              mode === "edge"
                ? "Supabase Edge Function 経由(Dify)"
                : mode === "dify-direct"
                  ? "Dify 直接接続(開発用)"
                  : "デモモード"
            }
            ok={mode !== "demo"}
          />
          <p className="pt-1 text-[13px] text-muted-foreground">
            バックエンド(Supabase / Dify)の接続方法は README と
            docs/backend-setup.md を参照してください。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusRow({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 text-right font-medium">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            ok ? "bg-primary" : "bg-[#7a7a7a]"
          }`}
        />
        {value}
      </span>
    </div>
  );
}
