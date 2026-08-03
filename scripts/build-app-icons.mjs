// マイサポのアプリアイコン(採用案 G-2)を各サイズへ書き出す。
//
//   cd <作業dir> && npm i sharp   # リポジトリのpackage.jsonには追加しない(e2eと同じ方針)
//   node scripts/build-app-icons.mjs
//
// デザインを変えたいときは下の icon() のパス座標を直して再実行する。
//   public/icon-192.png / icon-512.png / apple-touch-icon.png (180px) / favicon.svg
// ホーム画面アイコンはOS側が角丸を付けるため、書き出しは「角丸なしの正方形」にする。
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error("sharp が見つかりません。作業ディレクトリで `npm i sharp` を実行し、"
    + "NODE_PATH=<作業dir>/node_modules を付けて実行してください。");
  process.exit(1);
}

const BLUE = "#0066cc";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "../public");

/**
 * 採用デザイン(G-2): 片手を高く突き上げ、もう片方の拳は腰の横。
 * 突き上げた拳の上に気合いの放射線。
 * @param radius 角の丸み。0=正方形(ホーム画面用) / 116=プレビュー用
 */
function icon({ size = 512, radius = 0, fg = "#ffffff", bg = BLUE, uid = "i" }) {
  // 512基準で描いて viewBox で任意サイズへ拡縮する
  const S = 512;
  const r = (radius / 512) * S;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${S} ${S}">
  <defs>
    <clipPath id="clip-${uid}"><rect width="${S}" height="${S}" rx="${r}"/></clipPath>
  </defs>
  <rect width="${S}" height="${S}" rx="${r}" fill="${bg}"/>
  <g clip-path="url(#clip-${uid})">
    <g fill="${fg}">
      <!-- 頭(突き上げた拳の方へ少し傾ける) -->
      <ellipse cx="240" cy="168" rx="55" ry="62" transform="rotate(6 240 168)"/>
      <!-- 首 -->
      <path d="M 214 212 L 270 212 L 264 256 L 220 256 Z"/>
      <!-- 胴体 -->
      <path d="M 158 286
               Q 160 264 186 256
               L 300 256
               Q 328 264 332 288
               L 338 512 L 166 512 Z"/>
      <!-- 右腕(突き上げ) -->
      <path d="M 312 278 Q 380 262 402 216" fill="none" stroke="${fg}" stroke-width="54" stroke-linecap="round"/>
      <path d="M 402 216 L 390 122" fill="none" stroke="${fg}" stroke-width="46" stroke-linecap="round"/>
      <circle cx="388" cy="104" r="40"/>
      <circle cx="355" cy="120" r="15"/>
      <!-- 左腕(拳を腰の横で握る) -->
      <path d="M 176 280 Q 118 306 106 358" fill="none" stroke="${fg}" stroke-width="50" stroke-linecap="round"/>
      <path d="M 106 358 L 116 390" fill="none" stroke="${fg}" stroke-width="42" stroke-linecap="round"/>
      <!-- 気合いの放射線 -->
      <g stroke="${fg}" stroke-width="17" stroke-linecap="round" fill="none">
        <line x1="322" y1="58" x2="302" y2="30"/>
        <line x1="386" y1="44" x2="386" y2="12"/>
        <line x1="448" y1="60" x2="464" y2="36"/>
      </g>
    </g>
    <!-- 左の拳は胴体と重なるため、背景色の下敷きで分離してから描く -->
    <circle cx="136" cy="420" r="46" fill="${bg}"/>
    <g fill="${fg}">
      <circle cx="136" cy="420" r="36"/>
      <circle cx="170" cy="406" r="14"/>
    </g>
  </g>
</svg>`;
}

// PWA / ホーム画面用(角丸なし)
for (const [name, size] of [
  ["icon-512.png", 512],
  ["icon-192.png", 192],
  ["apple-touch-icon.png", 180],
]) {
  await sharp(Buffer.from(icon({ size, uid: name })), { density: 300 })
    .resize(size, size)
    .png()
    .toFile(`${OUT}/${name}`);
  console.log(`${name} (${size}px)`);
}

// favicon はブラウザのタブで小さく出るので角丸あり
writeFileSync(`${OUT}/favicon.svg`, icon({ size: 64, radius: 116, uid: "fav" }));
console.log("favicon.svg");
