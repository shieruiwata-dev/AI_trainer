import BackLink from "@/components/BackLink";

/**
 * 目標ページ。
 * PFCカードの「目標」チップから開く(以前は設定画面へ飛んでいた)。
 * 中身は今後の指示で実装するため、いまは枠だけ。
 */
export default function Goal() {
  return (
    <div className="origin-top animate-grow-in space-y-5 p-4 pb-[max(calc(env(safe-area-inset-bottom,0px)+1rem),1.5rem)] pt-[max(calc(env(safe-area-inset-top,0px)+0.5rem),0.75rem)]">
      <BackLink />
      <header className="px-1">
        <h1 className="text-[28px] leading-[1.14]">目標</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          目標の内容と進み具合をここで確認できるようにします。
        </p>
      </header>
    </div>
  );
}
