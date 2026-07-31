import { useState } from "react";
import { Check, ChevronDown, Clock, PlayCircle, Video } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OnboardingContent {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  status: string;
  target_type: string;
}

function formatDuration(sec: number | null): string | null {
  if (!sec || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}分${s > 0 ? `${s}秒` : ""}` : `${s}秒`;
}

/**
 * 経験レベルに応じた学習コンテンツカード。
 * beginner=初期展開、intermediate=初期折りたたみ、advanced=非表示。
 */
export function LearningContentCard({
  heading,
  description,
  level,
  contents,
  progress,
  onWatch,
  onSkip,
}: {
  heading: string;
  description: string;
  level: string | null;
  contents: OnboardingContent[];
  progress: Record<string, string>;
  onWatch: (content: OnboardingContent) => void;
  onSkip: (content: OnboardingContent) => void;
}) {
  const [open, setOpen] = useState(level !== "intermediate");
  if (level === "advanced") return null;
  if (contents.length === 0) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-[18px] border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-1.5 px-4 py-3 text-left",
          open && "border-b border-[#f0f0f0]"
        )}
      >
        <Video
          className="h-[16px] w-[16px] shrink-0 text-muted-foreground"
          strokeWidth={1.8}
        />
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold">{heading}</span>
          <span className="block truncate text-[12px] text-muted-foreground">
            {description}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
          strokeWidth={1.8}
        />
      </button>

      <div className={cn("space-y-3 px-4 py-3.5", !open && "hidden")}>
        {contents.map((c) => {
          const state = progress[c.id];
          const duration = formatDuration(c.duration_seconds);
          const published = c.status === "published";
          return (
            <div key={c.id} className="rounded-[12px] border p-3">
              {published ? (
                c.thumbnail_url ? (
                  <img
                    src={c.thumbnail_url}
                    alt={`${c.title}のサムネイル`}
                    loading="lazy"
                    className="mb-2.5 aspect-video w-full rounded-[10px] object-cover"
                  />
                ) : (
                  <div className="mb-2.5 flex aspect-video w-full items-center justify-center rounded-[10px] bg-secondary">
                    <PlayCircle
                      className="h-8 w-8 text-muted-foreground"
                      strokeWidth={1.5}
                    />
                  </div>
                )
              ) : (
                <div className="mb-2.5 flex aspect-video w-full items-center justify-center rounded-[10px] bg-secondary text-[13px] text-muted-foreground">
                  動画は準備中です
                </div>
              )}

              <p className="text-[14px] font-medium leading-snug">{c.title}</p>
              {c.description && (
                <p className="mt-1 text-[12px] leading-[1.6] text-muted-foreground">
                  {c.description}
                </p>
              )}
              {published && duration && (
                <p className="mt-1.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {duration}
                </p>
              )}

              {state === "completed" ? (
                <p className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-[#34c759]/15 px-3 py-1.5 text-[12px] font-medium text-[#248a3d]">
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                  視聴済み
                </p>
              ) : (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {published && (
                    <button
                      type="button"
                      onClick={() => onWatch(c)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-transform active:scale-[0.97]"
                    >
                      <PlayCircle className="h-4 w-4" strokeWidth={2} />
                      動画を見る
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onSkip(c)}
                    className="inline-flex h-9 items-center rounded-full border px-4 text-[13px] transition-transform active:scale-[0.97]"
                  >
                    あとで見る
                  </button>
                  {state === "skipped" && (
                    <span className="self-center text-[12px] text-muted-foreground">
                      あとで見るに設定しました
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LearningContentCard;
