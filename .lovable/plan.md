## 概要
2人のAIトレーナー「サクラ」(食事)と「ゴウ」(筋トレ)がサポートする筋トレアプリの**骨組み**を構築します。今回は認証・オンボーディング・タブナビゲーション+空ページまで。

## 1. Lovable Cloud (Supabase) 有効化
- `supabase--enable` で Cloud を起動
- `profiles` テーブルを migration で作成:
  - `id uuid PK references auth.users`, `height_cm numeric`, `weight_kg numeric`, `goal_type text check in ('bulk','cut','maintain')`, `activity_level text check in ('low','medium','high')`, `onboarded boolean default false`, `created_at`, `updated_at`
  - RLS: 本人のみ select/insert/update
  - GRANT を authenticated / service_role に付与
  - サインアップ時に自動で profiles 行を作る trigger

## 2. デザインシステム (`src/styles.css`)
- ダークモード固定 (`<html class="dark">`)
- カラー tokens を oklch で定義:
  - `--background` #0B0B0D, `--card` #16161A
  - `--primary` #C8FF3E (ボルトイエロー), `--primary-foreground` 黒
  - `--accent` #FF5C39 (炎オレンジ)
  - `--foreground` #F5F5F7, `--muted-foreground` #9A9AA3
- `--radius` 16px、ボタンは 12px
- Inter フォント (`<link>` in `__root.tsx` head)
- 数字用の太字 utility、カウントアップ・バウンスの keyframes

## 3. ルーティング構成
```
src/routes/
  __root.tsx           (dark クラス付与、fonts link、head メタ更新)
  index.tsx            (セッション判定 → /auth or /home へリダイレクト)
  auth.tsx             (ログイン/登録トグル、「今日も始める」)
  onboarding.tsx       (ステップ式、プログレスバー付き)
  _authenticated/
    route.tsx          (統合管理・ssr:false, 未認証→/auth)
    home.tsx           (空ページ骨組み)
    meals.tsx          (空)
    training.tsx       (空)
    stats.tsx          (空)
    settings.tsx       (空 + サインアウト)
```
- `_authenticated/route.tsx` は onboarded=false なら `/onboarding` へリダイレクト
- タブナビゲーション: `_authenticated/route.tsx` に固定下部タブ (lucide: Home, UtensilsCrossed, Dumbbell, LineChart, Settings)

## 4. 認証フロー
- `/auth`: email+password、タブで登録/ログイン切替
  - 登録ボタン「トレーナーと契約する」
  - ログインボタン「今日も始める」
  - `emailRedirectTo: window.location.origin`
- 登録成功 → `/onboarding`
- ログイン成功 → profiles.onboarded で分岐

## 5. オンボーディング (1問1画面)
- ステップ: ① 身長 → ② 体重 → ③ 目標(3カード: 増量/減量/維持) → ④ 活動量(3カード: 低/中/高)
- 上部プログレスバー、下部「次へ」ボタン
- 最後に profiles を update + `onboarded=true`、`/home` へ

## 6. 空ページ (5つ)
各ページは header (トレーナー名の見出しや後述の準備テキスト) + "Coming soon: 詳細は次のステップで実装" 程度のプレースホルダで統一トーン。

## 技術ポイント
- `supabase.auth.getUser()` を認証ゲートで使用 (managed layout)
- `onAuthStateChange` を `__root.tsx` で購読 → router.invalidate()
- 下部固定タブは `fixed bottom-0` + safe-area padding、モバイル幅想定 (max-w-md mx-auto)
- lucide-react アイコンのみ、絵文字なし

## 次ステップ(今回はやらない)
- 各タブ内コンテンツ実装
- サクラ/ゴウのAI介入ロジック
- ストリーク計算・グラフ
