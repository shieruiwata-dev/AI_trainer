import { createFileRoute } from "@tanstack/react-router";
import { Flame, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "ホーム | 筋トレ専属トレーナーAI" },
      { name: "description", content: "今日のあんたの状態を、2人が見守っている。" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="px-5 pt-10">
      <header>
        <div className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Today</div>
        <h1 className="mt-2 text-3xl">おかえり。<br /><span className="text-primary">今日も、始めよう。</span></h1>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card p-5">
          <div className="flex items-center gap-1.5 text-accent">
            <Flame className="h-4 w-4" strokeWidth={2.5} />
            <span className="text-[10px] font-black tracking-widest uppercase">Streak</span>
          </div>
          <div className="num mt-3 text-5xl text-foreground">0</div>
          <div className="mt-1 text-xs text-muted-foreground">連続日数</div>
        </div>
        <div className="rounded-2xl bg-card p-5">
          <div className="flex items-center gap-1.5 text-primary">
            <Sparkles className="h-4 w-4" strokeWidth={2.5} />
            <span className="text-[10px] font-black tracking-widest uppercase">Today</span>
          </div>
          <div className="num mt-3 text-5xl text-foreground">0<span className="text-lg text-muted-foreground">/2</span></div>
          <div className="mt-1 text-xs text-muted-foreground">完了タスク</div>
        </div>
      </section>

      <section className="mt-6 space-y-3">
        <TrainerCard
          name="サクラ"
          role="食事担当・管理栄養士"
          message="今日の食事、まだ記録がないわね。夜までに教えてくれる?"
          accent="primary"
        />
        <TrainerCard
          name="ゴウ"
          role="筋トレ担当・熱血系"
          message="よし、今日のメニューは俺が組んでおいた。準備しろ。"
          accent="accent"
        />
      </section>

      <section className="mt-8 rounded-2xl border border-dashed border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          この画面は骨組みだ。<br />
          次のステップで中身をブチ込むぞ。
        </p>
      </section>
    </div>
  );
}

function TrainerCard({ name, role, message, accent }: { name: string; role: string; message: string; accent: "primary" | "accent" }) {
  const color = accent === "primary" ? "text-primary" : "text-accent";
  const ring = accent === "primary" ? "ring-primary/30" : "ring-accent/30";
  return (
    <article className="rounded-2xl bg-card p-5">
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-black ring-2 ${ring} ${color}`}>
          {name[0]}
        </div>
        <div className="min-w-0">
          <div className={`text-sm font-black ${color}`}>{name}</div>
          <div className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">{role}</div>
        </div>
      </div>
      <p className="mt-3 text-sm text-foreground leading-relaxed">{message}</p>
    </article>
  );
}
