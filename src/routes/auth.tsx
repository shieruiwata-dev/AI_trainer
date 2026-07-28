import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "契約する | 筋トレ専属トレーナーAI" },
      { name: "description", content: "サクラとゴウ、2人のAIトレーナーとの契約はここから。" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        navigate({ to: "/onboarding" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "何かがおかしい。もう一度試してくれ。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-6 pt-16 pb-10">
      <div className="mx-auto flex max-w-md flex-col">
        <div className="flex items-center gap-2 text-primary">
          <Flame className="h-6 w-6" strokeWidth={2.5} />
          <span className="text-sm font-bold tracking-widest uppercase">Sakura × Go</span>
        </div>

        <h1 className="mt-6 text-4xl leading-tight">
          今日から、<br />
          <span className="text-primary">本気で変わる。</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          管理栄養士のサクラと、熱血トレーナーのゴウ。<br />
          2人があんたの毎日を見張り続ける。
        </p>

        <div className="mt-8 flex gap-1 rounded-2xl bg-card p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-xl py-3 text-sm font-bold transition-colors ${
              mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-xl py-3 text-sm font-bold transition-colors ${
              mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            新規契約
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">メール</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 rounded-2xl border border-border bg-card px-4 text-base text-foreground outline-none focus:border-primary"
              placeholder="you@example.com"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">パスワード</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 rounded-2xl border border-border bg-card px-4 text-base text-foreground outline-none focus:border-primary"
              placeholder="6文字以上"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-14 items-center justify-center gap-2 rounded-xl bg-primary text-base font-black text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            {mode === "signup" ? "トレーナーと契約する" : "今日も始める"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {mode === "signup"
            ? "契約すれば、今この瞬間から2人があんたを担当する。"
            : "おかえり。今日のメニュー、もう決まってるぞ。"}
        </p>
      </div>
    </div>
  );
}
