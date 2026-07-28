import { NavLink } from "react-router-dom";
import { Home, MessageCircle, ClipboardList, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "ホーム", icon: Home },
  { to: "/chat", label: "トレーナー", icon: MessageCircle },
  { to: "/log", label: "記録", icon: ClipboardList },
  { to: "/settings", label: "設定", icon: Settings },
];

export default function BottomNav() {
  return (
    <nav className="z-50 shrink-0 border-t bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
