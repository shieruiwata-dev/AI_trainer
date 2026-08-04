import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import BackLink from "@/components/BackLink";
import { getStore, type DataStore } from "@/lib/store";
import type { TrainerMemory } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * サイドバーの「トレーナー」から開くページ。
 *
 * 「トレーナーが知っていること」= ChatGPT/Claudeのメモリー機能と同じ考え方で、
 * 会話を通じてDifyが学んだユーザーの特性を一覧表示し、1件ずつ削除できる。
 * 生成側(Dify + trainer_memories テーブル)は未実装のため、いまは
 * 一覧表示・削除のみが動く(テーブルが無い間は空表示になるだけで壊れない)。
 *
 * トレーナーのタイプ・性別・見た目の選択はこれから作る。
 */
export default function Trainer() {
  const [store, setStore] = useState<DataStore | null>(null);
  const [memories, setMemories] = useState<TrainerMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStore().then((s) => {
      if (cancelled) return;
      setStore(s);
      s.listTrainerMemories()
        .then((m) => {
          if (!cancelled) setMemories(m);
        })
        .catch(() => {
          // trainer_memories テーブル未作成 等でも空表示にするだけで済ませる
          if (!cancelled) setMemories([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function remove(id: string) {
    if (!store) return;
    const prev = memories;
    setDeletingId(id);
    setMemories((list) => list.filter((m) => m.id !== id));
    try {
      await store.deleteTrainerMemory(id);
    } catch {
      setMemories(prev); // 失敗したら元に戻す
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="animate-fade-in space-y-4 p-4 pb-[max(calc(env(safe-area-inset-bottom,0px)+1rem),1.5rem)] pt-[max(calc(env(safe-area-inset-top,0px)+0.5rem),0.75rem)]">
      <BackLink />
      <header className="px-1">
        <h1 className="text-[28px] leading-[1.14]">トレーナー</h1>
      </header>

      <section>
        <h2 className="px-1 text-[15px] font-semibold text-muted-foreground">
          トレーナーが知っていること
        </h2>

        {loading ? null : memories.length === 0 ? (
          <p className="mt-2 rounded-[18px] bg-muted px-4 py-6 text-center text-[14px] leading-relaxed text-muted-foreground">
            まだ何も覚えていません。
            <br />
            会話を重ねるとここに増えていきます。
          </p>
        ) : (
          <ul className="mt-2 overflow-hidden rounded-[18px] border bg-card">
            {memories.map((m, i) => (
              <li
                key={m.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  i > 0 && "border-t border-[#f0f0f0]"
                )}
              >
                <span className="flex-1 text-[15px] leading-snug">
                  {m.content}
                </span>
                <button
                  type="button"
                  aria-label="この記憶を削除"
                  disabled={deletingId === m.id}
                  onClick={() => void remove(m.id)}
                  className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-transform active:scale-90 disabled:opacity-40"
                >
                  <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
