/**
 * 目盛りを1つ通過するたびに鳴らす短い触覚フィードバック(コツッ)。
 *
 * - Android(Chrome等): navigator.vibrate で直接鳴らす
 * - iPhone(Safari/PWA): Webからバイブを鳴らす標準APIが無いため、
 *   iOS 17.4+ のスイッチ型チェックボックス(<input type="checkbox" switch>)が
 *   トグル時に鳴らすシステムHapticを流用する(画面外の隠しスイッチをclickする)。
 *   それ以前のiOSでは無音・無振動のまま動作に影響しない
 */
export function createTickHaptic(): { tick: () => void; dispose: () => void } {
  const canVibrate = "vibrate" in navigator;
  let switchEl: HTMLInputElement | null = null;
  if (!canVibrate) {
    switchEl = document.createElement("input");
    switchEl.type = "checkbox";
    switchEl.setAttribute("switch", "");
    switchEl.tabIndex = -1;
    switchEl.setAttribute("aria-hidden", "true");
    switchEl.style.cssText =
      "position:fixed;left:-100px;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
    document.body.appendChild(switchEl);
  }

  let lastAt = 0;
  return {
    tick() {
      // 高速スクロールで鳴らしすぎない程度に間引く
      const now = Date.now();
      if (now - lastAt < 25) return;
      lastAt = now;
      if (canVibrate) navigator.vibrate?.(4);
      else switchEl?.click();
    },
    dispose() {
      switchEl?.remove();
      switchEl = null;
    },
  };
}
