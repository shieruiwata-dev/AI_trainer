import { supabase } from "@/integrations/supabase/client";

const BUCKET = "meal-images";
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * チャット添付画像を Supabase Storage(meal-images)へアップロードし、
 * ai-chat に渡す image_path を返す。
 * 保存パスは RLS に合わせて `<user_id>/<uuid>.<ext>`。
 */
export async function uploadChatImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("画像ファイルを選択してください");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("画像は8MB以下にしてください");
  }

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) {
    throw new Error("画像を送るにはログインが必要です");
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error("image upload error", error);
    throw new Error(error.message || "画像のアップロードに失敗しました");
  }
  return path;
}
