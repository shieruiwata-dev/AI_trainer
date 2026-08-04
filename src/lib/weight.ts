import type { WeightLog } from "@/lib/types";

/**
 * 体重記録を1日1件に絞る。同じ日に複数あるときは**あとから保存した方**を採用する。
 *
 * 体重を訂正しても既存の行は更新されず、別の行として追加される
 * (`confirm_pending_action` が insert するため)。このとき訂正版の
 * `measured_at` が元の記録より前になることがあり、測定日時順で最後を採ると
 * **誤った古い値が残ってしまう**(2026-08-04: 8/3を63kg→67.3kgに訂正しても
 * グラフが63kgのままだった件)。
 *
 * そこで保存日時(`createdAt`)が新しい方を優先する。
 * `createdAt` が無い記録(ローカル保存の旧データ)は、渡された順=測定日時の
 * 昇順とみなして後ろにあるものを優先する。
 *
 * 戻り値は日付の昇順。
 */
export function latestPerDay(list: WeightLog[]): WeightLog[] {
  const best = new Map<string, { log: WeightLog; at: number; index: number }>();

  list.forEach((log, index) => {
    const at = log.createdAt ? new Date(log.createdAt).getTime() : NaN;
    const current = best.get(log.date);
    if (!current) {
      best.set(log.date, { log, at, index });
      return;
    }
    const bothHaveTime = Number.isFinite(at) && Number.isFinite(current.at);
    const isNewer = bothHaveTime ? at > current.at : index > current.index;
    if (isNewer) best.set(log.date, { log, at, index });
  });

  return [...best.values()]
    .map((v) => v.log)
    .sort((a, b) => a.date.localeCompare(b.date));
}
