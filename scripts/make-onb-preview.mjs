// オンボーディング確認用プレビューを作る(Artifact専用・アプリ本体には影響しない)
//
//   VITE_SINGLE_FILE=1 VITE_USE_HASH_ROUTER=1 VITE_FORCE_DEMO=1 npm run build
//   node scripts/build-single-html.mjs preview.html
//   node scripts/make-onb-preview.mjs preview.html preview-onb.html
//
// デモビルドは isSupabaseConfigured=false でオンボーディングを素通りするため、
// そのままではアンケート画面をArtifactで開けない。このスクリプトは単一HTMLの末尾に
//   ・初期ハッシュを #/onboarding/purpose にする
//   ・画面下にステップ切替バー(1〜5 / チャット)を出す
// だけを後付けする。通常のアプリ版に戻したいときは preview.html をそのまま publish する。
//
// 6問目(/onboarding/proposal)はEdge Functionを呼ぶためデモでは表示できず、
// 4問目(experience)へリダイレクトされる。1〜5のUI確認用と割り切る。

import { readFileSync, writeFileSync } from "node:fs";

const [, , input = "preview.html", output = "preview-onb.html"] = process.argv;

const STEPS = [
  { label: "1", hash: "#/onboarding/purpose" },
  { label: "2", hash: "#/onboarding/body" },
  { label: "3", hash: "#/onboarding/activity" },
  { label: "4", hash: "#/onboarding/experience" },
  { label: "5", hash: "#/onboarding/timeline" },
  { label: "チャット", hash: "#/" },
];

const addon = `
<style>
#pv-nav{position:fixed;left:50%;bottom:calc(12px + env(safe-area-inset-bottom));
  transform:translateX(-50%);z-index:2147483647;display:flex;gap:4px;padding:4px;
  border-radius:9999px;background:rgba(255,255,255,.92);border:1px solid #e0e0e0;
  box-shadow:0 3px 14px rgba(0,0,0,.07);backdrop-filter:saturate(180%) blur(20px);
  font:500 13px/1 -apple-system,BlinkMacSystemFont,"Hiragino Sans",sans-serif}
#pv-nav button{appearance:none;border:0;background:transparent;color:#1d1d1f;
  min-width:32px;height:32px;padding:0 12px;border-radius:9999px;cursor:pointer;
  white-space:nowrap;flex:none;
  transition:transform .2s cubic-bezier(.32,.72,0,1),background-color .2s cubic-bezier(.32,.72,0,1)}
#pv-nav button:active{transform:scale(.95)}
#pv-nav button[data-on="1"]{background:#0066cc;color:#fff}
</style>
<script>
(function () {
  var steps = ${JSON.stringify(STEPS)};
  if (!location.hash) location.hash = steps[0].hash;
  var nav = document.createElement("div");
  nav.id = "pv-nav";
  var buttons = steps.map(function (s) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = s.label;
    b.addEventListener("click", function () { location.hash = s.hash; });
    nav.appendChild(b);
    return b;
  });
  function sync() {
    var h = location.hash || steps[0].hash;
    buttons.forEach(function (b, i) {
      b.dataset.on = h === steps[i].hash ? "1" : "0";
    });
  }
  addEventListener("hashchange", sync);
  sync();
  document.body.appendChild(nav);
})();
</script>
`;

writeFileSync(output, readFileSync(input, "utf8") + addon);
console.log("書き出しました: " + output);
