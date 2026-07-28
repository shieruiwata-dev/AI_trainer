import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <p className="text-muted-foreground">ページが見つかりませんでした</p>
      <Button asChild>
        <Link to="/">ホームに戻る</Link>
      </Button>
    </div>
  );
}
