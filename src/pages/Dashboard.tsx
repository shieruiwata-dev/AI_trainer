import { Link } from "react-router-dom";
import {
  Flame,
  MessageCircle,
  Plus,
  Scale,
  Utensils,
  Dumbbell,
  Sparkles,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAppData } from "@/hooks/useAppData";
import { formatDateJa, todayStr } from "@/lib/utils";
import { GOAL_TYPE_LABEL } from "@/lib/types";

const QUOTES = [
  "今日の一歩が、未来の自分をつくる。",
  "完璧じゃなくていい。続けることがすべて。",
  "昨日の自分より1%だけ強くなろう。",
  "休むのもトレーニングのうち。焦らずいこう。",
  "記録することが、変わる第一歩。",
  "小さな積み重ねが、大きな変化になる。",
  "できない日があっても、やめなければ負けじゃない。",
];

function quoteOfToday(): string {
  const seed = todayStr()
    .split("-")
    .reduce((a, b) => a + Number(b), 0);
  return QUOTES[seed % QUOTES.length];
}

export default function Dashboard() {
  const data = useAppData();
  const { profile } = data;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return "こんばんは";
    if (h < 11) return "おはようございます";
    if (h < 18) return "こんにちは";
    return "こんばんは";
  })();

  // 目標体重への進捗(開始体重 → 目標体重)
  const weightProgress = (() => {
    const { startWeightKg, targetWeightKg } = profile;
    const current = data.latestWeightKg;
    if (startWeightKg == null || targetWeightKg == null || current == null)
      return null;
    const total = startWeightKg - targetWeightKg;
    if (total === 0) return 100;
    const done = startWeightKg - current;
    return Math.min(100, Math.max(0, (done / total) * 100));
  })();

  const calorieRatio =
    profile.targetCalories != null && profile.targetCalories > 0
      ? Math.min(100, (data.todayCalories / profile.targetCalories) * 100)
      : null;

  const chartData = data.weights.slice(-14).map((w) => ({
    date: formatDateJa(w.date),
    weight: w.weightKg,
  }));

  return (
    <div className="animate-fade-in space-y-4 p-4">
      <header className="pt-2">
        <p className="text-sm text-muted-foreground">
          {greeting}
          {profile.name ? `、${profile.name}さん` : ""}!
        </p>
        <h1 className="text-2xl font-bold">
          {GOAL_TYPE_LABEL[profile.goalType]}
        </h1>
      </header>

      {/* 今日のひとこと */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
        <CardContent className="flex items-start gap-3 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">{quoteOfToday()}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              今日のひとこと
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ストリーク & 今日のサマリー */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center gap-1 p-4">
            <Flame className="h-6 w-6 text-accent" />
            <p className="text-xl font-bold">{data.streakDays}</p>
            <p className="text-[11px] text-muted-foreground">連続記録日</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 p-4">
            <Utensils className="h-6 w-6 text-primary" />
            <p className="text-xl font-bold">{data.todayCalories}</p>
            <p className="text-[11px] text-muted-foreground">今日のkcal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center gap-1 p-4">
            <Dumbbell className="h-6 w-6 text-primary" />
            <p className="text-xl font-bold">{data.todayWorkouts.length}</p>
            <p className="text-[11px] text-muted-foreground">今日の運動</p>
          </CardContent>
        </Card>
      </div>

      {/* カロリー進捗 */}
      {calorieRatio != null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">今日のカロリー</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={calorieRatio} />
            <p className="mt-2 text-xs text-muted-foreground">
              {data.todayCalories} / {profile.targetCalories} kcal(残り{" "}
              {Math.max(0, (profile.targetCalories ?? 0) - data.todayCalories)}{" "}
              kcal)
            </p>
          </CardContent>
        </Card>
      )}

      {/* 体重の推移 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            <span>体重の推移</span>
            {data.latestWeightKg != null && (
              <span className="text-base font-bold text-primary">
                {data.latestWeightKg} kg
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length >= 2 ? (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 5, right: 5, bottom: 0, left: -20 }}
                >
                  <defs>
                    <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="hsl(160 84% 33%)"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(160 84% 33%)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={["dataMin - 1", "dataMax + 1"]}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(v) => [`${v} kg`, "体重"]}
                    contentStyle={{ borderRadius: 12, fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="weight"
                    stroke="hsl(160 84% 33%)"
                    strokeWidth={2.5}
                    fill="url(#weightFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-24 flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm text-muted-foreground">
                体重を2回以上記録するとグラフが表示されます
              </p>
              <Button asChild size="sm" variant="outline">
                <Link to="/log">
                  <Scale /> 体重を記録する
                </Link>
              </Button>
            </div>
          )}
          {weightProgress != null && (
            <div className="mt-3">
              <Progress value={weightProgress} />
              <p className="mt-1.5 text-xs text-muted-foreground">
                目標 {profile.targetWeightKg}kg まで達成率{" "}
                {Math.round(weightProgress)}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* クイックアクション */}
      <div className="grid grid-cols-2 gap-3">
        <Button asChild size="lg" className="h-14">
          <Link to="/chat">
            <MessageCircle /> AIトレーナーに相談
          </Link>
        </Button>
        <Button asChild size="lg" variant="secondary" className="h-14">
          <Link to="/log">
            <Plus /> 今日の記録をつける
          </Link>
        </Button>
      </div>

      {data.storeMode === "local" && (
        <p className="pb-2 text-center text-[11px] text-muted-foreground">
          データはこの端末に保存されています(Supabase 未接続)
        </p>
      )}
    </div>
  );
}
