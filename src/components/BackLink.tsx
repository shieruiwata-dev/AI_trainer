import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

/** チャット(起点画面)へ戻るリンク。下タブ廃止後の各画面共通ヘッダー */
export default function BackLink() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-0.5 px-1 text-[17px] text-primary transition-transform active:scale-95"
    >
      <ChevronLeft className="h-5 w-5" strokeWidth={2} />
      トレーナー
    </Link>
  );
}
