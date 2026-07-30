import { useState } from "react";
import type { Trainer } from "@/lib/trainers";
import { cn } from "@/lib/utils";

/**
 * トレーナーの顔アイコン(常に丸く切り抜いて表示)。
 * 画像が未配置・読み込み失敗のときは頭文字にフォールバックする。
 */
export function TrainerAvatar({
  trainer,
  size = 34,
  className,
}: {
  trainer: Trainer;
  /** 直径(px) */
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = trainer.image !== null && !failed;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-muted",
        className
      )}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img
          src={trainer.image!}
          alt={`${trainer.name}トレーナー`}
          draggable={false}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
          style={{ objectPosition: trainer.objectPosition }}
        />
      ) : (
        <span
          aria-hidden
          className="font-medium leading-none text-foreground/55"
          style={{ fontSize: Math.round(size * 0.4) }}
        >
          {trainer.initial}
        </span>
      )}
    </span>
  );
}
