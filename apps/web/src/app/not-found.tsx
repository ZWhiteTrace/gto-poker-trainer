import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, BookOpen, Target, BarChart3 } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <h1 className="text-muted-foreground mb-4 text-6xl font-bold">404</h1>
      <h2 className="mb-2 text-2xl font-semibold">找不到頁面</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        你要找的頁面不存在或已被移動。試試以下連結繼續訓練：
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/">
          <Button variant="default" className="gap-2">
            <Home className="h-4 w-4" />
            首頁
          </Button>
        </Link>
        <Link href="/drill/rfi">
          <Button variant="outline" className="gap-2">
            <Target className="h-4 w-4" />
            RFI 練習
          </Button>
        </Link>
        <Link href="/learn">
          <Button variant="outline" className="gap-2">
            <BookOpen className="h-4 w-4" />
            學習中心
          </Button>
        </Link>
        <Link href="/range">
          <Button variant="outline" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            範圍表
          </Button>
        </Link>
      </div>
    </div>
  );
}
