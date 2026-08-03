import { useSearchParams } from "react-router-dom";
import BackLink from "@/components/BackLink";

/**
 * サイドバーの「食事 / 筋トレ / 体重」から開く記録ページ。
 *
 * ここは今後、チャット上部のカードをタップして開くページ(MealRecordPage /
 * WorkoutRecordPage)より **さらに詳細な記録** を見せる画面として作り直す。
 * 旧「記録」ページ(手入力フォーム+履歴リスト+削除)は2026-08-03に撤去し、
 * いまは遷移先だけを残した空の状態にしてある。
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
    <div className="animate-fade-in space-y-5 p-4 pb-[max(calc(env(safe-area-inset-bottom,0px)+1rem),1.5rem)] pt-[max(calc(env(safe-area-inset-top,0px)+0.5rem),0.75rem)]">
      <BackLink />
      <header className="px-1">
        <h1 className="text-[28px] leading-[1.14]">{TITLE[tab]}</h1>
      </header>
    </div>
  );
}
