# マイサポ(My Supporter)— AIトレーナーアプリ(作業ガイド)

AIトレーナーとチャットしながらダイエット・筋トレを記録するモバイルファーストアプリ。
**正式名称は「マイサポ」(My Supporter の略。2026-07-30決定)**。旧称 FitCoach の表記が
コード内(localStorageキー `fitcoach.*` 等)に残るが、これは互換のため変更しない。
**詳細な引き継ぎ情報は `docs/handover.md` を必ず読むこと。** バックエンド仕様は `docs/ai-spec.md`。

## 役割分担(厳守)

- **Claude(このリポジトリでの作業)**: `src/` のUI全般(画面・コンポーネント・スタイル・アニメーション)
- **柴崎さん(Lovable側で作業)**: Supabase・Dify・Edge Functions(`supabase/`)、認証、バックエンド連携

## リポジトリとブランチ

- 作業リポジトリ: `shieruiwata-dev/AI_trainer`、ブランチ `claude/ai-trainer-diet-app-yq6ool`(通常のプッシュ先は**ここだけ**)
- Lovable連携リポジトリ: `shieruiwata-dev/ai-trainer-duo` の `main`(リモート名 `lovable`)
  - **ユーザーが「同期して」と言ったときだけプッシュする。それ以外は絶対に触らない**
  - 同期手順: `git fetch lovable main` → 柴崎さんの変更があればマージ(UIの競合はこちらの実装を優先、バックエンドは柴崎さん優先)→ ビルド確認 → 両リポジトリへプッシュ

## 作業サイクル(毎回)

1. 実装 → `npm run build` で型チェック
2. プレビュー用単一HTMLをビルドして **Artifactを更新**(必ず同じURLを維持):
   ```bash
   VITE_SINGLE_FILE=1 VITE_USE_HASH_ROUTER=1 VITE_FORCE_DEMO=1 npm run build
   node scripts/build-single-html.mjs <出力先>.html
   # Artifact URL(既存を更新): https://claude.ai/code/artifact/dbb00a75-0aab-4c15-8b13-18bae0a6dd53
   # 新しい会話からは Artifact ツールに url を渡さないと別URLになるので注意
   # 「別セッションの版を見ていない」エラーが出たら、先に WebFetch で上記URLを読んでから再実行
   ```
3. 実データでの動作確認は `scripts/e2e/` 参照(テストアカウントでSupabase直結)
4. スクリーンショットをユーザーに送付 → コミット → `git push origin claude/ai-trainer-diet-app-yq6ool`

## デザイン原則(Apple風・確立済み)

- 単一アクセント **Action Blue #0066cc**。面は白 #fff / パーチメント #f5f5f7、インク #1d1d1f、ヘアライン #e0e0e0
- カード: 18px角丸+ヘアライン。影はチャット上部のスワイプカードのみ(0_3px_14px_rgba(0,0,0,0.07))
- ボタンはピル型+押下時 `active:scale-95`。アニメーションは `ease-ios`(cubic-bezier(0.32,0.72,0,1))
- フォント: Apple端末はSF Pro+ヒラギノ、他環境は同梱の Inter + Noto Sans JP サブセット(`src/fonts.css`)
- ユーザーの指示があるまで既存デザインを勝手に変えない

## 重要な環境情報

- Supabase接続は `src/integrations/supabase/client.ts` にハードコード(柴崎さん管理・編集禁止)
- `VITE_FORCE_DEMO=1` = Artifactプレビュー用(認証スキップ+デモ応答+ローカル保存)。本番/Lovableには無関係
- この開発環境のネットワークは `*.supabase.co` 許可済み。curl はプロキシ経由で直接可、
  Playwright の Chromium は直接HTTPS不可 → `scripts/e2e/` の undici リレー方式を使う
