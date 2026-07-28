import { createFileRoute } from "@tanstack/react-router";
import { Dumbbell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/training")({
  head: () => ({ meta: [{ title: "トレーニング | ゴウの指導" }, { name: "description", content: "ゴウが今日のメニューを組む。" }] }),
  component: TrainingPage,
});

function TrainingPage() {
  return (
    <div className="px-5 pt-10">
      <header>
        <div className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Section</div>
        <h1 className="mt-2 text-3xl">トレーニング</h1>
      </header>
      <div className="mt-8 flex flex-col items-center rounded-2xl bg-card p-10 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
          <Dumbbell className="h-8 w-8" strokeWidth={2.5} />
        </div>
        <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
          <span className="font-black text-accent">ゴウ</span>:<br />
          「今日のメニューはここに出す。休むな、逃げるな、続けろ。」
        </p>
        <p className="mt-6 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Coming Soon</p>
      </div>
    </div>
  );
}
