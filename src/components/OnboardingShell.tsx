import { ChevronLeft } from "lucide-react";

/** 目標設計オンボーディング共通のレイアウト(進捗 + 見出し) */
export default function OnboardingShell({
  step,
  total,
  title,
  description,
  onBack,
  children,
}: {
  step: number;
  total: number;
  title: string;
  description?: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col px-6 py-8">
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="-ml-1 rounded-full p-1 text-muted-foreground active:scale-95"
              aria-label="前へ戻る"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <span className="text-sm font-semibold text-muted-foreground">
            {step}/{total}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${(step / total) * 100}%` }}
          />
        </div>
      </div>

      <h1 className="text-2xl font-bold leading-snug">{title}</h1>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      )}

      <div className="mt-8">{children}</div>
    </div>
  );
}
