import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ChevronLeft, Images, SwitchCamera, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface Shot {
  file: File;
  url: string;
}

/**
 * 食事撮影シート。
 * - 下からスライドして表示され、カメラのライブプレビューを出す
 * - 撮影すると写真が上部へスライドし、「追加で撮る」で複数枚撮影できる
 * - 「追加」でチャット入力欄に添付され、メッセージと一緒に送れる(ここでは送信しない)
 * - カメラが使えない環境(権限なし・非対応)ではファイル選択(iOSでは標準カメラ起動)に
 *   フォールバックする
 */
export function CameraSheet({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  /** 撮影した写真をチャット入力欄の添付に渡す */
  onAdd: (shots: Shot[]) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [phase, setPhase] = useState<"live" | "review">("live");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState(false);
  const [shots, setShots] = useState<Shot[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  // チャットへ渡した写真のURLは呼び出し元が使うので破棄しない
  const handedOffRef = useRef(false);

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
    setShots((prev) => {
      if (!handedOffRef.current) {
        prev.forEach((s) => URL.revokeObjectURL(s.url));
      }
      handedOffRef.current = false;
      return [];
    });
    setPhase("live");
    setCameraError(false);
    setFacing("environment");
  }, [mounted]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // ライブプレビュー開始(撮影確認中・クローズ時は停止)
  useEffect(() => {
    if (!mounted || phase !== "live") return;
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
  }, [mounted, phase, facing, stopStream]);

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
        setShots((prev) => [...prev, { file, url: URL.createObjectURL(blob) }]);
        setPhase("review");
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
    setShots((prev) => [...prev, { file: f, url: URL.createObjectURL(f) }]);
    setPhase("review");
  }

  function removeShot(index: number) {
    setShots((prev) => {
      const next = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index].url);
      if (next.length === 0) setPhase("live");
      return next;
    });
  }

  function add() {
    if (shots.length === 0) return;
    handedOffRef.current = true;
    onAdd(shots);
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
        {/* カメラ / 撮影済み写真(上部へスライド) */}
        <div
          className="relative w-full shrink-0 overflow-hidden bg-black transition-[height] duration-[350ms] ease-ios"
          style={{ height: phase === "review" ? "58%" : "100%" }}
        >
          {phase === "review" ? (
            <ShotsPreview shots={shots} onRemove={removeShot} />
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
          {phase === "live" && (
            <>
              {shots.length > 0 && (
                <span className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 text-[13px] font-medium text-white backdrop-blur [font-variant-numeric:tabular-nums]">
                  {shots.length}枚撮影済み
                </span>
              )}
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
                  aria-label={shots.length > 0 ? "撮影済みに戻る" : "閉じる"}
                  onClick={() =>
                    shots.length > 0 ? setPhase("review") : onClose()
                  }
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

        {/* 撮影後: 追加で撮る / チャットに追加 */}
        {phase === "review" && (
          <div className="flex min-h-0 flex-1 animate-fade-in flex-col px-5 pb-5 pt-4">
            <p className="text-[15px] font-semibold">
              {shots.length > 1 ? `${shots.length}枚の写真` : "この写真"}
              をチャットに追加
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              追加すると入力欄に添付されます。メッセージを添えて送信できます
            </p>
            <div className="mt-auto flex items-center gap-3 pt-4">
              <button
                onClick={() => setPhase("live")}
                className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full border bg-card text-[16px] font-medium transition-transform active:scale-[0.98]"
              >
                <Camera className="h-[18px] w-[18px]" strokeWidth={1.8} />
                追加で撮る
              </button>
              <button
                onClick={add}
                disabled={shots.length === 0}
                className="h-12 flex-[1.4] rounded-full bg-primary text-[16px] font-medium text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                追加
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** 撮影済み写真の一覧。1枚なら全面、複数なら横スクロールのカード */
function ShotsPreview({
  shots,
  onRemove,
}: {
  shots: Shot[];
  onRemove: (index: number) => void;
}) {
  if (shots.length === 1) {
    return (
      <img
        src={shots[0].url}
        alt="撮影した食事"
        className="h-full w-full object-cover"
      />
    );
  }
  return (
    <div className="no-scrollbar flex h-full snap-x snap-mandatory gap-2 overflow-x-auto p-2">
      {shots.map((s, i) => (
        <div
          key={s.url}
          className="relative h-full w-[82%] shrink-0 snap-center overflow-hidden rounded-[16px]"
        >
          <img
            src={s.url}
            alt={`撮影した食事 ${i + 1}枚目`}
            className="h-full w-full object-cover"
          />
          <button
            aria-label={`${i + 1}枚目を削除`}
            onClick={() => onRemove(i)}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-transform active:scale-95"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
          <span className="absolute bottom-2 left-2 rounded-full bg-black/45 px-2.5 py-0.5 text-[12px] text-white [font-variant-numeric:tabular-nums]">
            {i + 1}/{shots.length}
          </span>
        </div>
      ))}
    </div>
  );
}
