# バックエンドセットアップ手順(Supabase / Dify 担当者向け)

フロントエンドは実装済みです。以下の3ステップでバックエンドを接続すると、
ローカル保存・デモモードから本番モードに自動で切り替わります。

## 1. Supabase プロジェクトの設定

### 1-1. テーブル作成

Supabase ダッシュボード → SQL Editor で
[`supabase/migrations/20260728000000_init.sql`](../supabase/migrations/20260728000000_init.sql)
の内容を実行してください。作成されるもの:

- `profiles` — プロフィール・目標(user_id が主キー)
- `weight_logs` — 体重記録
- `meal_logs` — 食事記録(カロリー・たんぱく質)
- `workout_logs` — トレーニング記録
- 各テーブルの RLS ポリシー(本人のデータのみ読み書き可)

### 1-2. 匿名認証の有効化

フロントは **匿名認証(Anonymous Sign-ins)** でユーザーを識別します。

- ダッシュボード → Authentication → Sign In / Providers → **Anonymous Sign-ins を ON**

※ 将来メール認証等に移行する場合も、`auth.users` ベースなのでデータ構造の変更は不要です。

### 1-3. フロントに渡す値

Lovable(またはローカルの `.env`)に以下を設定してもらってください:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```

## 2. Dify アプリの作成

1. Dify で **チャットボット(Chatflow / Agent どちらでも可)** アプリを作成
2. プロンプトの方針(例):
   - 役割: 親しみやすいパーソナルトレーナー。日本語で回答
   - ダイエット・筋トレ・栄養・モチベーション維持の専門家として、具体的で実行しやすいアドバイスをする
   - 医学的診断はせず、必要に応じて医療機関の受診を勧める
3. **入力変数 `context`(段落テキスト・任意)を定義**してください。
   フロントが毎回のメッセージに以下のようなユーザー状況を入れて送ります:

   ```
   目標: ダイエット(減量) / 現在の体重: 65kg / 目標体重: 58kg /
   1日の目標カロリー: 1800kcal / 今日の摂取カロリー: 1200kcal /
   今日のトレーニング記録数: 1件 / 連続記録日数: 5日
   ```

   プロンプト内で `{{context}}` を参照し、「ユーザーの現在の状況」として扱ってください。
4. アプリの **API キー(`app-` で始まる)** を発行

## 3. Edge Function(dify-chat)のデプロイ

Dify の API キーをブラウザに晒さないための中継プロキシです。
コードは [`supabase/functions/dify-chat/index.ts`](../supabase/functions/dify-chat/index.ts)。

```bash
# Supabase CLI で
supabase link --project-ref <project-ref>
supabase secrets set DIFY_API_KEY=app-xxxxxxxxxxxx
supabase secrets set DIFY_API_URL=https://api.dify.ai/v1   # セルフホストなら自分のURL
supabase functions deploy dify-chat
```

デプロイ後、フロントは `https://<project-ref>.supabase.co/functions/v1/dify-chat`
に対して自動で接続します(`VITE_SUPABASE_URL` が設定されていれば追加設定は不要)。

### 動作確認

```bash
curl -N -X POST "https://<project-ref>.supabase.co/functions/v1/dify-chat" \
  -H "Authorization: Bearer <anon key>" \
  -H "Content-Type: application/json" \
  -d '{"query": "こんにちは", "inputs": {"context": "目標: ダイエット"}, "user": "test"}'
```

SSE ストリーム(`data: {"event":"message",...}`)が返れば成功です。

## フロント側の接続仕様(参考)

- リクエスト: `POST /functions/v1/dify-chat`
  - ヘッダー: `Authorization: Bearer <ユーザーのアクセストークン or anon key>`
  - ボディ: `{ query, inputs: { context }, conversation_id, user }`
- レスポンス: Dify の SSE ストリームをそのまま中継
  - `event: "message"` の `answer` を連結して表示
  - `event: "message_end"` の `conversation_id` を保存して会話を継続
