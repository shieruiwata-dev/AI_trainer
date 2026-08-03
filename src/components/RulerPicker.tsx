import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createTickHaptic } from "@/lib/haptics";

/**
 * 横スクロールの目盛りピッカー(体重入力など)。
 * 定規を左右にスワイプすると中央の線が指す値が変わる。
 * 目盛りを1つ通過するたびに触覚フィードバック(lib/haptics)を鳴らす。
 * 指を離すと最寄りの目盛りへ吸着する。
 */
export function RulerPicker({
  value,
  min,
  max,
  step = 0.1,
  mediumEvery = 0.5,
  majorEvery = 1,
  pxPerStep = 8,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  /** 最小目盛り(1マス)の値幅 */
  step?: number;
  /** 中目盛り・大目盛りの間隔(値) */
  mediumEvery?: number;
  majorEvery?: number;
  /** 1マスの幅(px)。大きいほどゆっくり動く */
  pxPerStep?: number;
  onChange: (value: number) => void;
  ariaLabel?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hapticRef = useRef<ReturnType<typeof createTickHaptic> | null>(null);
  const steps = Math.round((max - min) / step);
  const lastIndex = useRef(clampIndex(Math.round((value - min) / step), steps));
  const settleTimer = useRef<number | null>(null);

  // 端の値でも中央線に合わせられるよう、左右にコンテナ半分の余白を敷く
  const [pad, setPad] = useState(0);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setPad(el.clientWidth / 2);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 外部からの値変更(初期表示・単位切替)をスクロール位置へ反映
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || pad === 0) return;
    const idx = clampIndex(Math.round((value - min) / step), steps);
    lastIndex.current = idx;
    const target = idx * pxPerStep;
    if (Math.abs(el.scrollLeft - target) >= 1) el.scrollLeft = target;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pad, min, max, step, pxPerStep]);

  useEffect(() => {
    hapticRef.current = createTickHaptic();
    return () => hapticRef.current?.dispose();
  }, []);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const idx = clampIndex(Math.round(el.scrollLeft / pxPerStep), steps);
    if (idx !== lastIndex.current) {
      lastIndex.current = idx;
      hapticRef.current?.tick();
      onChange(round1(min + idx * step));
    }
    // 慣性が止まったら最寄りの目盛りへ吸着させる
    if (settleTimer.current !== null) clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      const target = lastIndex.current * pxPerStep;
      if (Math.abs(el.scrollLeft - target) > 0.5) {
        el.scrollTo({ left: target, behavior: "smooth" });
      }
    }, 140);
  }

  const stripWidth = steps * pxPerStep + 2;
  const mediumPx = (mediumEvery / step) * pxPerStep;
  const majorPx = (majorEvery / step) * pxPerStep;
  const tickGrad = (color: string, period: number) =>
    `repeating-linear-gradient(90deg, ${color} 0 2px, transparent 2px ${period}px)`;

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="slider"
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        className="no-scrollbar overflow-x-auto overscroll-x-contain"
      >
        <div style={{ paddingLeft: pad, paddingRight: pad }}>
          {/* 目盛り: 小(step)・中(mediumEvery)・大(majorEvery)を重ねる */}
          <div className="relative h-16" style={{ width: stripWidth }}>
            <div
              className="absolute inset-x-0 bottom-0 h-7"
              style={{ backgroundImage: tickGrad("#c6c6c8", pxPerStep) }}
            />
            <div
              className="absolute inset-x-0 bottom-0 h-10"
              style={{ backgroundImage: tickGrad("#a8a8ac", mediumPx) }}
            />
            <div
              className="absolute inset-x-0 bottom-0 h-14"
              style={{ backgroundImage: tickGrad("#6e6e73", majorPx) }}
            />
          </div>
        </div>
      </div>
      {/* 現在値を指す中央の線 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-3 bottom-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-foreground"
      />
    </div>
  );
}

const clampIndex = (idx: number, max: number) =>
  Math.max(0, Math.min(max, idx));
const round1 = (n: number) => Math.round(n * 10) / 10;
