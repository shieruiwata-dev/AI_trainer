import { createFileRoute } from "@tanstack/react-router";
import { LineChart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/stats")({
  head: () => ({ meta: [{ title: "グラフ | 変化を可視化" }, { name: "description", content: "体重・食事・トレーニングの変化を見る。" }] }),
  component: StatsPage,
});

function StatsPage() {
  return (
    <div className="px-5 pt-10">
      <header>
        <div className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Section</div>
        <h1 className="mt-2 text-3xl">グラフ</h1>
      </header>
      <div className="mt-8 flex flex-col items-center rounded-2xl bg-card p-10 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <LineChart className="h-8 w-8" strokeWidth={2.5} />
        </div>
        <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
          記録が溜まってきたら、ここで変化を見られる。<br />
          サクラとゴウが、数字であんたを褒める場所だ。
        </p>
        <p className="mt-6 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Coming Soon</p>
      </div>
    </div>
  );
}
