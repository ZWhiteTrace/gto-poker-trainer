import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createPageMetadata } from "@/lib/metadata";
import { BookOpen, Scale, Trophy } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

const COPY = {
  en: {
    title: "PLO4 Learning Path",
    description:
      "Start with one article that fixes the biggest new-player mistake: treating Omaha like Hold'em with extra cards.",
    badge: "Foundations",
    articleTitle: "PLO4 Basics Guide",
    articleDescription:
      "Learn the must-use-2 rule, why hand structure matters, and which starting-hand shapes actually carry nut potential.",
    articleCta: "Read Guide",
    bestHandTitle: "Best Hand Quiz",
    bestHandDescription:
      "Use the guide, then pressure-test your board reading under the exact-2-hole-card rule.",
    handQualityTitle: "Hand Quality Quiz",
    handQualityDescription:
      "Compare starting hands and learn why double-suited rundowns dominate disconnected trash.",
    quizCta: "Open Quiz",
  },
  "zh-TW": {
    title: "PLO4 學習路線",
    description: "先用一篇文章把最常見的新手誤區打掉：不要把奧馬哈當成多兩張牌的德州。",
    badge: "基礎",
    articleTitle: "PLO4 基礎指南",
    articleDescription: "先理解 must-use-2 規則、起手牌結構，還有哪些牌真正有 nut potential。",
    articleCta: "閱讀文章",
    bestHandTitle: "最佳牌型測驗",
    bestHandDescription: "先看文章，再用題目驗證你是否真的會用剛好 2 張手牌讀 board。",
    handQualityTitle: "起手牌品質測驗",
    handQualityDescription: "比較起手牌結構，理解雙花順子牌為什麼通常比斷張垃圾牌更有前途。",
    quizCta: "開始測驗",
  },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  return createPageMetadata({
    locale,
    path: "/plo/learn",
    title: locale === "en" ? "PLO4 Learning Path - Omaha Fundamentals" : "PLO4 學習路線 - 奧馬哈基礎訓練",
    description:
      locale === "en"
        ? "Learn Pot-Limit Omaha fundamentals before moving into PLO4 quizzes."
        : "先學會 PLO4 奧馬哈基礎，再進入題型練習。",
  });
}

export default async function PLOLearnPage({ params }: Props) {
  const { locale } = await params;
  const copy = locale === "en" ? COPY.en : COPY["zh-TW"];

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-8 space-y-4">
        <Badge variant="outline">{copy.badge}</Badge>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{copy.title}</h1>
          <p className="text-muted-foreground max-w-3xl">{copy.description}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <BookOpen className="text-primary h-6 w-6" />
              <CardTitle>{copy.articleTitle}</CardTitle>
            </div>
            <CardDescription>{copy.articleDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/learn/plo4-basics">
              <Button>{copy.articleCta}</Button>
            </Link>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Trophy className="text-primary h-6 w-6" />
                <CardTitle>{copy.bestHandTitle}</CardTitle>
              </div>
              <CardDescription>{copy.bestHandDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/plo/quiz/best-hand">
                <Button variant="outline">{copy.quizCta}</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Scale className="text-primary h-6 w-6" />
                <CardTitle>{copy.handQualityTitle}</CardTitle>
              </div>
              <CardDescription>{copy.handQualityDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/plo/quiz/hand-quality">
                <Button variant="outline">{copy.quizCta}</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
