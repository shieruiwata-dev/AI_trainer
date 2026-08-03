import { useEffect, useRef } from "react";
import { createTickHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const ITEM_H = 48;
/** 表示する行数(奇数にすると中央が1行に定まる) */
const VISIBLE = 5;
const HEIGHT = ITEM_H * VISIBLE;
const PAD = (HEIGHT - ITEM_H) / 2;

/**
 * 縦スクロールのホイールピッカー(身長入力など)。
 * 中央の行が現在値。上下は薄くフェードし、指を離すと最寄りの行へ吸着する。
 * 行を1つ通過するたびに触覚フィードバック(lib/haptics)を鳴らす。
 */
export function WheelPicker<T extends number | string>({
  items,
  value,
  onChange,
  ariaLabel,
}: {
  items: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hapticRef = useRef<ReturnType<typeof createTickHaptic> | null>(null);
  const lastIndex = useRef(-1);

  useEffect(() => {
    hapticRef.current = createTickHaptic();
    return () => hapticRef.current?.dispose();
  }, []);

  // 外部からの値変更(初期表示・単位切替)をスクロール位置へ反映
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = items.findIndex((i) => i.value === value);
    if (idx < 0) return;
    lastIndex.current = idx;
    const target = idx * ITEM_H;
    if (Math.abs(el.scrollTop - target) >= 1) el.scrollTop = target;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, value]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.max(
      0,
      Math.min(items.length - 1, Math.round(el.scrollTop / ITEM_H))
    );
    if (idx === lastIndex.current) return;
    lastIndex.current = idx;
    hapticRef.current?.tick();
    onChange(items[idx].value);
  }

  const selectedIndex = items.findIndex((i) => i.value === value);

  return (
    <div className="relative" style={{ height: HEIGHT }}>
      {/* 中央の選択枠 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 rounded-[14px] bg-muted"
        style={{ top: PAD, height: ITEM_H }}
      />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="listbox"
        aria-label={ariaLabel}
        className="no-scrollbar relative h-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain"
        // 上下端をフェードさせて回転しているように見せる
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)",
        }}
      >
        <div style={{ paddingTop: PAD, paddingBottom: PAD }}>
          {items.map((item, i) => (
            <div
              key={String(item.value)}
              role="option"
              aria-selected={i === selectedIndex}
              className={cn(
                "flex snap-center items-center justify-center text-[22px] transition-colors",
                i === selectedIndex
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground"
              )}
              style={{ height: ITEM_H }}
            >
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
