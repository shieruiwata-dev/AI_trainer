/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_DIFY_API_URL?: string;
  readonly VITE_DIFY_API_KEY?: string;
  /** ハッシュルーティングに切替(単一HTMLビルド用) */
  readonly VITE_USE_HASH_ROUTER?: string;
  /** 認証スキップ+デモ応答+ローカル保存(プレビュービルド用) */
  readonly VITE_FORCE_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
