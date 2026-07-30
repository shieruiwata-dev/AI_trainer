// 実データE2E検証テンプレート(Playwright + undici リレー方式)
//
// この開発環境の Chromium はプロキシ経由のHTTPSに直接繋げないため、
// supabase.co へのリクエストを page.route で捕まえ、undici(プロキシ対応)で
// 中継する。手順の全体像は同ディレクトリの README.md を参照。
//
// 使い方:
//   1. 実接続ビルド: VITE_SINGLE_FILE=1 VITE_USE_HASH_ROUTER=1 npm run build
//      node scripts/build-single-html.mjs <dir>/app.html
//   2. 配信: (cd <dir> && python3 -m http.server 8788) を背景で起動
//   3. NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node scripts/e2e/verify-template.mjs
//
// ※ playwright-core と undici は作業ディレクトリに npm i しておくこと(リポジトリのdepsには含めない)

import { chromium } from "playwright-core";
import { fetch as ufetch, ProxyAgent } from "undici";

const APP_URL = process.env.APP_URL ?? "http://127.0.0.1:8788/app.html";
const TEST_EMAIL = "test@test.com";
const TEST_PASSWORD = "123456";

const dispatcher = new ProxyAgent(process.env.HTTPS_PROXY);
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
});
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone サイズ
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

// supabase.co へのリクエストを undici(プロキシ経由)でリレーする。
// undici のバージョン不整合を避けるため、必ず undici 自身の fetch を使うこと
// (グローバル fetch を使うと "invalid onRequestStart method" で落ちる)。
await page.route(/supabase\.co/, async (route) => {
  const req = route.request();
  try {
    const h = { ...req.headers() };
    delete h.host;
    delete h.connection;
    delete h["content-length"];
    delete h["accept-encoding"];
    const res = await ufetch(req.url(), {
      method: req.method(),
      headers: h,
      body: ["GET", "HEAD"].includes(req.method())
        ? undefined
        : req.postDataBuffer(),
      dispatcher,
    });
    const body = Buffer.from(await res.arrayBuffer());
    const headers = {};
    res.headers.forEach((v, k) => {
      if (!["content-encoding", "content-length", "transfer-encoding"].includes(k))
        headers[k] = v;
    });
    await route.fulfill({ status: res.status, headers, body });
  } catch {
    await route.abort();
  }
});

await page.goto(APP_URL, { waitUntil: "load" });
await page.waitForTimeout(1500);

// テストアカウントでログイン(既にセッションがあればフォームは出ない)
if (await page.locator("#email").count()) {
  await page.fill("#email", TEST_EMAIL);
  await page.fill("#password", TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForSelector("textarea", { timeout: 30000 });
}
await page.waitForTimeout(2500); // 初期データ読み込み待ち

// ===== ここから検証したい操作を書く(以下は例) =====

// 例: 上部カードを筋トレ側へスワイプして記録ページを開く
// const carousel = page.locator(".snap-x").first();
// await carousel.evaluate((el) => el.scrollTo({ left: el.clientWidth + 12 }));
// await page.waitForTimeout(400);
// await page.click('[aria-label="筋トレ記録ページを開く"]');
// await page.waitForTimeout(800);

await page.screenshot({ path: "e2e-1.png" });

console.log("errors:", errors.length ? errors : "none");
await browser.close();
