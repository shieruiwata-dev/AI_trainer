import { X } from "lucide-react";
import type { OnboardingContent } from "@/components/LearningContentCard";

/** 学習コンテンツの動画再生モーダル。最後まで見たら onEnded を通知する */
export function VideoPlayerDialog({
  content,
  onClose,
  onEnded,
}: {
  content: OnboardingContent | null;
  onClose: () => void;
  onEnded: (content: OnboardingContent) => void;
}) {
  if (!content) return null;
  const url = content.video_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-[18px] bg-card">
        <div className="flex items-center justify-between gap-2 border-b border-[#f0f0f0] px-4 py-3">
          <p className="truncate text-[14px] font-medium">{content.title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="rounded-full p-1 transition-transform active:scale-90"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        {url ? (
          <video
            src={url}
            controls
            autoPlay
            playsInline
            onEnded={() => onEnded(content)}
            className="aspect-video w-full bg-black"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-secondary text-[13px] text-muted-foreground">
            動画は準備中です
          </div>
        )}
        <div className="px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-full rounded-full border text-[14px] transition-transform active:scale-[0.97]"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

export default VideoPlayerDialog;
