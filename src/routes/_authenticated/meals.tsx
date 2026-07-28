import { createFileRoute } from "@tanstack/react-router";
import { UtensilsCrossed } from "lucide-react";

export const Route = createFileRoute("/_authenticated/meals")({
  head: () => ({ meta: [{ title: "食事 | サクラの管理" }, { name: "description", content: "サクラが今日の食事を見ている。" }] }),
  component: () => <PlaceholderPage
    icon={UtensilsCrossed}
    title="食事管理"
    trainer="サクラ"
    line="ここに食事を記録してもらうわ。写真か、テキストか。準備できたら教えてね。"
  />,
});

function PlaceholderPage({ icon: Icon, title, trainer, line }: {
  icon: typeof UtensilsCrossed; title: string; trainer: string; line: string;
}) {
  return (
    <div className="px-5 pt-10">
      <header>
        <div className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Section</div>
        <h1 className="mt-2 text-3xl">{title}</h1>
      </header>
      <div className="mt-8 flex flex-col items-center rounded-2xl bg-card p-10 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-8 w-8" strokeWidth={2.5} />
        </div>
        <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
          <span className="font-black text-primary">{trainer}</span>:<br />
          「{line}」
        </p>
        <p className="mt-6 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Coming Soon</p>
      </div>
    </div>
  );
}
