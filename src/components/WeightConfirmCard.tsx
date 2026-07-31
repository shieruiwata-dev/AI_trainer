import { useState } from "react";
import { Check, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WeightCandidate {
  /** 一意キー */
  id: string;
  label: string;
  note?: string;
  weightKg: number;
}

/**
 * 体重記録に不整合がある場合に、現在体重を確定させるためのカード。
 * 確定するまで「この目標で始める」は押せない。
 */
export function WeightConfirmCard({
  candidates,
  value,
  onConfirm,
}: {
  candidates: WeightCandidate[];
  value: number | null;
  onConfirm: (weightKg: number) => void;
}) {
  const [manual, setManual] = useState("");
  const [manualOpen, setManualOpen] = useState(false);

  const submitManual = () => {
    const n = Number(manual.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(n) || n <= 0) return;
    onConfirm(n);
  };

  return (
    <div className="mt-3 overflow-hidden rounded-[18px] border bg-card">
      <div className="flex items-center gap-1.5 border-b border-[#f0f0f0] px-4 py-3 text-[13px] font-semibold text-muted-foreground">
        <Scale className="h-[16px] w-[16px]" strokeWidth={1.8} />
        現在の体重を確認してください
      </div>
      <div className="px-4 py-3.5">
        <p className="text-[13px] leading-[1.6] text-muted-foreground">
          体重の記録に食い違いがあります。目標計算に使う現在体重を選んでください。
        </p>
        <div className="mt-3 space-y-2">
          {candidates.map((c) => {
            const selected = value != null && Math.abs(value - c.weightKg) < 0.001;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onConfirm(c.weightKg)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-[12px] border px-3.5 py-3 text-left transition-transform active:scale-[0.98]",
                  selected ? "border-primary bg-primary/5" : "bg-card"
                )}
              >
                <span>
                  <span className="block text-[14px] font-medium">
                    {c.label}
                  </span>
                  {c.note && (
                    <span className="block text-[12px] text-muted-foreground">
                      {c.note}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[16px] font-semibold [font-variant-numeric:tabular-nums]">
                    {c.weightKg}
                    <span className="text-[11px] font-normal text-muted-foreground">
                      kg
                    </span>
                  </span>
                  {selected && (
                    <Check className="h-4 w-4 text-primary" strokeWidth={2.4} />
                  )}
                </span>
              </button>
            );
          })}

          {manualOpen ? (
            <div className="flex gap-2">
              <input
                autoFocus
                inputMode="decimal"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="体重 (kg)"
                className="h-11 flex-1 rounded-[12px] border bg-card px-3.5 text-[14px] outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={submitManual}
                className="h-11 rounded-[12px] bg-primary px-4 text-[14px] font-medium text-primary-foreground transition-transform active:scale-[0.97]"
              >
                決定
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setManualOpen(true)}
              className="w-full rounded-[12px] border px-3.5 py-3 text-left text-[14px] font-medium transition-transform active:scale-[0.98]"
            >
              自分で入力する
            </button>
          )}
        </div>

        {value != null && (
          <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#34c759]/15 px-3 py-1.5 text-[12px] font-medium text-[#248a3d]">
            <Check className="h-3 w-3" strokeWidth={2.5} />
            現在体重 {value}kg で計算します
          </p>
        )}
      </div>
    </div>
  );
}

export default WeightConfirmCard;
