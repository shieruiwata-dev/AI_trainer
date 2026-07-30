# 引き継ぎ資料(セッション移行用)

新しいセッションで違和感なく作業を続けるための詳細ドキュメント。
まず `CLAUDE.md`(役割分担・同期ルール・作業サイクル)を読み、次にこのファイルを読むこと。
バックエンド仕様(Dify応答形式・Supabaseスキーマ・Edge Functions)は `docs/ai-spec.md`。
最終更新: 2026-07-30(LINE型スレッド化・サイドバー大ボタン化・マイク削除。両リポジトリ完全同期済み)

---

## 1. プロジェクト概要

- **アプリ**: AIトレーナーとチャットしながらダイエット・筋トレのサポート・記録・モチベーション管理を行うスマホアプリ(FitCoach)
- **ユーザー(依頼者)**: 岩田さん。日本語でやり取り。スクリーンショット+要望を送ってくる形で進行
- **分担**: Claude = `src/` のUI全般(主開発者)。柴崎さん = Lovable側でSupabase・Dify・Edge Functions(`supabase/`)・認証まわり
- **技術**: Vite + React 18 + TypeScript + Tailwind 3(HSLトークン)+ recharts + sonner + lucide-react。一部Radix

## 2. リポジトリ・同期(最重要ルール)

- 作業先: `shieruiwata-dev/AI_trainer` ブランチ `claude/ai-trainer-diet-app-yq6ool`(origin)。通常のプッシュはここだけ
- Lovable連携: `shieruiwata-dev/ai-trainer-duo` の `main`(リモート名 `lovable`)
  - **ユーザーが「同期して」「Lovableにプッシュして」と言ったときだけ** fetch → マージ → 両方へプッシュ。
    それ以外で lovable に触るとデータが壊れると明言されている。**絶対に勝手にプッシュしない**
  - マージ競合の方針: UI(`src/`)はこちら優先(`git checkout --ours`)、`supabase/` やバックエンド接続は柴崎さん優先
- ユーザーはLovable公開URL(〜.lovable.app)をスマホのホーム画面に追加して実機確認している(PWA対応済み)

## 3. プレビュー(Artifact)

- Artifact URL(**変えないこと**): `https://claude.ai/code/artifact/dbb00a75-0aab-4c15-8b13-18bae0a6dd53`
  → 新セッション最初の更新時は Artifact ツールに `url` パラメータでこのURLを渡す(渡さないと別URLが発行される)。
  さらに「別セッションの版を見ていない」エラーが出たら、先に WebFetch でこのURLを読むと更新できる
- favicon は 🏋️ で統一
- ビルド手順:
  ```bash
  VITE_SINGLE_FILE=1 VITE_USE_HASH_ROUTER=1 VITE_FORCE_DEMO=1 npm run build
  node scripts/build-single-html.mjs <出力先>.html
  ```
- `VITE_FORCE_DEMO=1` = 認証スキップ+デモAI応答+ローカル保存(Artifact用)。本番・Lovableには無関係

## 4. 実装済み機能(2026-07-30 bee69f2 時点)

### チャット画面(`src/pages/Chat.tsx` — 中核ファイル)
- **LINE型の単一スレッド方式**(2026-07-30変更)。「新規チャット」でセッションを切り替える概念は廃止し、
  1本の会話にすべてのメッセージが積み重なる。上へスクロールすると過去の履歴が見える
  - スレッド管理は `lib/thread.ts`(localStorage `fitcoach.thread`、最大2000件保存)。
    旧形式 `fitcoach.conversations` からは初回ロード時に自動移行(旧データは復旧用に残す)。
    旧 `lib/conversations.ts` は削除済み
  - **日付セパレーター**: 日が変わる位置に「今日/昨日/M月D日(曜)」のチップ(`DaySeparator`)
  - **過去分の遅延表示**: 初期40件のみ描画、上端に近づくと40件ずつ追加(`visibleCount` +
    `prependAnchor` でスクロール位置を維持)。初回表示は最下部へ瞬間移動、新着はスムーズスクロール
  - 候補チップ(suggestions)は最新メッセージにだけ表示(過去の履歴に残さない)
  - サイドバーは記録ナビのみに簡素化(会話リスト・検索・「チャット」ボタンは廃止)。
    旧「記録」アコーディオンも廃止し、**食事・筋トレ・体重の大きなカード型ボタン**(`SidebarBigLink`、
    18px角丸+ヘアライン、アイコンはAction Blue)を直接配置。旧・・・メニュー系のデッドコードも削除済み
- **ヘッダー**: 左=メニュー(サイドバー)、右=⚙のみ。⚙タップで**歯車が回転しながら設定ページが円形に展開**
  (clip-path円形リビール、700ms ease-ios、歯車も同カーブで同期。再タップで逆回転して格納)。
  設定は `SettingsPage embedded`(オーバーレイ内表示、閉じたら `data.reload()`)
- **上部カード**: スワイプカルーセル(PFC ⇄ 今日の筋トレ)。高さ204pxで統一(ResizeObserverで1枚目に追従)。
  タップでFLIP風に全画面の記録ページへ展開(RecordPageSheet)
- **PFCカード**(`CaloriesPanel.tsx`): **横棒ゲージ**(円形から変更済み)。各行=ラベル+達成度チップ(左)/
  実績・目標(右)/ Action Blue バー。達成度チップ: <80%グレー"-Xg" / 80〜115%緑"目標範囲内" / >115%赤"+Xg"
- **入力バー**: [ギャラリー添付] [カメラ] [textarea] [送信]。+ボタンとマイクボタンは廃止
  (マイクは機能未実装のため2026-07-30に削除。音声入力を実装するときに復活させる)
- **カメラ機能**(`CameraSheet.tsx`): カメラアイコン→下からシートが出てライブプレビュー
  (getUserMedia、前面/背面切替、ライブラリ選択、非対応環境はファイル選択にフォールバック)。
  撮影→写真が上部にスライド→「追加で撮る」で複数枚→「**追加**」で**チャット入力欄の上にサムネイル添付**
  (即送信ではない)。メッセージを添えて通常送信。複数枚は送信時に `lib/composeImages.ts` で
  1枚のグリッド画像に合成(ai-chatが画像1枚しか受けないため)
- **AI連携**: `isEdgeChatAvailable` → `sendAiChat`(ai-chat Edge Function)/ でなければ `sendToTrainer`(デモ)。
  確認カード→ `handleDecision` → confirm-action
- **トレーナーの顔アイコン**(`lib/trainers.ts` + `components/TrainerAvatar.tsx`):
  設定の「トレーナーのアイコン」で4人から選ぶ。選択は localStorage `fitcoach.trainer_icon`
  (端末ごと。**別デバイス同期にはバックエンドに列が必要=柴崎さん案件**)。
  設定はチャットのオーバーレイ内にあるため、`useSelectedTrainer` が CustomEvent
  `fitcoach:trainer-changed` を購読して裏のチャットへ即時反映する。
  表示箇所: ヘッダー(32px)+ 返信の左(34px、連続返信では先頭のみ=LINEと同じ)+ 思考中インジケーター。
  画像は `src/assets/trainers/{id}.(png|jpg|jpeg|webp)` に置く(`flow`/`fresh`/`power`/`hard`)。
  `import.meta.glob` で存在するものだけ拾うので**未配置でもビルドは通り**、頭文字にフォールバックする。
  詳細は `src/assets/trainers/README.md`。※2026-07-30時点で画像ファイルは未配置(ユーザーから受領待ち)
- **思考中インジケーター**(`ThinkingIndicator`): 応答待ちの間、Action Blueの3点が波打つ
  (tailwind `animate-thinking-dot`、1.3s ease-ios、各点0.16sずらし)。固まったと誤解されないための表示。
  本文が1文字でも来たら通常の逐次表示に切り替わる。**3.5秒以上待たせるときだけ**説明を添える
  (通常「考えています…」/ 写真つき「写真から食事を読み取っています…」)。
  状態は `thinking`(`{withImage}`)と `showThinkingHint`。ai-chatはストリーミングしないので
  本番では待ち時間ずっと点が出る。デモは `demoReply` が冒頭に待ち time を入れて本番の体感を再現
  (テキスト1.4秒 / 写真5秒)
- **食事カードの食材編集**(`ChatActionCard.tsx`): AI推定の食材名・量を入力欄で表示し編集可能。
  量を変えるとボタンが「この量で再計算」に変わり、旧数値は薄く表示。押すと修正内容をチャットで送り直して
  AIに再計算させ、旧カードは `superseded` フラグで無効化(「量を修正して計算し直しました」表示)。
  食材の追加・削除も可。編集しなければ従来どおり「この内容で記録」
- **サーバー履歴同期**(`lib/serverConversations.ts`): ログイン後 `ai_messages` から履歴を取得し(新しい方から
  最大1000件)、端末に無い分をスレッドへ時系列で差し込む(別デバイスで履歴が見えない問題の対策)。
  ID+内容×時刻近似で重複排除、同時刻のuser/assistantはuser先。履歴表示はテキストのみ(カードのpayloadは
  サーバーに無い)。サーバーも元々1会話に積む構造なのでLINE型UIとそのまま一致(セッション分割は廃止)。
  ※履歴が1000件を超えたら `.range()` でのページング取得を実装する(DB変更は不要)
- **既知の重要修正**: sendMessageはスレッド更新に必ず `setThread(prev=>...)` を使う(スナップショット上書きで
  直前の更新が消えるバグを修正済み。今後も踏襲すること)

### 記録ページ(シート内)
- **食事**(`MealRecordPage.tsx`): CaloriesPanel(影なし)→ カレンダー+選択日の食事 → 体重推移グラフ
  (実測青線+目標ペース点線、h-36)→「本日の献立を聞く」ボタン。**スクロール禁止**
- **筋トレ**(`WorkoutRecordPage.tsx`): WorkoutSetsCard(**h-[204px]**、影なし)→ カレンダー+選択日メニュー →
  VolumeChart({肩}{胸}{背中}{脚}+データある部位のボタンで切替の折れ線。日次Σ重量×レップ)

### PWA(ホーム画面追加で全画面起動)
- `public/manifest.webmanifest`(display: standalone)、apple-touch-icon.png / icon-192 / icon-512、
  index.html にiOS用メタタグ。favicon は Action Blue のダンベル(旧緑から変更済み)
- Lovable公開URLをホーム画面に追加するとURLバー無しで起動する

### データ層
- `lib/store.ts`: SupabaseStore実スキーマ対応。デモは LocalStore
- `lib/aiChat.ts`: sendAiChat / confirmAction / payloadRows / sanitizeAssistantText 等
- `integrations/supabase/client.ts`: **自動生成・編集禁止**(柴崎さん管理)

## 5. テストアカウントとシードデータ

- **ID: test@test.com / Pass: 123456**(Supabase: https://lrkbusyjbstspebzvcdv.supabase.co)
- シード済み: goal(60kg/1650kcal/PFC 124/46/186g/+60日)、食事6件、体重8件、
  workout_sessions 4件(肩・胸・脚・背中)+workout_sets 18セット
- E2E検証中に追加した食事記録が数件入っている可能性あり(検証で「鶏むね肉」「ゆで卵」等を送信した)

## 6. 開発環境の注意点

- ネットワークはプロキシ経由(`*.supabase.co` 許可済み)。Node/curlは直接可、
  **PlaywrightのChromiumはHTTPS直結不可** → `scripts/e2e/` の undici リレー方式(README参照)
- `NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt` 必須
- カメラUIの検証はChromium起動時に `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`
  + `context.grantPermissions(["camera"])`(緑のフェイク映像が出る)
- ローカル配信の python http.server はセッション再開時に落ちていることがある → 再起動してから実行

## 7. ユーザーとのやり取りの流儀

- 日本語。スクショ+要望 → 実装 → Artifact更新 → スクショ送付 → 確認のループ
- 「同期して」「Lovableにプッシュして」= lovable/main への反映指示。無い限り origin のみ
- デザインは勝手に変えない。作り直しの指示は普通にある(カメラ機能は3回作り直した)ので気にせず対応
- アニメーションの速度・タイミングは体感で細かく調整指示が来る(数値をすぐ変えられる形で実装しておく)

## 8. 未完・今後の予定

- LINE型スレッド化に伴い会話単位のピン留め/共有/削除は概念ごと廃止(コードも削除済み)。
  要望が出たら「メッセージ検索」「特定日へジャンプ」等のスレッド内機能として提案する
- サーバー履歴が1000件を超える場合のページング取得(`.range()`)は未実装
- 音声入力は未実装。ボタン自体を入力バーから削除済み(実装時に再追加する)
- オンボーディング(onboarding_question)専用UIは未着手
- 複数画像を個別に送る対応は柴崎さん側のai-chat改修待ち(現状は合成1枚で運用)
- グラム数指定の精度: メッセージ内のグラム数をDifyが優先するかは柴崎さん実装次第(伝達済みかは不明)
