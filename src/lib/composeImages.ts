/**
 * 複数枚の画像を1枚のグリッド画像に合成する。
 * ai-chat が受け取れる画像は1枚のため、送信直前にUI側でまとめる。
 */
export async function composeImages(
  items: { url: string }[]
): Promise<{ file: File; url: string }> {
  const images = await Promise.all(
    items.map(
      (s) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = s.url;
        })
    )
  );

  const CELL = 800;
  const cols = 2;
  const rows = Math.ceil(images.length / cols);
  const canvas = document.createElement("canvas");
  canvas.width = CELL * Math.min(cols, images.length);
  canvas.height = CELL * rows;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  images.forEach((img, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    // 最後の行が1枚だけなら横幅いっぱいに使う
    const isLastSolo =
      i === images.length - 1 && col === 0 && images.length % cols === 1;
    const w = isLastSolo ? canvas.width : CELL;
    const x = col * CELL;
    const y = row * CELL;
    // セルを埋めるように中央でトリミング(object-cover相当)
    const scale = Math.max(w / img.width, CELL / img.height);
    const sw = w / scale;
    const sh = CELL / scale;
    const sx = (img.width - sw) / 2;
    const sy = (img.height - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, CELL);
  });

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85)
  );
  if (!blob) throw new Error("compose failed");
  const file = new File([blob], `meal-${Date.now()}.jpg`, {
    type: "image/jpeg",
  });
  return { file, url: URL.createObjectURL(blob) };
}
