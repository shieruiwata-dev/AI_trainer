import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** ミニカレンダー(記録がある日にドット表示)。食事・筋トレ記録ページで共用 */
export function MiniCalendar({
  month,
  onMonthChange,
  selectedDate,
  onSelect,
  markedDates,
  today,
}: {
  month: { y: number; m: number };
  onMonthChange: (m: { y: number; m: number }) => void;
  selectedDate: string;
  onSelect: (date: string) => void;
  markedDates: Map<string, unknown> | Set<string>;
  today: string;
}) {
  const firstDay = new Date(month.y, month.m, 1).getDay();
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();

  const dateOf = (day: number) =>
    `${month.y}-${String(month.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  function moveMonth(delta: number) {
    const d = new Date(month.y, month.m + delta, 1);
    onMonthChange({ y: d.getFullYear(), m: d.getMonth() });
  }

  return (
    <div className="w-[208px] shrink-0 rounded-[16px] border bg-card px-2.5 py-2.5">
      {/* 月ヘッダー */}
      <div className="flex items-center justify-between px-1">
        <button
          aria-label="前の月"
          onClick={() => moveMonth(-1)}
          className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <p className="text-[13px] font-semibold [font-variant-numeric:tabular-nums]">
          {month.y}年{month.m + 1}月
        </p>
        <button
          aria-label="次の月"
          onClick={() => moveMonth(1)}
          className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground active:scale-95"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {/* 曜日 */}
      <div className="mt-1 grid grid-cols-7">
        {WEEKDAYS.map((w) => (
          <span
            key={w}
            className="py-0.5 text-center text-[10px] text-muted-foreground"
          >
            {w}
          </span>
        ))}
      </div>

      {/* 日グリッド */}
      <div className="grid grid-cols-7">
        {Array.from({ length: firstDay }).map((_, i) => (
          <span key={`sp-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = dateOf(day);
          const isSelected = date === selectedDate;
          const isToday = date === today;
          const hasRecord = markedDates.has(date);
          return (
            <button
              key={day}
              onClick={() => onSelect(date)}
              className="relative flex h-[26px] items-center justify-center"
            >
              <span
                className={cn(
                  "flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] [font-variant-numeric:tabular-nums]",
                  isSelected
                    ? "bg-primary font-semibold text-primary-foreground"
                    : isToday
                      ? "font-bold text-primary"
                      : "text-foreground"
                )}
              >
                {day}
              </span>
              {hasRecord && !isSelected && (
                <span className="absolute bottom-[1px] h-1 w-1 rounded-full bg-primary/60" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
