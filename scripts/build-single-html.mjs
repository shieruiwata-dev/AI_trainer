// ビルド成果物(dist/)の JS と CSS を1枚の HTML に埋め込むスクリプト。
// Artifact プレビューなど、単一ファイルでアプリを配布したいときに使う。
//   VITE_SINGLE_FILE=1 VITE_USE_HASH_ROUTER=1 VITE_FORCE_DEMO=1 npm run build \
//     && node scripts/build-single-html.mjs <出力先>
// VITE_FORCE_DEMO=1: 外部通信できないプレビュー環境向けに認証スキップ+デモ応答+ローカル保存
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.cwd(), "dist");
const assets = join(dist, "assets");
const out = process.argv[2] ?? join(dist, "single.html");

const files = readdirSync(assets);
const jsFile = files.find((f) => f.endsWith(".js"));
const cssFile = files.find((f) => f.endsWith(".css"));
if (!jsFile || !cssFile) {
  throw new Error("dist/assets に JS/CSS が見つかりません。先に npm run build を実行してください。");
}

const js = readFileSync(join(assets, jsFile), "utf8")
  // インラインscript内で </script> が現れると HTML が壊れるためエスケープ
  .replaceAll("</script", "<\\/script");
const css = readFileSync(join(assets, cssFile), "utf8");

const html = `<meta charset="utf-8">
<title>FitCoach — AIトレーナー</title>
<script>
// iPhoneのノッチ/ホームインジケーター対応: env(safe-area-inset-*) を有効化
(function () {
  var content = "width=device-width, initial-scale=1.0, viewport-fit=cover";
  var m = document.querySelector('meta[name="viewport"]');
  if (m) m.setAttribute("content", content);
  else {
    m = document.createElement("meta");
    m.name = "viewport";
    m.content = content;
    document.head.appendChild(m);
  }
})();
</script>
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${js}
</script>
`;

writeFileSync(out, html);
console.log(`書き出しました: ${out} (${Math.round(html.length / 1024)} KB)`);
