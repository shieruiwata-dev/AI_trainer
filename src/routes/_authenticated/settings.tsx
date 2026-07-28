import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "設定 | 筋トレ専属トレーナーAI" }, { name: "description", content: "アカウントとアプリの設定。" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="px-5 pt-10">
      <header>
        <div className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Section</div>
        <h1 className="mt-2 text-3xl">設定</h1>
      </header>

      <div className="mt-8 rounded-2xl bg-card p-10 text-center">
        <div className="grid mx-auto h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <SettingsIcon className="h-8 w-8" strokeWidth={2.5} />
        </div>
        <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
          プロフィール編集や通知設定は、<br />
          次のステップでここに追加する。
        </p>
      </div>

      <button
        onClick={signOut}
        disabled={loading}
        className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-black text-accent transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        <LogOut className="h-5 w-5" strokeWidth={2.5} />
        ログアウト
      </button>
    </div>
  );
}
