import { useEffect, useState } from "react";
import {
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Toaster } from "sonner";
import Chat from "@/pages/Chat";
import Log from "@/pages/Log";
import Goal from "@/pages/Goal";
import Settings from "@/pages/Settings";
import Auth from "@/pages/Auth";
import OnboardingExperience from "@/pages/OnboardingExperience";
import NotFound from "@/pages/NotFound";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";

// 単一HTML(Artifactプレビュー等)ではパスが使えないためハッシュルーティングに切替
const Router = import.meta.env.VITE_USE_HASH_ROUTER ? HashRouter : BrowserRouter;

/** セッションが無ければログイン画面へ誘導する(デモビルドでは認証をスキップ) */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<"loading" | "in" | "out">(
    isSupabaseConfigured ? "loading" : "in"
  );

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setState(session ? "in" : "out");
    });
    supabase.auth
      .getSession()
      .then(({ data }) => setState(data.session ? "in" : "out"));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (state === "loading") return null;
  if (state === "out")
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

/** 経験ヒアリング / 目標設計が未完了のユーザーを該当ステップへ誘導する */
function RequireOnboarded({ children }: { children: React.ReactNode }) {
  const [redirect, setRedirect] = useState<string | null | "loading">(
    isSupabaseConfigured ? "loading" : null
  );

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    supabase.auth.getUser().then(async ({ data }) => {
      const userId = data.user?.id;
      if (!userId) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed, onboarding_step")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (!profile?.onboarding_completed) {
        setRedirect("/onboarding/experience");
      } else if (isGoalStep(profile.onboarding_step)) {
        setRedirect(GOAL_STEP_ROUTES[profile.onboarding_step]);
      } else {
        setRedirect(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (redirect === "loading") return null;
  if (redirect) return <Navigate to={redirect} replace />;
  return <>{children}</>;
}

/** 認証済み + オンボーディング完了が必要な画面 */
function Protected({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <RequireOnboarded>{children}</RequireOnboarded>
    </RequireAuth>
  );
}


export default function App() {
  return (
    <Router>
      {/* ヘッダー操作を塞がないよう入力バーの上に表示 */}
      <Toaster position="bottom-center" offset={96} duration={2000} />
      {/* 広い画面ではスマホ端末風フレームに収める。スマホ実機では全画面 */}
      <div className="md:flex md:min-h-dvh md:items-center md:justify-center md:bg-[#e2e2e7] md:p-6">
        <div className="flex h-dvh flex-col overflow-hidden bg-background md:h-[844px] md:max-h-[92dvh] md:w-[390px] md:rounded-[2.5rem] md:border-8 md:border-[#1d1d1f] md:shadow-2xl">
          <main className="min-h-0 flex-1 overflow-y-auto">
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/onboarding/experience"
                element={
                  <RequireAuth>
                    <OnboardingExperience />
                  </RequireAuth>
                }
              />
              <Route
                path="/"
                element={
                  <Protected>
                    <Chat />
                  </Protected>
                }
              />
              <Route
                path="/log"
                element={
                  <Protected>
                    <Log />
                  </Protected>
                }
              />
              <Route
                path="/goal"
                element={
                  <RequireAuth>
                    <Goal />
                  </RequireAuth>
                }
              />
              <Route
                path="/settings"
                element={
                  <Protected>
                    <Settings />
                  </Protected>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
