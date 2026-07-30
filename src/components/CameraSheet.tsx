import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ChevronLeft, Images, SwitchCamera } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Captured {
  file: File;
  url: string;
}

/**
 * 食事撮影シート。
 * - 下からスライドして表示され、カメラのライブプレビューを出す
 * - 撮影すると写真が上部へスライドし、下にグラム数の手動入力(任意)と送信ボタンが出る
 * - カメラが使えない環境(権限なし・非対応)ではファイル選択(iOSでは標準カメラ起動)に
 *   フォールバックする
 */
export function CameraSheet({
  open,
  onClose,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  onSend: (file: File, previewUrl: string, grams: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState(false);
  const [captured, setCaptured] = useState<Captured | null>(null);
  const [grams, setGrams] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);

  // 閉じるときもスライドアウトさせるためのマウント管理
  useEffect(() => {
    if (open) {
      setMounted(true);
      const t = setTimeout(() => setShown(true), 20);
      return () => clearTimeout(t);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), 340);
    return () => clearTimeout(t);
  }, [open]);

  // 完全に閉じたら状態をリセット
  useEffect(() => {
    if (mounted) return;
    setCaptured((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setGrams("");
    setCameraError(false);
    setFacing("environment");
  }, [mounted]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // ライブプレビュー開始(撮影後・クローズ時は停止)
  useEffect(() => {
    if (!mounted || captured) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(true);
      return;
    }
    let cancelled = false;
    setCameraError(false);
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        if (!cancelled) setCameraError(true);
      }
    })();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [mounted, captured, facing, stopStream]);

  function capture() {
    const v = videoRef.current;
    if (!v || v.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    // アップロード上限(8MB)に収まるよう長辺を抑える
    const scale = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight));
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facing === "user") {
      // 前面カメラはプレビューと同じ鏡像で保存する
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `meal-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setCaptured({ file, url: URL.createObjectURL(blob) });
      },
      "image/jpeg",
      0.85
    );
  }

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("画像ファイルを選択してください");
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      toast.error("画像は8MB以下にしてください");
      return;
    }
    setCaptured({ file: f, url: URL.createObjectURL(f) });
  }

  function retake() {
    setCaptured((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  }

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 z-40">
      {/* 背景(タップで閉じる) */}
      <button
        aria-label="カメラを閉じる"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/30 transition-opacity duration-300",
          shown ? "opacity-100" : "opacity-0"
        )}
      />

      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFilePicked}
      />
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFilePicked}
      />

      {/* シート本体 */}
      <div
        className={cn(
          "absolute inset-x-3 bottom-[max(calc(env(safe-area-inset-bottom,0px)+0.5rem),0.75rem)] flex flex-col overflow-hidden rounded-[28px] bg-card shadow-[0_12px_40px_rgba(0,0,0,0.22)] transition-transform duration-300 ease-ios",
          shown ? "translate-y-0" : "translate-y-[115%]"
        )}
        style={{ height: "min(560px, 74%)" }}
      >
        {/* 撮影プレビュー / 撮影後は上部へ縮んで写真表示 */}
        <div
          className="relative w-full shrink-0 overflow-hidden bg-black transition-[height] duration-[350ms] ease-ios"
          style={{ height: captured ? "46%" : "100%" }}
        >
          {captured ? (
            <img
              src={captured.url}
              alt="撮影した食事"
              className="h-full w-full object-cover"
            />
          ) : cameraError ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
              <Camera className="h-9 w-9 text-white/60" strokeWidth={1.5} />
              <p className="text-[14px] leading-relaxed text-white/80">
                カメラを起動できませんでした。
                <br />
                ブラウザのカメラ許可を確認するか、下のボタンから撮影してください
              </p>
              <button
                onClick={() => nativeCameraInputRef.current?.click()}
                className="rounded-full bg-white px-6 py-2.5 text-[15px] font-medium text-foreground transition-transform active:scale-95"
              >
                写真を撮る・選ぶ
              </button>
            </div>
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={cn(
                "h-full w-full object-cover",
                facing === "user" && "[transform:scaleX(-1)]"
              )}
            />
          )}

          {/* ライブ時のコントロール */}
          {!captured && (
            <>
              {!cameraError && (
                <button
                  aria-label="カメラを切り替える"
                  onClick={() =>
                    setFacing((f) =>
                      f === "environment" ? "user" : "environment"
                    )
                  }
                  className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-transform active:scale-95"
                >
                  <SwitchCamera className="h-5 w-5" strokeWidth={1.8} />
                </button>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-6 pb-5">
                <button
                  aria-label="閉じる"
                  onClick={onClose}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-foreground transition-transform active:scale-95"
                >
                  <ChevronLeft className="h-6 w-6" strokeWidth={2} />
                </button>
                <button
                  aria-label="撮影する"
                  onClick={capture}
                  disabled={cameraError}
                  className="h-[68px] w-[68px] rounded-full border-4 border-white/60 bg-white transition-transform active:scale-90 disabled:opacity-30"
                />
                <button
                  aria-label="ライブラリから選ぶ"
                  onClick={() => libraryInputRef.current?.click()}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-foreground transition-transform active:scale-95"
                >
                  <Images className="h-5 w-5" strokeWidth={1.8} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* 撮影後: グラム数の手動入力(任意)+ 送信 */}
        {captured && (
          <div className="flex min-h-0 flex-1 animate-fade-in flex-col px-5 pb-5 pt-4">
            <p className="text-[15px] font-semibold">グラム数(任意)</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              未入力の場合はAIトレーナーが写真から推定します
            </p>
            <label className="mt-3 flex items-center gap-2 rounded-[14px] border bg-secondary px-4 py-3">
              <input
                value={grams}
                onChange={(e) =>
                  setGrams(e.target.value.replace(/[^0-9.]/g, ""))
                }
                inputMode="decimal"
                placeholder="例: 350"
                className="w-full bg-transparent text-[17px] [font-variant-numeric:tabular-nums] placeholder:text-muted-foreground focus:outline-none"
              />
              <span className="shrink-0 text-[15px] text-muted-foreground">
                g
              </span>
            </label>
            <div className="mt-auto flex items-center gap-3 pt-4">
              <button
                onClick={retake}
                className="h-12 flex-1 rounded-full border bg-card text-[16px] font-medium transition-transform active:scale-[0.98]"
              >
                撮り直す
              </button>
              <button
                onClick={() =>
                  captured && onSend(captured.file, captured.url, grams.trim())
                }
                className="h-12 flex-[1.4] rounded-full bg-primary text-[16px] font-medium text-primary-foreground transition-transform active:scale-[0.98]"
              >
                送信
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
