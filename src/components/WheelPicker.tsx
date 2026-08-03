import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { createTickHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const ITEM_H = 44;
/** 表示する行数(奇数にすると中央が1行に定まる) */
const VISIBLE = 7;
const HEIGHT = ITEM_H * VISIBLE;
const PAD = (HEIGHT - ITEM_H) / 2;

/** 1行あたりの回転角。iOSのピッカーに近い見え方になる値 */
const ANGLE = 18;
/** 隣り合う行がちょうど ITEM_H ぶん離れて見える円柱の半径 */
const RADIUS = ITEM_H / (2 * Math.tan((ANGLE * Math.PI) / 180 / 2));
/** 真横(90°)を超えた行は裏側なので描かない */
const MAX_OFFSET = 90 / ANGLE;

/**
 * iOSのピッカー(UIPickerView)風のホイール。
 * 行を円柱の側面に並べ、スクロール量に応じて3D回転させる。
 * 中央の行が現在値。指を離すと最寄り行へ吸着し、行を通過するたびに
 * 触覚フィードバック(lib/haptics)を鳴らす。
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
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hapticRef = useRef<ReturnType<typeof createTickHaptic> | null>(null);
  const lastIndex = useRef(-1);
  const rafId = useRef<number | null>(null);

  /** スクロール位置(小数)から各行の3D姿勢を決める */
  const paint = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const frac = el.scrollTop / ITEM_H;
    for (let i = 0; i < itemRefs.current.length; i++) {
      const node = itemRefs.current[i];
      if (!node) continue;
      const offset = i - frac;
      if (Math.abs(offset) > MAX_OFFSET) {
        node.style.visibility = "hidden";
        continue;
      }
      node.style.visibility = "visible";
      node.style.transform = `rotateX(${-offset * ANGLE}deg) translateZ(${RADIUS}px)`;
      // 中央から離れるほど薄く(円柱の奥へ回り込む表現)
      node.style.opacity = String(Math.max(0, 1 - Math.abs(offset) / 4.2));
    }
  }, []);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;
        paint();
      });
    }
    const idx = Math.max(
      0,
      Math.min(items.length - 1, Math.round(el.scrollTop / ITEM_H))
    );
    if (idx === lastIndex.current) return;
    lastIndex.current = idx;
    hapticRef.current?.tick();
    onChange(items[idx].value);
  }

  useEffect(() => {
    hapticRef.current = createTickHaptic();
    return () => {
      hapticRef.current?.dispose();
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, []);

  // 外部からの値変更(初期表示・単位切替)をスクロール位置へ反映
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = items.findIndex((i) => i.value === value);
    if (idx < 0) return;
    lastIndex.current = idx;
    const target = idx * ITEM_H;
    if (Math.abs(el.scrollTop - target) >= 1) el.scrollTop = target;
    paint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, value, paint]);

  const selectedIndex = items.findIndex((i) => i.value === value);

  return (
    <div
      className="relative"
      style={{ height: HEIGHT }}
      role="listbox"
      aria-label={ariaLabel}
    >
      {/* 中央の選択枠 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 rounded-[12px] bg-muted"
        style={{ top: PAD, height: ITEM_H }}
      />

      {/* 円柱に並べた行(表示専用。操作は下のスクロール層が受ける) */}
      <div
        aria-hidden={false}
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ perspective: 900, perspectiveOrigin: "50% 50%" }}
      >
        <div
          className="absolute inset-0"
          style={{ transformStyle: "preserve-3d" }}
        >
          {items.map((item, i) => (
            <div
              key={String(item.value)}
              ref={(el) => (itemRefs.current[i] = el)}
              role="option"
              aria-selected={i === selectedIndex}
              className={cn(
                "absolute inset-x-0 flex items-center justify-center text-[22px] [backface-visibility:hidden]",
                i === selectedIndex
                  ? "font-semibold text-foreground"
                  : "text-foreground/70"
              )}
              style={{ top: PAD, height: ITEM_H, visibility: "hidden" }}
            >
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* スクロールを受ける透明な層(慣性・吸着は端末ネイティブに任せる) */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        aria-hidden
        className="no-scrollbar absolute inset-0 snap-y snap-mandatory overflow-y-auto overscroll-y-contain"
      >
        <div style={{ paddingTop: PAD, paddingBottom: PAD }}>
          {items.map((item) => (
            <div
              key={String(item.value)}
              className="snap-center"
              style={{ height: ITEM_H }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
