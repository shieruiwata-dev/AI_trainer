/**
 * 添付画像を送信前に縮小する。
 *
 * ギャラリーから選んだ写真(iPhoneなら4032×3024・3〜5MB)がそのまま
 * Storage へ入るのを防ぐためのもの。カメラ撮影(`CameraSheet.capture()`)は
 * 撮影時点で同じ設定に縮めているため、ここを通す必要はない。
 *
 * 方針:
 * - 失敗しても**元のファイルをそのまま返す**(送信を止めない)
 * - 既に小さい画像は再エンコードしない(無駄に劣化させない)
 * - EXIF の回転情報を反映する(これを外すとiPhoneの写真が横倒しになる)
 */

/** 長辺の上限。カメラ撮影(CameraSheet)と同じ値にすること */
export const MAX_IMAGE_DIMENSION = 1600;
/** JPEG品質。カメラ撮影と同じ値にすること */
export const IMAGE_QUALITY = 0.85;
/** 長辺が上限内で、かつこのサイズ以下ならそのまま使う */
const SKIP_RESIZE_BYTES = 600 * 1024;

interface LoadedImage {
  width: number;
  height: number;
  source: CanvasImageSource;
  release: () => void;
}

/**
 * EXIF の回転を反映した状態で画像を読み込む。
 * createImageBitmap の imageOrientation は Safari 16 以降で使える。
 * 使えない環境では <img> にフォールバックする(こちらもブラウザ側が
 * EXIF を反映して描画する)。
 */
async function loadImage(file: File): Promise<LoadedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return {
        width: bitmap.width,
        height: bitmap.height,
        source: bitmap,
        release: () => bitmap.close(),
      };
    } catch {
      // オプション未対応 or デコード失敗 → <img> で読み直す
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("image decode failed"));
      el.src = url;
    });
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      source: img,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

/**
 * 長辺が maxDimension を超えていたら縮小した JPEG を返す。
 * 縮小が不要・不可能なときは元のファイルをそのまま返す。
 */
export async function resizeImageFile(
  file: File,
  maxDimension = MAX_IMAGE_DIMENSION,
  quality = IMAGE_QUALITY
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  let loaded: LoadedImage;
  try {
    loaded = await loadImage(file);
  } catch {
    return file; // デコードできない形式でも送信は止めない
  }

  try {
    const { width, height, source } = loaded;
    if (width === 0 || height === 0) return file;

    const scale = Math.min(1, maxDimension / Math.max(width, height));
    // 既に十分小さいなら再エンコードせずそのまま使う
    if (scale === 1 && file.size <= SKIP_RESIZE_BYTES) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    // 変換に失敗した / かえって大きくなった(小さなPNG等)ときは元を使う
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${name}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  } finally {
    loaded.release();
  }
}
