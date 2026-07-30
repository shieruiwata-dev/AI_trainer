# E2E検証(実データ・実Supabase接続)

Claude Code の開発環境内で、テストアカウントを使って実際のSupabaseデータで
UIの動作確認・スクリーンショット撮影を行う手順。

## 前提: この環境のネットワーク事情

- 外向きHTTPSはすべてプロキシ経由(`HTTPS_PROXY` 設定済み、`*.supabase.co` 許可済み)
- curl や Node(undici)はそのまま通る。ただし `NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt` が必要
- **PlaywrightのChromiumはプロキシ経由のHTTPSに直接繋げない**(ERR_CONNECTION_RESET)。
  また `file://` で開くと fetch 自体が失敗する
- 対策: ローカルHTTPサーバーで配信 + `page.route(/supabase\.co/)` で捕捉 +
  undici の `fetch` + `ProxyAgent` でリレー(`verify-template.mjs` 参照)

## 手順

```bash
# 0) 作業ディレクトリ(scratchpad等)に依存を用意(初回のみ)
npm i playwright-core undici   # リポジトリのpackage.jsonには追加しない

# 1) 実接続ビルド(FORCE_DEMOは付けない)→ 単一HTML化
VITE_SINGLE_FILE=1 VITE_USE_HASH_ROUTER=1 npm run build
node scripts/build-single-html.mjs <作業dir>/app.html

# 2) ローカル配信(背景実行)
cd <作業dir> && python3 -m http.server 8788 &

# 3) 検証スクリプト実行
NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt \
  node scripts/e2e/verify-template.mjs
```

## テストアカウント

- **ID: test@test.com / Pass: 123456**
- シード済みデータ: goal(60kg / 1650kcal / PFC 124/46/186g / 目標日+60日)、
  食事6件(4日分)、体重8件(約2週間)、workout_sessions 4件(肩・胸・脚・背中、focus_area付)
  + workout_sets 計18セット

## シードデータの投入方法

Supabase REST API を curl で直接叩く(anonキーは `src/integrations/supabase/client.ts` にある)。

```bash
# ログインしてアクセストークンを取得
curl -s "https://lrkbusyjbstspebzvcdv.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
# 以降 -H "Authorization: Bearer $ACCESS_TOKEN" -H "apikey: $ANON_KEY" で
# /rest/v1/meals 等へPOST(RLSがあるので必ず本人トークンで)
```

## ハマりどころ(実際に踏んだもの)

- undici のリレーでは **undici 自身の `fetch` を import して使う**。グローバル fetch と混ぜると
  "invalid onRequestStart method" で落ちる
- python http.server は charset ヘッダを返さないが、単一HTMLに `<meta charset="utf-8">` を
  注入済みなので文字化けしない
- `vite preview` はこの環境ではIPv6が使えず `EAFNOSUPPORT ::` になる → `--host 127.0.0.1`
- Artifactサンドボックスでは `confirm()` がブロックされる(アプリ側は2段階タップ確認で回避済み)
