import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Home, UtensilsCrossed, Dumbbell, LineChart, Settings } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile?.onboarded) throw redirect({ to: "/onboarding" });
    return { userId: data.user.id };
  },
  component: AuthedLayout,
});

const TABS = [
  { to: "/home", label: "ホーム", icon: Home },
  { to: "/meals", label: "食事", icon: UtensilsCrossed },
  { to: "/training", label: "トレ", icon: Dumbbell },
  { to: "/stats", label: "グラフ", icon: LineChart },
  { to: "/settings", label: "設定", icon: Settings },
] as const;

function AuthedLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md pb-24">
        <Outlet />
      </div>

      {/* Bottom Tab Bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = pathname === tab.to;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-2"
              >
                <Icon
                  className={`h-6 w-6 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
                  strokeWidth={active ? 2.75 : 2}
                />
                <span
                  className={`text-[10px] font-bold transition-colors ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
