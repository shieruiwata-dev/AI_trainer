import { useEffect, useState } from "react";

/**
 * チャットに表示するトレーナーのアイコン(顔写真)。
 *
 * 画像は `src/assets/trainers/{id}.(png|jpg|jpeg|webp)` に置く。
 * **正方形の顔まわりだけを切り出した画像**を想定している(丸く表示するため)。
 * 全身画像を置きたい場合は catalog の `objectPosition` で顔の位置に寄せる。
 *
 * ファイルが無くてもビルドが通るよう glob で解決し、
 * 見つからなければ頭文字のフォールバックを表示する。
 */

export type TrainerId = "flow" | "fresh" | "power" | "hard";

export interface Trainer {
  id: TrainerId;
  /** 設定画面に出す短いラベル */
  name: string;
  /** 得意分野の一言 */
  tagline: string;
  /** 画像が無いときに丸の中へ出す1文字 */
  initial: string;
  /** 画像URL(未配置なら null) */
  image: string | null;
  /** 全身画像を使うときの顔の位置合わせ */
  objectPosition: string;
}

const CATALOG: Omit<Trainer, "image">[] = [
  {
    id: "flow",
    name: "しなやか",
    tagline: "ヨガ・ストレッチ中心",
    initial: "し",
    objectPosition: "50% 50%",
  },
  {
    id: "fresh",
    name: "さわやか",
    tagline: "筋トレ・ボディメイク",
    initial: "さ",
    objectPosition: "50% 50%",
  },
  {
    id: "power",
    name: "パワフル",
    tagline: "本格トレーニング",
    initial: "パ",
    objectPosition: "50% 50%",
  },
  {
    id: "hard",
    name: "ストイック",
    tagline: "追い込むハード系",
    initial: "ス",
    objectPosition: "50% 50%",
  },
];

// 画像ファイルはまだ無い場合もあるため、存在するものだけを拾う
const imageModules = import.meta.glob<string>(
  "../assets/trainers/*.{png,jpg,jpeg,webp}",
  { eager: true, import: "default", query: "?url" }
);

function imageFor(id: string): string | null {
  for (const [path, url] of Object.entries(imageModules)) {
    const base = path.split("/").pop()?.replace(/\.\w+$/, "");
    if (base === id) return url;
  }
  return null;
}

export const TRAINERS: Trainer[] = CATALOG.map((t) => ({
  ...t,
  image: imageFor(t.id),
}));

export const DEFAULT_TRAINER_ID: TrainerId = "flow";

export function getTrainer(id: string | null | undefined): Trainer {
  return (
    TRAINERS.find((t) => t.id === id) ??
    TRAINERS.find((t) => t.id === DEFAULT_TRAINER_ID) ??
    TRAINERS[0]
  );
}

const KEY = "fitcoach.trainer_icon";
/** 設定画面での変更をチャット画面へ即時に反映するための通知 */
const CHANGE_EVENT = "fitcoach:trainer-changed";

export function loadTrainerId(): TrainerId {
  try {
    const raw = localStorage.getItem(KEY);
    return getTrainer(raw).id;
  } catch {
    return DEFAULT_TRAINER_ID;
  }
}

export function saveTrainerId(id: TrainerId) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // 保存できなくても表示は続行する
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/**
 * 選択中のトレーナーを購読する。
 * 設定画面(オーバーレイ)で変更すると、裏のチャット画面にもすぐ反映される。
 */
export function useSelectedTrainer(): {
  trainer: Trainer;
  select: (id: TrainerId) => void;
} {
  const [id, setId] = useState<TrainerId>(() => loadTrainerId());

  useEffect(() => {
    const sync = () => setId(loadTrainerId());
    window.addEventListener(CHANGE_EVENT, sync);
    // 別タブ・別画面での変更にも追従する
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return {
    trainer: getTrainer(id),
    select: (next: TrainerId) => {
      setId(next);
      saveTrainerId(next);
    },
  };
}
