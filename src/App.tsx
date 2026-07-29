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
import Settings from "@/pages/Settings";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";
import { supabase } from "@/integrations/supabase/client";

// 単一HTML(Artifactプレビュー等)ではパスが使えないためハッシュルーティングに切替
const Router = import.meta.env.VITE_USE_HASH_ROUTER ? HashRouter : BrowserRouter;

/** セッションが無ければログイン画面へ誘導する */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<"loading" | "in" | "out">(
    supabase ? "loading" : "in"
  );

  useEffect(() => {
    if (!supabase) return;
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
                path="/"
                element={
                  <RequireAuth>
                    <Chat />
                  </RequireAuth>
                }
              />
              <Route
                path="/log"
                element={
                  <RequireAuth>
                    <Log />
                  </RequireAuth>
                }
              />
              <Route
                path="/settings"
                element={
                  <RequireAuth>
                    <Settings />
                  </RequireAuth>
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
