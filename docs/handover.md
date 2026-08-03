# 引き継ぎ資料(セッション移行用)

新しいセッションで違和感なく作業を続けるための詳細ドキュメント。
まず `CLAUDE.md`(役割分担・同期ルール・作業サイクル)を読み、次にこのファイルを読むこと。
バックエンド仕様(Dify応答形式・Supabaseスキーマ・Edge Functions)は `docs/ai-spec.md`。
最終更新: 2026-08-03(コミット a827f1d 時点)

**いま何をしていたか(セッション移行直後に読む)**
- 直前の作業テーマ: **目標設定アンケート(オンボーディング)のUI作り込み**。
  Step2の身体情報を「1画面1項目」に分割し、身長=iOSピッカー風3Dホイール、
  体重=横ルーラー、どちらも触覚フィードバック付きにした。性別は♂♀の2択
- **origin は最新(a827f1d)。lovable は 32e9eaf のままで未同期**
  → こちら発の未反映分: アプリアイコン/マイサポ改名、身体情報UI一式。
  「同期して」と言われたら fetch → マージ → 両方へプッシュ
- **Artifactは現在「オンボーディング確認用」の版を表示中**(通常のアプリ版ではない)。
  詳細は「3. プレビュー(Artifact)」の後半を参照

---

## 1. プロジェクト概要

- **アプリ**: AIトレーナーとチャットしながらダイエット・筋トレのサポート・記録・モチベーション管理を行うスマホアプリ
- **正式名称「マイサポ」(My Supporter の略。2026-07-30にユーザーが決定)**。
  旧称は FitCoach。**UI表示は全て「マイサポ」へ変更済み**(サイドバーのロゴ・index.html の
  title/OGP/apple-mobile-web-app-title・manifest・単一HTMLのtitle)。
  localStorageキー(`fitcoach.*`)やコード内識別子は互換のため変更しない
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

### オンボーディング確認用プレビュー(2026-08-03時点でArtifactに出ているのはこれ)

デモビルドは `isSupabaseConfigured=false` でオンボーディングを素通りするため、
そのままだとアンケート画面をArtifactで開けない。そこで**単一HTMLに後付けで**
「初期ハッシュを `#/onboarding/purpose` にする + 下部にステップ切替バーを出す」
スクリプトを足した版を公開している(**アプリ本体のコードには一切入れていない**)。

- 生成スクリプト: **`scripts/make-onb-preview.mjs`**(2026-08-03にリポジトリへ入れた。
  以前は `scratchpad/` に置いていてセッションを跨ぐと消えていた)
  ```bash
  node scripts/build-single-html.mjs preview.html
  node scripts/make-onb-preview.mjs preview.html preview-onb.html   # ← これをpublish
  ```
  - `preview.html` の末尾に `<style>+<script>` を足すだけ。アプリ本体には一切入らない
  - `location.hash` が空なら `#/onboarding/purpose` をセット
  - 画面下に固定の丸いバー(`#pv-nav`)を出し、`1〜5` と `チャット` でハッシュを切り替える
- **通常のアプリ版に戻したいときは** `preview.html` をそのまま Artifact へ publish すればよい
- 6問目(`/onboarding/proposal`)はデモでは擬似進行(2026-08-03実装):
  `GoalPreparingScreen`(%が育つ準備画面)を約7秒見せたあと、ヒアリング内容から
  組み立てたサンプル提案カードを表示する。本番では同じ画面が実際のEDF待ちに連動する
  (応答が来るまで92%で足踏み→完了で100%へ)。「この目標で始める」はデモでは
  保存せずトーストを出してチャットへ戻る

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
  - **「最新へ」ボタン**: 下端から300px以上遡ると入力バーの上に丸い↓ボタンが出る(`showJumpToLatest`)。
    押すと `jumpToLatest` が rAF で **距離によらず380msで最下部へ**(標準のsmoothは距離に比例して
    遅くなるため自前でイージング)。メッセージ領域は `relative` なラッパーで包み、ボタンはその中に絶対配置
  - 候補チップ(suggestions)は最新メッセージにだけ表示(過去の履歴に残さない)
  - サイドバーは記録ナビのみに簡素化(会話リスト・検索・「チャット」ボタンは廃止)。
    旧「記録」アコーディオンも廃止し、**食事・筋トレ・体重の大きなカード型ボタン**(`SidebarBigLink`、
    18px角丸+ヘアライン、アイコンはAction Blue)を直接配置。旧・・・メニュー系のデッドコードも削除済み
- **ヘッダー**: 左=メニュー(サイドバー)、右=⚙のみ。⚙タップで**歯車が回転しながら設定ページが円形に展開**
  (clip-path円形リビール、700ms ease-ios、歯車も同カーブで同期。再タップで逆回転して格納)。
  設定は `SettingsPage embedded`(オーバーレイ内表示、閉じたら `data.reload()`)
- **上部カード**: スワイプカルーセル(PFC ⇄ 今日の筋トレ)。高さはPFCカードの自然高(約204px)に統一
  (ResizeObserverで1枚目に追従)。タップでFLIP風に全画面の記録ページへ展開(RecordPageSheet)。
  ※両ラッパーの `self-start` が重要: flex既定のstretchだとセット数が多い日に筋トレカードへ
  引きずられて行全体が伸び、計測値も汚染されて両カードが巨大化する(2026-07-30修正済み)
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
- **目標設計オンボーディング(柴崎さん実装・2026-07-30マージ)**: `lib/onboardingState.ts` が回答項目を
  localStorage `fitcoach.onboardingState.v1` に保持し、送信ごとに `goal_context.onboarding_state` として
  Difyへ渡す。応答の `collected_fields` を書き戻して蓄積する。
  - `ui_type: "onboarding_question"` → **カードは出さず** `quick_replies` を候補チップとして表示
    (`quickReplies` + `suggestions` を結合して重複除去。チップは最新メッセージのみ)
  - `ui_type: "goal_confirmation"` + `proposal` → `GoalProposalCard`。「この目標で始める」→ `startGoal`
    → confirm-goal Edge Function → 完了メッセージを追記して `data.reload()`
  - これらのカード・チップも `AssistantRow` の中に入るのでアイコン分だけ字下げされる
- **トレーナーの顔アイコン**(`lib/trainers.ts` + `components/TrainerAvatar.tsx`):
  設定の「トレーナーのアイコン」で4人から選ぶ。選択は localStorage `fitcoach.trainer_icon`
  (端末ごと。**別デバイス同期にはバックエンドに列が必要=柴崎さん案件**)。
  設定はチャットのオーバーレイ内にあるため、`useSelectedTrainer` が CustomEvent
  `fitcoach:trainer-changed` を購読して裏のチャットへ即時反映する。
  表示箇所: ヘッダー(32px)+ 返信の左(34px、連続返信では先頭のみ=LINEと同じ)+ 思考中インジケーター。
  画像は `src/assets/trainers/{id}.webp`(`flow`=緑ウェア女性 / `fresh`=黒ウェア男性 /
  `power`=赤黒ウェア女性 / `hard`=赤黒ウェア男性)。256×256・9〜17KBの顔アイコン。
  元の全身画像は `originals/` にあり、`scripts/crop-trainer-avatars.mjs`(要 `npm i sharp`)の
  cx/cy/size を変えれば切り出し直せる。**元画像は必ずサブフォルダに置く**
  (`import.meta.glob` は直下のみ非再帰で見るため、直下に置くとバンドルに巻き込まれる)。
  `import.meta.glob` で存在するものだけ拾うので**未配置でもビルドは通り**、頭文字にフォールバックする。
  詳細は `src/assets/trainers/README.md`
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

### オンボーディング(柴崎さん実装・2026-08-03マージ)

- **専用ページ方式の6ステップ**(チャット内の質問形式とは別建て)。
  `/onboarding/purpose` → `body` → `activity` → `experience` → `timeline` → `proposal`。
  定義は `lib/onboardingStep.ts`(`GOAL_STEPS` / `GOAL_STEP_ROUTES` / `GOAL_STEP_INDEX`)、
  共通の枠は `components/OnboardingShell.tsx`
- `App.tsx` に **`RequireOnboarded`** を追加。`profiles.onboarding_completed` と
  `onboarding_step` を見て未完了なら該当ステップへリダイレクトする。
  `Protected = RequireAuth + RequireOnboarded` で `/` `/log` `/goal` `/settings` を包む
  (※デモビルドは `isSupabaseConfigured=false` なので素通り)
- 新規カード: `LearningContentCard` / `MacroExplainerCard` / `WeightConfirmCard` /
  `GoalSwitchDialog` / `VideoPlayerDialog`
- **Step2(身体情報)は1画面1項目に分割済み(2026-08-03、こちらで改修)**:
  身長 → 体重 → 年齢 → 性別 のサブ画面を `OnboardingBody` 内の state で切替
  (ルートは `/onboarding/body` のまま。戻るボタンはサブ画面を遡り、先頭では purpose へ)
  - **身長はiOSピッカー風の3Dホイール**(`components/WheelPicker.tsx`):
    行を円柱の側面に並べ、スクロール量に応じて `rotateX + translateZ` で回転させる
    (1行18°、半径は隣接行が行高ぶん離れて見える値を算出)。上下は奥へ回り込んで薄くなる。
    **表示層(3D)と操作層(透明なスクロール要素)を分離**し、慣性・吸着は端末ネイティブに任せる
    構造。`role="listbox"` は外側、`role="option"` は表示層の行に付く(スクロール層は aria-hidden)。
    ft・in / cm 切替つき(内部は常にcm保持。ft・inは1インチ刻みでcmへ丸める)
  - **体重はルーラー式**(`components/RulerPicker.tsx`): 定規を横スワイプ、中央線が現在値。
    kg/lbs切替つき(内部は常にkgで保持)
  - どちらも**目盛り/行を1つ通過するたびに触覚フィードバック**
    (`lib/haptics.ts`: Android=navigator.vibrate / iPhone=iOS 17.4+の
    `<input type="checkbox" switch>` トグルHaptic流用。旧iOSでは無振動で動作)
  - 両ピッカーとも汎用実装なので他項目へ転用可。単位切替は `UnitToggle`(同ファイル内)で共用
  - **性別は ♂ 男性 / ♀ 女性 の2択**(記号は装飾なので aria-hidden)。
    一度「その他」を足したが、基礎代謝の計算式が男女の2種類しかなくバックエンド対応が
    必要になるため、ユーザー判断で削除した(2026-08-03)
- 新規 Edge Function: `complete-experience-onboarding` / `save-meal-log`

### 目標ページ(`src/pages/Goal.tsx`、ルート `/goal`)

- PFCカードの「目標 ○○ kcal >」チップから開く。**以前は `/settings` へ飛んでいたのを変更**
  (2026-07-30。設定とは別に目標だけを見られるようにするため)
- 設定画面へはチャットのヘッダー右上の歯車から入る(`/settings` ルート自体は残してある)
- 構成(上から)。ペース計算は `useGoalPlan`。**2026-08-03に柴崎さんが精度を改善**:
  基準は `profiles.current_weight_kg`(ユーザーが確認・確定した体重)。そこから±8kgを超える
  記録は異常値(誤入力・OCRミス)として除外し、除外件数を画面に表示する。
  **期日が無い場合は推測せず未設定扱い**にする(以前は90日後を仮置きしていた)
  1. **サマリーカード**: 期限まで残り日数 / 目標まで残りkg(大きな数字2つ)+ 期間の進捗バー
  2. **ゴールまでのカレンダー**: 今日〜目標日を1日1行で縦リスト(max-h-72でスクロール)。
     右にその日の目標体重。今日=青背景、週ごとの小さなゴール=旗+グレー背景、最終行=ゴール旗
  3. **ゴールまでの体重推移グラフ**: 実測(青)+ 目標ペース(点線、週ごとの点=小さなゴール)+
     ゴールの青丸(ReferenceDot)。**X軸は開始からの日数の数値軸**(日付カテゴリ軸だと記録の
     ある区間だけ詰まってペース線が折れて見えるため)
- 目標未設定(開始体重 or 目標体重が無い)ならチャットで目標を決めるよう促す案内だけを出す

### 記録ページ(シート内)
- **食事**(`MealRecordPage.tsx`): CaloriesPanel(影なし)→ カレンダー+選択日の食事 → 体重推移グラフ
  (実測青線+目標ペース点線、h-36)→「本日の献立を聞く」ボタン。**スクロール禁止**
- **筋トレ**(`WorkoutRecordPage.tsx`): WorkoutSetsCard(**h-[204px]**、影なし)→ カレンダー+選択日メニュー →
  VolumeChart({肩}{胸}{背中}{脚}+データある部位のボタンで切替の折れ線。日次Σ重量×レップ)

### PWA(ホーム画面追加で全画面起動)
- `public/manifest.webmanifest`(display: standalone)、apple-touch-icon.png / icon-192 / icon-512、
  index.html にiOS用メタタグ
- **アプリアイコン(2026-08-03決定)**: 片手を高く突き上げ、もう片方の拳を腰で握る応援ポーズの
  人型シルエット(白)+ Action Blue背景 + 拳の上に気合いの放射線。生成AIではなく手描きSVG。
  **`scripts/build-app-icons.mjs` が唯一の生成元**。デザイン変更はこのスクリプトの
  パス座標を直して再実行する(要 `npm i sharp` + `NODE_PATH=<作業dir>/node_modules`)。
  ホーム画面用PNGは**角丸なしの正方形**で書き出す(OS側が角丸を付けるため)。favicon.svgのみ角丸あり
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

**次にやる可能性が高いこと(直前の作業の続き)**
- オンボーディング1・3・4問目のUI作り込み。2問目(身体情報)と5問目は作り込み済みで
  他は「見出し+ボタンの縦積み」のまま。年齢もホイール式にすると2問目内で統一感が出る
- **5問目は2026-08-03にペーススライダー式へ刷新**(参考にしたのは他アプリのスクショ。
  速さを 歩く人→原付→スーパーカー のアイコンで表現、ユーザー指定):
  週あたり0.1〜1.0kgをスライダーで選び、目標体重(任意)があれば「ゴールまで約Xヶ月」と
  「1日の目安カロリー」(Mifflin-St Jeor+活動係数、下限1,000kcal)をカードに出す。
  値は `pace_kg_per_week` として onboardingState に追加済み(duration_months は計算できた
  ときだけ併存)。**Dify側がこの新フィールドを使うかは柴崎さんに未確認**。
  スライダーのトラックは backgroundImage で塗ること(background だと更新時に
  backgroundClip がリセットされ太いブロックになるバグあり、修正済み)。
  アイコンは**選択中(青)のときだけ**ループアニメーション(歩く人=手足を振る+ボブ、
  原付=エンジン振動、スーパーカー=車体の震え+スピード線が流れる)。keyframes は
  tailwind.config.ts の `pace-*`、位相ずらしは inline の animationDelay。
  手足の回転は transformBox:"view-box" + 関節座標の transformOrigin で行う
- 触覚フィードバックの実機確認。iPhoneはiOS 17.4+の非公式手法なので**実機で鳴るか未検証**
  (`lib/haptics.ts`。Androidは navigator.vibrate で確実)
- アプリアイコンは G-2 で実装済みだが、ユーザーが「アイコンの話は一旦忘れて」と保留中。
  再開するなら `scripts/build-app-icons.mjs` の座標を編集して再実行

**その他**
- サーバー履歴が1000件を超える場合のページング取得(`.range()`)は未実装
- 音声入力は未実装。ボタン自体を入力バーから削除済み(実装時に再追加する)
- 複数画像を個別に送る対応は柴崎さん側のai-chat改修待ち(現状は合成1枚で運用)
- グラム数指定の精度: メッセージ内のグラム数をDifyが優先するかは柴崎さん実装次第(伝達済みかは不明)
- LINE型スレッド化に伴い会話単位のピン留め/共有/削除は概念ごと廃止(コードも削除済み)。
  要望が出たら「メッセージ検索」「特定日へジャンプ」等のスレッド内機能として提案する
