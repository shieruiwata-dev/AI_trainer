import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Utensils } from "lucide-react";
import BackLink from "@/components/BackLink";
import { MiniCalendar } from "@/components/MiniCalendar";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabaseConfig";
import { getStore, type DataStore } from "@/lib/store";
import { MEAL_TYPE_LABEL, type MealDetail } from "@/lib/types";
import { cn, todayStr } from "@/lib/utils";

/**
 * サイドバーの「食事 / 筋トレ / 体重」から開く記録ページ。
 * チャット上部のカードを展開したページよりも詳細な記録を見せる。
 * 食事: カレンダー(上部)→ 選んだ日の食事カード(写真+カロリー+PFC、横スワイプ)
 * 筋トレ・体重: これから作る
 */

const TAB_VALUES = ["weight", "meal", "workout"] as const;
type Tab = (typeof TAB_VALUES)[number];

const TITLE: Record<Tab, string> = {
  meal: "食事",
  workout: "筋トレ",
  weight: "体重",
};

export default function Log() {
  // サイドバーのボタン(/log?tab=meal 等)から開く対象を切り替える
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: Tab = TAB_VALUES.includes(tabParam as Tab)
    ? (tabParam as Tab)
    : "weight";

  return (
    <div className="animate-fade-in space-y-4 p-4 pb-[max(calc(env(safe-area-inset-bottom,0px)+1rem),1.5rem)] pt-[max(calc(env(safe-area-inset-top,0px)+0.5rem),0.75rem)]">
      <BackLink />
      <header className="px-1">
        <h1 className="text-[28px] leading-[1.14]">{TITLE[tab]}</h1>
      </header>

      {tab === "meal" ? (
        <MealSection />
      ) : (
        <p className="px-1 text-[15px] text-muted-foreground">
          このページは準備中です。
        </p>
      )}
    </div>
  );
}

/* ===================== 食事 ===================== */

function MealSection() {
  const today = todayStr();
  const [store, setStore] = useState<DataStore | null>(null);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(today);
  const [monthMeals, setMonthMeals] = useState<MealDetail[]>([]);
  // 署名付きURLのキャッシュ(path → url)。日を切り替えても取り直さない
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    getStore().then((s) => {
      if (!cancelled) setStore(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 表示中の月の分だけ取得する(月を切り替えたら取り直し)
  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    store
      .listMealDetailsForMonth(month.y, month.m)
      .then((rows) => {
        if (!cancelled) setMonthMeals(rows);
      })
      .catch(() => {
        if (!cancelled) setMonthMeals([]);
      });
    return () => {
      cancelled = true;
    };
  }, [store, month]);

  const markedDates = useMemo(
    () => new Set(monthMeals.map((m) => m.date)),
    [monthMeals]
  );
  const dayMeals = useMemo(
    () => monthMeals.filter((m) => m.date === selectedDate),
    [monthMeals, selectedDate]
  );

  // 選んだ日の写真だけ署名付きURLを解決する(まとめて1リクエスト)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const paths = dayMeals
      .map((m) => m.imagePath)
      .filter((p): p is string => Boolean(p) && !(p! in imageUrls));
    if (paths.length === 0) return;
    let cancelled = false;
    supabase.storage
      .from("meal-images")
      .createSignedUrls(paths, 60 * 60)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setImageUrls((prev) => {
          const next = { ...prev };
          for (const d of data) {
            if (d.path && d.signedUrl) next[d.path] = d.signedUrl;
          }
          return next;
        });
      })
      .catch(() => {
        /* 写真が出なくても記録表示は続行 */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayMeals]);

  const [m, d] = selectedDate.split("-").slice(1).map(Number);

  return (
    <div className="space-y-4">
      <MiniCalendar
        className="w-full rounded-[18px] px-3 py-3"
        month={month}
        onMonthChange={setMonth}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
        markedDates={markedDates}
        today={today}
      />

      <section>
        <h2 className="px-1 text-[15px] font-semibold text-muted-foreground">
          {m}月{d}日の食事
        </h2>
        {dayMeals.length === 0 ? (
          <div className="mt-2 flex flex-col items-center gap-2.5 rounded-[18px] bg-muted px-6 py-10 text-center">
            <Utensils
              className="h-6 w-6 text-muted-foreground/60"
              strokeWidth={1.8}
            />
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              この日の食事記録はありません。
              <br />
              チャットで食事を送るとここに記録されます。
            </p>
          </div>
        ) : (
          <MealCardCarousel meals={dayMeals} imageUrls={imageUrls} />
        )}
      </section>
    </div>
  );
}

/** 選んだ日の食事カード(横スワイプ)。1枚 = 1食 */
function MealCardCarousel({
  meals,
  imageUrls,
}: {
  meals: MealDetail[];
  imageUrls: Record<string, string>;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // 日を切り替えたら先頭のカードに戻す
  useEffect(() => {
    scrollerRef.current?.scrollTo({ left: 0 });
    setActive(0);
  }, [meals]);

  function onScroll() {
    const el = scrollerRef.current;
    if (!el || el.children.length < 2) return;
    const first = el.children[0] as HTMLElement;
    const second = el.children[1] as HTMLElement;
    const step = second.offsetLeft - first.offsetLeft;
    if (step <= 0) return;
    setActive(
      Math.max(0, Math.min(meals.length - 1, Math.round(el.scrollLeft / step)))
    );
  }

  return (
    <div>
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="no-scrollbar -mx-4 mt-2 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4"
      >
        {meals.map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            imageUrl={meal.imagePath ? imageUrls[meal.imagePath] : undefined}
            solo={meals.length === 1}
          />
        ))}
      </div>
      {meals.length > 1 && (
        <div className="mt-2.5 flex justify-center gap-1.5">
          {meals.map((meal, i) => (
            <span
              key={meal.id}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors duration-300",
                i === active ? "bg-primary" : "bg-[#d6d6db]"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MealCard({
  meal,
  imageUrl,
  solo,
}: {
  meal: MealDetail;
  imageUrl?: string;
  solo: boolean;
}) {
  return (
    <article
      className={cn(
        "shrink-0 snap-start overflow-hidden rounded-[18px] border bg-card",
        solo ? "w-full" : "w-[82%]"
      )}
    >
      {/* 写真(無い記録はプレースホルダーで高さを揃える) */}
      <div className="relative h-44 w-full bg-[#f5f5f7]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={meal.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : meal.imagePath ? (
          // 署名付きURLの解決待ち
          <div className="h-full w-full animate-pulse bg-[#ececf0]" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Utensils
              className="h-7 w-7 text-muted-foreground/40"
              strokeWidth={1.5}
            />
          </div>
        )}
      </div>

      <div className="px-4 pb-4 pt-3">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
            {MEAL_TYPE_LABEL[meal.mealType]}
          </span>
          {meal.time && (
            <span className="text-[12px] text-muted-foreground [font-variant-numeric:tabular-nums]">
              {meal.time}
            </span>
          )}
        </div>

        <p className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug tracking-[-0.01em]">
          {meal.name}
        </p>

        <p className="mt-1.5 [font-variant-numeric:tabular-nums]">
          <span className="text-[26px] font-bold tracking-tight">
            {meal.calories.toLocaleString()}
          </span>
          <span className="ml-1 text-[13px] text-muted-foreground">kcal</span>
        </p>

        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <MacroStat label="タンパク質" value={meal.proteinG} />
          <MacroStat label="脂質" value={meal.fatG} />
          <MacroStat label="炭水化物" value={meal.carbsG} />
        </div>
      </div>
    </article>
  );
}

function MacroStat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-[12px] bg-muted px-1 py-2 text-center">
      <p className="text-[15px] font-semibold [font-variant-numeric:tabular-nums]">
        {value != null ? Math.round(value) : "–"}
        <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">
          g
        </span>
      </p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
