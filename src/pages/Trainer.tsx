import BackLink from "@/components/BackLink";

/**
 * サイドバーの「トレーナー」から開くページ。
 *
 * 中身はこれから作る(トレーナーのタイプ・性別・性格の選択など)。
 * いまは遷移先だけを用意した空の状態。
 */
export default function Trainer() {
  return (
    <div className="animate-fade-in space-y-4 p-4 pb-[max(calc(env(safe-area-inset-bottom,0px)+1rem),1.5rem)] pt-[max(calc(env(safe-area-inset-top,0px)+0.5rem),0.75rem)]">
      <BackLink />
      <header className="px-1">
        <h1 className="text-[28px] leading-[1.14]">トレーナー</h1>
      </header>
    </div>
  );
}
