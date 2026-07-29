# AIトレーナー バックエンド仕様(共通認識ドキュメント)

> 出典: Dify DSL `Fit Trainer Backend v1`(2026-07-29受領)+ Supabase生成型 + Edge Function実装。
> フロント/バックエンドの認識を揃えるための単一の参照先。変更があったらこのファイルを更新する。

## 全体アーキテクチャ

```
フロント ── supabase.functions.invoke("ai-chat") ──► Edge Function ai-chat
                                                        │  DBからコンテキストを収集して Dify に渡す
                                                        ▼
                                              Dify: Fit Trainer Backend v1
                                                意図分類 → 5系統のLLM → JSON応答
                                                        │
フロント ◄── {message, ui_type, intent, data, suggestions, safety} ──┘
   │ 確認カードで「この内容で記録」
   └── supabase.functions.invoke("confirm-action") ──► pending_action を確定し各テーブルへ書き込み
```

## Difyワークフロー

### 入力コンテキスト(ai-chat が組み立てて渡す)

| 変数 | 内容 |
|---|---|
| `profile_context` | プロフィール(JSON文字列) |
| `goal_context` | アクティブな目標(JSON文字列) |
| `today_context` | 今日の摂取状況 |
| `recent_workouts_context` | 直近のトレーニング(JSON配列) |
| `weight_trend_context` | 体重推移(JSON配列) |
| `trainer_style` | `gentle`(優しい) / `standard`(普通) / `strict`(率直) |
| `local_datetime` | ローカル日時(ISO 8601、必須) |

### 意図分類(5クラス)

| intent | 担当ノード | 内容 |
|---|---|---|
| `onboarding` | 60_初期設定 | 初期登録・プロフィール・目標設定(1回に最大2項目質問) |
| `meal_log` | 20_食事解析 | 食事の記録(**画像解析対応**・栄養成分表示優先) |
| `weight_log` | 30_体重解析 | 体重・体脂肪率の記録(25kg未満/300kg超はconfidence≤0.2) |
| `workout` | 40_筋トレ対応 | メニュー提案 / セット記録 / フォーム相談 |
| `question_other` | 50_相談回答 | 一般相談・雑談・**安全対応**(痛み・けが・摂食障害等) |

## 実測サンプル(2026-07-29 テストアカウントで取得)

### ai-chat 応答(挨拶 → text)
```json
{
  "message": "こんにちは、たかおさん。まずは目標を教えてください。減量・増量・体型維持から始められます。",
  "ui_type": "text",
  "intent": "other",
  "data": {
    "pending_action_id": null,
    "action": { "type": "none", "requires_confirmation": false, "confidence": 0.98, "payload": {} }
  },
  "conversation_id": "dd09f9d2-...",
  "suggestions": ["減量したい", "筋肉を増やしたい", "体型を維持したい"],
  "safety": { "level": "normal", "note": "" }
}
```

### ai-chat 応答(「バナナを1本食べた」→ meal_confirmation)
```json
{
  "message": "バナナ1本を約93kcalとして推定しました。",
  "ui_type": "meal_confirmation",
  "intent": "meal_log",
  "data": {
    "pending_action_id": "79e6065d-...",
    "action": {
      "type": "meal.create",
      "requires_confirmation": true,
      "confidence": 0.9,
      "payload": {
        "eaten_at": "2026-07-29T14:05:41+09:00",
        "meal_type": "snack",
        "raw_text": "バナナを1本食べた",
        "items": [{ "name": "バナナ", "amount": 1, "unit": "本" }],
        "calories": 93, "protein_g": 1, "fat_g": 0, "carbs_g": 23,
        "estimation_note": "一般的な中サイズのバナナ1本(可食部約100g)として推定しました。"
      }
    }
  },
  "conversation_id": "dd09f9d2-...",
  "suggestions": ["この内容で記録", "量を修正", "食品を追加"],
  "safety": { "level": "normal", "note": "" }
}
```

### confirm-action 応答(reject)
```json
{ "status": "rejected", "pending_action_id": "79e6065d-..." }
```
※ `message` フィールドは返らない(フロントはフォールバック文言を表示する)。

## 応答JSONの共通形式

```json
{
  "version": "1.0",
  "intent": "meal_log",
  "message": "ユーザーに見せる短い日本語",
  "ui_type": "meal_confirmation",
  "action": {
    "type": "meal.create",
    "requires_confirmation": true,
    "confidence": 0.85,
    "payload": { }
  },
  "suggestions": ["この内容で記録", "量を修正", "食品を追加"],
  "safety": { "level": "normal", "note": "" }
}
```

- `safety.level`: `normal` / `caution`(専門家への相談を促す) / `urgent`(ui_type=safety_notice、緊急窓口案内を優先)
- `requires_confirmation: true` のとき、フロントは確認カードを表示 → confirm-action へ

## ui_type別 payload 仕様

### `meal_confirmation`(action.type: `meal.create`)
```json
{
  "eaten_at": "ISO 8601",
  "meal_type": "breakfast|lunch|dinner|snack|unknown",
  "raw_text": "ユーザーの元入力",
  "items": [{ "name": "食品名", "amount": 200, "unit": "g" }],
  "calories": 0, "protein_g": 0, "fat_g": 0, "carbs_g": 0,
  "estimation_note": "何を推定したか"
}
```
数値は整数。画像で量が不明ならconfidence低め。

### `weight_confirmation`(action.type: `weight.create`)
```json
{ "measured_at": "ISO 8601", "weight_kg": 72.4, "body_fat_percent": null, "note": "" }
```

### `workout_plan`(action.type: `workout.start`)
```json
{
  "title": "肩トレ30分", "focus_area": "shoulders", "estimated_minutes": 30,
  "rationale": "理由",
  "exercises": [{
    "exercise_name": "ショルダープレス", "order": 1,
    "target_sets": 3, "target_reps": 10, "target_weight_kg": null,
    "rest_seconds": 90,
    "coaching_cues": ["反動を使いすぎない", "痛みが出たら中止", "呼吸を止めない"]
  }]
}
```

### `workout_set`(action.type: `workout_set.create`)
```json
{ "session_id": "", "exercise_name": "ベンチプレス", "set_number": 1,
  "weight_kg": 80, "reps": 8, "completed_at": "ISO 8601", "rpe": null }
```

### `onboarding_question`(action.type: `none`)
質問文は `message`。`payload.extracted` に抽出済み項目。suggestions が回答候補チップになる。

### `goal_confirmation`
2種類ある:
- **プロフィール保存**(action.type: `profile.upsert`): `display_name / birth_date / sex_for_calculation / height_cm / current_weight_kg / body_fat_percent / activity_level / training_level / weekly_training_days`
- **目標保存**(action.type: `goal.upsert`): `goal_type / target_weight_kg / target_date`。カロリー・PFCはサーバーの固定計算式で算出(goalsテーブルのtarget_*列)

### `text` / `safety_notice`(action.type: `none`)
保存なし。`safety_notice` は緊急時(safety.level=urgent)。

## Supabase スキーマ ↔ 画面の対応

| テーブル | 主な列 | 表示場所(現状) |
|---|---|---|
| `profiles` | display_name, height_cm, current_weight_kg, activity_level, training_level, weekly_training_days, onboarding_completed | 設定画面、チャット挨拶 |
| `goals`(is_active) | goal_type, target_weight_kg, target_calories, **target_protein_g/fat_g/carbs_g**, target_date | カロリーパネル(PFC目標はサーバー値優先)、設定画面 |
| `meals` | eaten_at, meal_type, calories, protein_g, fat_g, carbs_g, raw_text, image_path, source_type, confidence, estimation_note | カロリーパネル集計、記録>食事 |
| `meal_items` | meal_id, name, amount, unit, calories, PFC | (未表示。食事詳細に使える) |
| `body_measurements` | measured_at, weight_kg, body_fat_percent, note | 記録>体重(グラフ・履歴) |
| `workout_sessions` | title, focus_area, status, started_at/ended_at, estimated_minutes, plan_json, condition_note | 記録>筋トレ |
| `workout_sets` | session_id, exercise_name, set_number, target/actual weight・reps, rpe, completed_at | (未表示。セッション詳細に使える) |
| `ai_conversations` / `ai_messages` | Dify会話ID、role/content/intent/metadata | (未表示。会話履歴のサーバー同期に使える) |
| `pending_actions` | action_type, payload, status, expires_at | 確認カードの裏側(confirm-actionが解決) |
| `trainer_settings` | trainer_name, trainer_style, explanation_level | (未表示。トレーナー設定画面の候補) |
| Storage `meal-images` | `<user_id>/<uuid>.<ext>` | チャット添付画像 |

## フロント実装の対応状況

- `src/lib/aiChat.ts` … ai-chat / confirm-action の呼び出しと ui_type 判定
- `src/components/ChatActionCard.tsx` … 確認カード(payloadを汎用整形で表示)
- `src/lib/store.ts` … 手入力記録を同じテーブルへ読み書き(AI記録と一元化)
- デモビルド(`VITE_FORCE_DEMO=1`)ではEdge Functionを呼ばず定型応答

## 要確認事項(柴崎さん向け)

1. **goal_type の表記揺れ**: Difyは `cut` を返す想定だが、フロント/旧設計は `diet|bulk|maintain`。confirm-action がどちらでgoalsに保存するか?(フロントは未知の値を `diet` 扱いにフォールバック中)
2. **DSLの file_upload が enabled: false**: 食事解析ノードはvision有効だが、アプリ設定の画像アップロードが無効。ai-chat がAPI経由でファイルを渡しているなら問題ないが、Dify側の設定確認を推奨
3. `workout_set.create` の `session_id` が空文字の場合の挙動(進行中セッションに自動紐付け?)
4. `meals.meal_type` に `unknown` が入り得る(フロントは `snack` 扱いでフォールバック中)
