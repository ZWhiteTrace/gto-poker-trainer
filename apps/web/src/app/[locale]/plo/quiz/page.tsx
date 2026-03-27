import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import { Trophy } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

const COPY = {
  en: {
    title: "PLO4 Quiz Hub",
    description: "Start with best-hand recognition. The rest of the PLO track should stay locked until the core rules are solid.",
    cardTitle: "Best Hand Quiz",
    cardDescription:
      "Train the most common beginner failure mode in Omaha: misreading a board by using the wrong number of hole cards.",
    difficulty: "Foundations",
    start: "Start Quiz",
  },
  "zh-TW": {
    title: "PLO4 測驗中心",
    description: "先把最佳牌型判讀練穩。PLO 其他題型在核心規則沒站穩之前，不值得先展開。",
    cardTitle: "最佳牌型測驗",
    cardDescription: "先練最常見的新手錯誤：用錯手牌張數，導致整個 board 判讀都錯。",
    difficulty: "基礎",
    start: "開始測驗",
  },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  return createPageMetadata({
    locale,
    path: "/plo/quiz",
    title: locale === "en" ? "PLO4 Quiz Hub - Omaha Fundamentals" : "PLO4 測驗中心 - 奧馬哈基礎訓練",
    description:
      locale === "en"
        ? "Practice core Omaha rules through focused PLO4 quizzes, starting with best-hand recognition."
        : "用聚焦題型練習 PLO4 奧馬哈核心規則，從最佳牌型判讀開始。",
  });
}

export default async function PLOQuizIndexPage({ params }: Props) {
  const { locale } = await params;
  const copy = locale === "en" ? COPY.en : COPY["zh-TW"];

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold">{copy.title}</h1>
        <p className="text-muted-foreground max-w-2xl">{copy.description}</p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Trophy className="text-primary h-8 w-8" />
            <Badge variant="outline">{copy.difficulty}</Badge>
          </div>
          <CardTitle className="mt-2">{copy.cardTitle}</CardTitle>
          <CardDescription>{copy.cardDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/plo/quiz/best-hand">
            <Button className="w-full">{copy.start}</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
