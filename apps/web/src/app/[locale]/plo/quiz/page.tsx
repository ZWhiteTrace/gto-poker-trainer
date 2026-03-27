import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import { BookOpen, Scale, Trophy } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

const COPY = {
  en: {
    title: "PLO4 Quiz Hub",
    description: "Start with best-hand recognition. The rest of the PLO track should stay locked until the core rules are solid.",
    learnTitle: "PLO4 Basics Guide",
    learnDescription:
      "If the exact-2-hole-card rule is still shaky, read the guide first. Quiz volume will not fix a broken model.",
    bestHandTitle: "Best Hand Quiz",
    bestHandDescription:
      "Train the most common beginner failure mode in Omaha: misreading a board by using the wrong number of hole cards.",
    bestHandDifficulty: "Foundations",
    handQualityTitle: "Hand Quality Quiz",
    handQualityDescription:
      "Compare starting-hand structures and learn why rundowns and double-suited holdings dominate disconnected trash.",
    handQualityDifficulty: "Structure",
    start: "Start Quiz",
    readGuide: "Read Guide",
  },
  "zh-TW": {
    title: "PLO4 測驗中心",
    description: "先把最佳牌型判讀練穩。PLO 其他題型在核心規則沒站穩之前，不值得先展開。",
    learnTitle: "PLO4 基礎指南",
    learnDescription: "如果你對剛好 2 張手牌規則還不穩，先讀文章。題量堆再多，也修不好錯的心智模型。",
    bestHandTitle: "最佳牌型測驗",
    bestHandDescription: "先練最常見的新手錯誤：用錯手牌張數，導致整個 board 判讀都錯。",
    bestHandDifficulty: "基礎",
    handQualityTitle: "起手牌品質測驗",
    handQualityDescription: "比較起手牌結構，理解雙花順子牌為什麼通常比斷張垃圾牌更有發展性。",
    handQualityDifficulty: "結構",
    start: "開始測驗",
    readGuide: "閱讀指南",
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <BookOpen className="text-primary h-8 w-8" />
              <Badge variant="outline">{copy.readGuide}</Badge>
            </div>
            <CardTitle className="mt-2">{copy.learnTitle}</CardTitle>
            <CardDescription>{copy.learnDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/plo/learn">
              <Button variant="outline" className="w-full">
                {copy.readGuide}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Trophy className="text-primary h-8 w-8" />
              <Badge variant="outline">{copy.bestHandDifficulty}</Badge>
            </div>
            <CardTitle className="mt-2">{copy.bestHandTitle}</CardTitle>
            <CardDescription>{copy.bestHandDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/plo/quiz/best-hand">
              <Button className="w-full">{copy.start}</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Scale className="text-primary h-8 w-8" />
              <Badge variant="outline">{copy.handQualityDifficulty}</Badge>
            </div>
            <CardTitle className="mt-2">{copy.handQualityTitle}</CardTitle>
            <CardDescription>{copy.handQualityDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/plo/quiz/hand-quality">
              <Button className="w-full">{copy.start}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
