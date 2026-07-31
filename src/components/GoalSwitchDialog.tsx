/**
 * 既存のactive目標と新しい目的が異なる場合に表示する切り替え確認モーダル。
 */
export function GoalSwitchDialog({
  open,
  busy = false,
  currentGoalLabel,
  nextGoalLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  busy?: boolean;
  currentGoalLabel?: string | null;
  nextGoalLabel?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-[18px] border bg-card p-5">
        <p className="text-[16px] font-semibold tracking-[-0.02em]">
          現在の目標を終了し、新しい目標へ切り替えますか？
        </p>
        {(currentGoalLabel || nextGoalLabel) && (
          <p className="mt-2 text-[13px] leading-[1.6] text-muted-foreground">
            {currentGoalLabel && <>現在: {currentGoalLabel}</>}
            {currentGoalLabel && nextGoalLabel && " → "}
            {nextGoalLabel && <>新しい目標: {nextGoalLabel}</>}
          </p>
        )}
        <div className="mt-5 space-y-2">
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="h-11 w-full rounded-full bg-primary text-[15px] font-medium text-primary-foreground transition-transform active:scale-[0.97] disabled:opacity-50"
          >
            切り替える
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="h-11 w-full rounded-full border bg-card text-[15px] font-medium transition-transform active:scale-[0.97] disabled:opacity-50"
          >
            戻る
          </button>
        </div>
      </div>
    </div>
  );
}

export default GoalSwitchDialog;
