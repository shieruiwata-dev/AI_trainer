/**
 * Supabase 接続が有効かどうか(生成済みクライアントは常に設定済み)。
 * 例外: VITE_FORCE_DEMO=1 のとき(Artifactプレビュー等、外部通信できない環境向けの
 * デモビルド)はオフライン動作にするため false を返す。
 * Lovable / 本番ビルドではこの env は未設定なので常に true。
 */
export const isSupabaseConfigured = !import.meta.env.VITE_FORCE_DEMO;
