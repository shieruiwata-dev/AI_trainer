import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dumbbell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { resetStore } from "@/lib/store";

type Mode = "signin" | "signup";

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      toast.error("バックエンドに接続できません");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("登録しました");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
      resetStore();
      navigate("/", { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "エラーが発生しました";
      toast.error(
        msg.includes("Invalid login credentials")
          ? "メールアドレスまたはパスワードが違います"
          : msg
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12">
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Dumbbell className="h-7 w-7" strokeWidth={2.2} />
        </div>
        <h1 className="text-[28px] font-bold tracking-tight">
          専属トレーナーAI
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {mode === "signin"
            ? "ログインして今日も始めよう"
            : "アカウントを作って始めよう"}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">メールアドレス</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">パスワード</Label>
          <Input
            id="password"
            type="password"
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6文字以上"
          />
        </div>
        <Button type="submit" className="h-12 w-full text-[17px]" disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "signin" ? "ログイン" : "新規登録"}
        </Button>
      </form>

      <button
        type="button"
        className="mt-5 text-[15px] text-primary"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin"
          ? "アカウントをお持ちでない方はこちら"
          : "すでにアカウントをお持ちの方はこちら"}
      </button>

    </div>
  );
}
