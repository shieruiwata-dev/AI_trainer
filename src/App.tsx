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
      <div className="mx-auto min-h-dvh max-w-screen-sm pb-20">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/log" element={<Log />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <BottomNav />
    </Router>
  );
}
