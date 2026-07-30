// トレーナーの全身画像(originals/)から、顔まわりの正方形アイコンを書き出す。
//
//   cd <作業dir> && npm i sharp     # リポジトリのpackage.jsonには追加しない(e2eと同じ方針)
//   node scripts/crop-trainer-avatars.mjs
//
// 顔の位置を変えたいときは JOBS の cx / cy / size を調整して再実行する。
//   cx, cy = 顔の中心(cx は画像幅、cy は画像高さに対する割合)
//   size   = 切り出す一辺(画像幅に対する割合)。小さくすると顔に寄る
// 丸く表示されるので、顔がなるべく中央に来るようにする。
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error("sharp が見つかりません。作業ディレクトリで `npm i sharp` を実行してください。");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "src/assets/trainers");

const JOBS = [
  { src: "flow-source.png", id: "flow", cx: 0.467, cy: 0.195, size: 0.28 },
  { src: "fresh-source.png", id: "fresh", cx: 0.514, cy: 0.105, size: 0.32 },
  { src: "power-source.png", id: "power", cx: 0.443, cy: 0.109, size: 0.3 },
  { src: "hard-source.png", id: "hard", cx: 0.44, cy: 0.09, size: 0.28 },
];

for (const j of JOBS) {
  const src = join(dir, "originals", j.src);
  const { width: W, height: H } = await sharp(src).metadata();
  const side = Math.round(W * j.size);
  // 画像からはみ出さないよう収める
  const left = Math.max(0, Math.min(Math.round(W * j.cx - side / 2), W - side));
  const top = Math.max(0, Math.min(Math.round(H * j.cy - side / 2), H - side));
  await sharp(src)
    .extract({ left, top, width: side, height: side })
    .resize(256, 256, { fit: "cover" })
    // 元画像は背景が白。透過があっても白で埋めて丸の中を濁らせない
    .flatten({ background: "#ffffff" })
    .webp({ quality: 88 })
    .toFile(join(dir, `${j.id}.webp`));
  console.log(`${j.id}.webp <- ${j.src} (${side}px @ ${left},${top})`);
}
