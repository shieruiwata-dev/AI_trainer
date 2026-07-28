import { NavLink } from "react-router-dom";
import { MessageCircle, ClipboardList, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "トレーナー", icon: MessageCircle },
  { to: "/log", label: "記録", icon: ClipboardList },
  { to: "/settings", label: "設定", icon: Settings },
];

export default function BottomNav() {
  return (
    <nav className="z-50 shrink-0 border-t bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <div className="flex">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <Icon className="h-6 w-6" strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
