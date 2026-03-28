import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Brain, Layers3, Scale, Trophy } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

const COPY = {
  en: {
    title: "PLO4 Fundamentals",
    description:
      "A separate Omaha learning track focused on rule literacy first. This is not a full PLO solver product.",
    badge: "MVP",
    bestHandTitle: "Best Hand Quiz",
    bestHandDescription:
      "Given 4 hole cards and a full board, identify your best 5-card hand using exactly 2 hole cards and 3 board cards.",
    learnTitle: "PLO4 Basics Guide",
    learnDescription:
      "Read the fundamentals first if Omaha still feels like Hold'em with extra cards. That mental model is wrong.",
    handQualityTitle: "Hand Quality Quiz",
    handQualityDescription:
      "Compare two starting hands and identify which structure is stronger before any board is dealt.",
    rulesTitle: "What This Covers",
    rules: [
      "Must-use-2 rule",
      "Best hand identification",
      "Board-only and 1-card mistakes",
      "Starting-hand structure comparison",
    ],
    limitationsTitle: "What This Does Not Cover Yet",
    limitations: [
      "No PLO solver ranges",
      "No equity calculator",
      "No table trainer or AI opponent",
    ],
    cta: "Start Best Hand Quiz",
    quizHub: "View Quiz Hub",
    learnCta: "Read the Guide",
  },
  "zh-TW": {
    title: "PLO4 基礎訓練",
    description: "這是一條獨立的奧馬哈學習線，先教規則與牌型判讀，不假裝自己已經是完整 PLO solver 產品。",
    badge: "MVP",
    bestHandTitle: "最佳牌型測驗",
    bestHandDescription:
      "給你 4 張手牌和完整公牌，判斷最佳 5 張牌型，並強制遵守剛好 2 張手牌 + 3 張公牌規則。",
    learnTitle: "PLO4 基礎指南",
    learnDescription: "如果你還把奧馬哈當成多兩張牌的德州，先讀這篇。這個理解錯了，後面全都會錯。",
    handQualityTitle: "起手牌品質測驗",
    handQualityDescription: "比較兩手起手牌，判斷哪個結構在翻牌前更有發展性。",
    rulesTitle: "目前涵蓋",
    rules: ["必須用 2 張手牌規則", "最佳牌型判讀", "board-only 與 1 張手牌錯誤", "起手牌結構比較"],
    limitationsTitle: "目前還沒有",
    limitations: ["沒有 PLO solver 範圍", "沒有 equity calculator", "沒有 table trainer 或 AI 對手"],
    cta: "開始最佳牌型測驗",
    quizHub: "查看測驗中心",
    learnCta: "閱讀指南",
  },
} as const;

export default async function PLOIndexPage({ params }: Props) {
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

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <BookOpen className="text-primary h-6 w-6" />
                <CardTitle>{copy.learnTitle}</CardTitle>
              </div>
              <CardDescription>{copy.learnDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/plo/learn">
                <Button variant="outline">{copy.learnCta}</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Trophy className="text-primary h-6 w-6" />
                <CardTitle>{copy.bestHandTitle}</CardTitle>
              </div>
              <CardDescription>{copy.bestHandDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Link href="/plo/quiz/best-hand">
                  <Button>{copy.cta}</Button>
                </Link>
                <Link href="/plo/quiz">
                  <Button variant="outline">{copy.quizHub}</Button>
                </Link>
              </div>
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
                <Button variant="outline">{copy.handQualityTitle}</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Brain className="text-primary h-5 w-5" />
                <CardTitle>{copy.rulesTitle}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {copy.rules.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Layers3 className="text-primary h-5 w-5" />
                <CardTitle>{copy.limitationsTitle}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {copy.limitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
