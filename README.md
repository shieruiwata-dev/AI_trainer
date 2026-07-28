# FitCoach — AIトレーナーアプリ

AIトレーナーとチャットしながら、ダイエット・筋トレの記録とモチベーション維持をサポートするアプリです。

## 構成

| 領域 | ツール | 役割 |
| --- | --- | --- |
| フロントエンド | Lovable(このリポジトリ) | UI・画面。Vite + React + TypeScript + Tailwind + shadcn/ui |
| データ保存 | Supabase | 体重・食事・筋トレ記録、プロフィール(匿名認証 + RLS) |
| AIチャット | Dify | AIトレーナーの会話エンジン(Supabase Edge Function 経由で接続) |

## 機能

- 🏠 **ホーム** — 連続記録日数(ストリーク)、今日のカロリー・運動、体重推移グラフ、目標達成率、今日のひとこと
- 💬 **AIトレーナー** — チャットで食事・筋トレ・モチベーションの相談(ストリーミング応答)。ユーザーの目標や今日の記録をコンテキストとして自動送信
- 📋 **記録** — 体重 / 食事(カロリー・たんぱく質)/ 筋トレをタブで簡単入力
- ⚙️ **設定** — ニックネーム・目標タイプ・目標体重・目標カロリーの設定、接続状態の確認

## 動作モード

バックエンドが未接続でも動くように作られています(Lovable プレビューでそのまま確認可能)。

| 状態 | データ保存 | AIチャット |
| --- | --- | --- |
| 環境変数なし | ローカルストレージ | デモモード(定型応答) |
| Supabase 設定済み | Supabase(匿名認証) | Edge Function `dify-chat` 経由で Dify |
| Dify 直接設定(開発用) | — | Dify API に直接接続 ※本番禁止 |

## セットアップ(フロントエンド)

```bash
npm install
npm run dev   # http://localhost:8080
```

Supabase に接続する場合は `.env.example` をコピーして `.env` を作成:

```bash
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## セットアップ(バックエンド担当者向け)

手順の詳細は [docs/backend-setup.md](docs/backend-setup.md) を参照してください。概要:

1. **Supabase**: `supabase/migrations/20260728000000_init.sql` を SQL Editor で実行し、Anonymous Sign-ins を有効化
2. **Dify**: チャットボットアプリを作成(会話変数 `context` を定義)、API キーを発行
3. **Edge Function**: `supabase/functions/dify-chat` をデプロイし、`DIFY_API_KEY` / `DIFY_API_URL` をシークレットに設定

## ディレクトリ構成

```
src/
  pages/          # 画面(Dashboard / Chat / Log / Settings)
  components/     # UIコンポーネント(shadcn/ui ベース)
  hooks/          # useAppData(データ読み込み・集計)
  lib/
    store.ts      # データ保存層(Supabase ⇔ ローカルストレージ自動切替)
    trainer.ts    # AIトレーナー接続層(Edge Function / Dify / デモ)
    types.ts      # 型定義
  integrations/
    supabase/     # Supabase クライアント
supabase/
  migrations/     # テーブル定義 SQL(バックエンド担当者が適用)
  functions/
    dify-chat/    # Dify 中継 Edge Function(バックエンド担当者がデプロイ)
```
