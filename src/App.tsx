import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import BottomNav from "@/components/BottomNav";
import Dashboard from "@/pages/Dashboard";
import Chat from "@/pages/Chat";
import Log from "@/pages/Log";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

// 単一HTML(Artifactプレビュー等)ではパスが使えないためハッシュルーティングに切替
const Router = import.meta.env.VITE_USE_HASH_ROUTER ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <Router>
      <Toaster position="top-center" richColors />
      {/* 広い画面ではスマホ端末風フレームに収める。スマホ実機では全画面 */}
      <div className="md:flex md:min-h-dvh md:items-center md:justify-center md:bg-[radial-gradient(ellipse_at_top,hsl(160_35%_90%),hsl(160_20%_82%))] md:p-6">
        <div className="flex h-dvh flex-col overflow-hidden bg-background md:h-[844px] md:max-h-[92dvh] md:w-[390px] md:rounded-[2.5rem] md:border-8 md:border-slate-800 md:shadow-2xl">
          <main className="min-h-0 flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/log" element={<Log />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <BottomNav />
        </div>
      </div>
    </Router>
  );
}
