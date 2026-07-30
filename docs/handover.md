# 引き継ぎ資料(セッション移行用)

新しいセッションで違和感なく作業を続けるための詳細ドキュメント。
まず `CLAUDE.md`(役割分担・同期ルール・作業サイクル)を読み、次にこのファイルを読むこと。
バックエンド仕様(Dify応答形式・Supabaseスキーマ・Edge Functions)は `docs/ai-spec.md`。

---

## 1. プロジェクト概要

- **アプリ**: AIトレーナーとチャットしながらダイエット・筋トレのサポート・記録・モチベーション管理を行うスマホアプリ(FitCoach)
- **ユーザー(依頼者)**: 岩田さん。日本語でやり取り。スクリーンショット+要望を送ってくる形で進行
- **分担**: Claude = `src/` のUI全般(主開発者)。柴崎さん = Lovable側でSupabase・Dify・Edge Functions(`supabase/`)・認証まわり
- **技術**: Vite + React 18 + TypeScript + Tailwind 3(HSLトークン)+ recharts + sonner + lucide-react。一部Radix

## 2. リポジトリ・同期(最重要ルール)

- 作業先: `shieruiwata-dev/AI_trainer` ブランチ `claude/ai-trainer-diet-app-yq6ool`(origin)。通常のプッシュはここだけ
- Lovable連携: `shieruiwata-dev/ai-trainer-duo` の `main`(リモート名 `lovable`)
  - **ユーザーが「同期して」と言ったときだけ** fetch → マージ → 両方へプッシュ。
    それ以外で lovable に触るとデータが壊れると明言されている。**絶対に勝手にプッシュしない**
  - マージ競合の方針: UI(`src/` の画面・コンポーネント)はこちらの実装を優先(`git checkout --ours`)、
    `supabase/` やバックエンド接続コードは柴崎さん側を優先。過去に ChatActionCard が二重実装になった際も
    こちらの承認済みデザインを残し、柴崎さんの `aiChat.ts` ヘルパー(payloadRows / sanitizeAssistantText など)は採用した
- 最終同期時点(2026-07-30)で両リポジトリは完全に同期済み(コミット 8971040)

## 3. プレビュー(Artifact)

- ユーザーはArtifact(スマホサイズの単一HTML)で確認する。**URLを変えないこと**:
  `https://claude.ai/code/artifact/dbb00a75-0aab-4c15-8b13-18bae0a6dd53`
  → 新セッションでは Artifact ツールに `url` パラメータを渡さないと別URLが発行されてしまう
- ビルド手順:
  ```bash
  VITE_SINGLE_FILE=1 VITE_USE_HASH_ROUTER=1 VITE_FORCE_DEMO=1 npm run build
  node scripts/build-single-html.mjs <出力先>.html
  ```
- `VITE_FORCE_DEMO=1` は Artifact 用: 認証スキップ+デモAI応答+ローカル保存(`src/lib/supabaseConfig.ts` 参照)。
  本番・Lovable側には一切影響しない
- favicon は 🏋️ を使用してきた(Artifactツールの favicon パラメータ)

## 4. 実装済み機能(2026-07-30時点)

### チャット画面(`src/pages/Chat.tsx` — 中核ファイル)
- ChatGPT iOSアプリのレイアウトを踏襲。開いたら最初にチャットが表示される
- 上部カード: スワイプカルーセル(PFCカード ⇄ 今日の筋トレカード)。ページドット付き。
  ResizeObserver で1枚目の高さを2枚目に合わせている。カードには影あり(スクロール可能とわかるように)
- 上部カードタップ → `RecordPageSheet` が getBoundingClientRect から全画面へFLIP風に展開(350ms)して
  食事記録ページ / 筋トレ記録ページを開く
- サイドバー: 会話履歴(表示は「日付+何時」形式。分は不要)、記録アコーディオン(→ /log?tab=X)
- AI連携: `isEdgeChatAvailable` なら `sendAiChat`(ai-chat Edge Function)、無ければ `sendToTrainer`(デモ)。
  承認フロー: 応答の `data.action.requires_confirmation` → ChatActionCard 表示 → `handleDecision` が
  confirm-action Edge Function を呼ぶ
- 削除などの確認は **2段階タップ方式**(`confirm()` はArtifactサンドボックスでブロックされるため使用禁止)
- トーストは bottom-center offset=96(上部だとヘッダー操作を遮る)
- `onAskMenu`: 記録シートを閉じて380ms後に「本日の献立を教えてください」を自動送信
- 候補チップ: `DUPLICATE_OF_CARD_BUTTONS` でカード内ボタンと重複するものを除去

### 記録ページ(シート内)
- **食事**(`src/components/MealRecordPage.tsx`): CaloriesPanel(影なし)→ ミニカレンダー+選択日の食事(合計kcal)
  → 体重推移グラフ(実測=青線、目標ペース=グレー点線、週次の小目標点、target_date か +90日)→「本日の献立を聞く」ボタン。
  **スクロール禁止の指示あり**(グラフは h-36 に縮めて収めた)
- **筋トレ**(`src/components/WorkoutRecordPage.tsx`): WorkoutSetsCard(h-[248px]、影なし)→ カレンダー+選択日メニュー
  (種目・セット数・最大kg)→ VolumeChart: **{肩}{胸}{背中}{脚}ボタン+データがある部位を追加**で切り替える
  Action Blue の折れ線(日次ボリューム=Σ重量×レップ)。初期選択は直近記録部位。
  ※最初は積み上げ棒で作ったがユーザーに却下され折れ線+ボタンに作り直した経緯あり

### 共有コンポーネント
- `CaloriesPanel.tsx`: 270°円弧の MacroGauge。PFC目標はサーバー値優先、無ければ `calcMacroTargets` 概算。
  達成度チップ: <80% グレー「-Xg」/ 80〜115% 緑「目標範囲内」/ >115% 赤「+Xg」。`shadow` prop
- `WorkoutSetsCard.tsx`: 種目グループ → セット行(左kg / 右回)。`shadow` prop
- `MiniCalendar.tsx`: 幅208px、記録日ドット、月送り
- `ChatActionCard.tsx`: ui_type別ボディ(Meal/Weight/WorkoutPlan/WorkoutSet/Generic)、confidenceバッジ、
  safety赤スタイル、確定/却下ステータス。onboarding_question は null を返す

### データ層
- `src/lib/store.ts`: SupabaseStore は**実スキーマ**対応(profiles+goals合成、body_measurements、meals、
  workout_sessions、workout_sets)。`listRecentWorkoutSets()`(500件、sessionId+ローカルdate付)。
  `VITE_FORCE_DEMO` または未設定なら LocalStore
- `src/lib/aiChat.ts`: 柴崎さん版を採用(sendAiChat / confirmAction / payloadRows / sanitizeAssistantText)
- `src/hooks/useAppData.ts`: workoutSets(全件)+ todayWorkoutSets、todayFatG / todayCarbsG
- `src/integrations/supabase/client.ts`: **自動生成・編集禁止**(柴崎さん管理)

### デザイン
- `DESIGNapple.md`(ユーザー提供)準拠。Apple風、単一アクセント Action Blue #0066cc
- フォント: Apple端末は -apple-system(SF Pro)+ヒラギノ、他は同梱 Inter Variable + Noto Sans JP サブセット
  (常用漢字+かな ≈2,946字、717KB、wght軸保持。生成手順は `scripts/README.md`)
- アニメーション: `ease-ios` = cubic-bezier(0.32,0.72,0,1)。keyframes: fade-in / pop-in / pop-out /
  drop-in / drop-out / grow-in。閉アニメは `useAnimatedPresence` でマウント維持
- safe-area: `viewport-fit=cover` + `env(safe-area-inset-*)`(iPhoneノッチ・下端対策)

## 5. テストアカウントとシードデータ

- **ID: test@test.com / Pass: 123456**(Supabase: https://lrkbusyjbstspebzvcdv.supabase.co)
- 投入済みシードデータ(E2E確認用):
  - goal: 目標60kg / 1650kcal / PFC 124/46/186g / 目標日+60日
  - 食事6件(4日分)、体重8件(約2週間分)
  - workout_sessions 4件(肩=7/29、胸=2日前、脚=4日前、背中=6日前、focus_area付)+ workout_sets 計18セット
- 実データでの動作確認方法は `scripts/e2e/README.md`

## 6. 開発環境の注意点

- ネットワークはプロキシ経由(`*.supabase.co` は許可済み)。curl / Node(undici) はプロキシ経由で直接可。
  **PlaywrightのChromiumはプロキシHTTPS直結不可** → `page.route` + undici リレー方式を使う(scripts/e2e/)
- `NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt` が必要
- vite preview は IPv6 不可 → `--host 127.0.0.1`
- python http.server は charset を返さないが、単一HTMLは先頭に `<meta charset="utf-8">` を注入済みなので問題ない

## 7. ユーザーとのやり取りの流儀

- 日本語。スクリーンショット付きで要望が来る。実装 → Artifact更新 → スクリーンショット送付 → 確認、のループ
- 「いったんLovableにプッシュして」「同期して」= lovable/main への反映指示。それが無い限り origin のみ
- デザインは承認済みのものを勝手に変えない。大きな変更は必ずスクショで見せて確認を取る
- ユーザーはLovableのクレジット節約のため、UI作業はすべてこちら(Claude)でやりたい意向

## 8. 未完・今後の予定

- **記録ページの「余白に入れてほしいもの」の追加指示が来る予定**(ユーザーが予告済み)
- 目標設定画面(/log?tab=weight 等)は既存のまま。チャットの目標チップから遷移できる
- オンボーディング(onboarding_question ui_type)はカード非表示のみ対応。専用UIは未着手
