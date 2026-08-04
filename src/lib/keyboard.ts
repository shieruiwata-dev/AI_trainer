import { useEffect, useState } from "react";

/**
 * ソフトキーボードが出ているかどうか。
 *
 * 入力バーの下には通常、ホームインジケーターを避けるための余白
 * (`env(safe-area-inset-bottom)`、iPhoneで約34px)を入れている。
 * ただしキーボードが出ているときはその領域がキーボードに隠れるため、
 * 余白がそのまま「入力欄とキーボードの間の空白」として見えてしまう。
 * これを検知して、出ている間だけ余白を詰めるために使う。
 *
 * 判定は2つの手がかりを併用する。iOSは表示モードによって挙動が変わるため:
 * - **visualViewport の縮み**: Safariのタブではレイアウトは縮まず
 *   visualViewport だけが縮むので、その差分でキーボードを検知できる
 * - **入力欄のフォーカス**: ホーム画面に追加したPWAではレイアウトごと
 *   縮むため上の差分が出ない。タッチ環境ではフォーカス=キーボード表示とみなす
 */
export function useKeyboardOpen(focused: boolean): boolean {
  const [viewportShrunk, setViewportShrunk] = useState(false);
  const [hasBottomInset, setHasBottomInset] = useState(false);

  // 下部の安全領域が実際にある端末かを一度だけ測る。
  // 無い環境(PC・Artifactプレビュー等)では余白を変えず、無用なズレを防ぐ
  useEffect(() => {
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;left:0;bottom:0;width:0;height:env(safe-area-inset-bottom,0px);pointer-events:none;visibility:hidden";
    document.body.appendChild(probe);
    setHasBottomInset(probe.getBoundingClientRect().height > 0);
    probe.remove();
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      // キーボードに覆われた高さ。レイアウトごと縮む環境では 0 のままになる
      const covered = window.innerHeight - vv.height - vv.offsetTop;
      setViewportShrunk(covered > 80);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  if (!hasBottomInset) return false;
  return viewportShrunk || focused;
}
