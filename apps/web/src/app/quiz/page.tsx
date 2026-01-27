"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, Brain, TrendingUp, Lightbulb } from "lucide-react";

const quizTypes = [
  {
    id: "equity",
    icon: Calculator,
    difficulty: "easy",
    available: true,
  },
  {
    id: "outs",
    icon: Brain,
    difficulty: "medium",
    available: true,
  },
  {
    id: "ev",
    icon: TrendingUp,
    difficulty: "medium",
    available: false, // Coming soon
  },
  {
    id: "logic",
    icon: Lightbulb,
    difficulty: "hard",
    available: false, // Coming soon
  },
];

export default function QuizIndexPage() {
  const t = useTranslations();

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("quiz.title")}</h1>
        <p className="text-muted-foreground">
          Test your poker knowledge with interactive quizzes
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {quizTypes.map((quiz) => {
          const Icon = quiz.icon;
          const titleKey = `home.drills.${quiz.id === "equity" ? "rangeViewer" : quiz.id}.name` as any;
          const descKey = `home.drills.${quiz.id === "equity" ? "rangeViewer" : quiz.id}.description` as any;

          return (
            <Card
              key={quiz.id}
              className={!quiz.available ? "opacity-60" : ""}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Icon className="h-8 w-8 text-primary" />
                  <Badge
                    variant={
                      quiz.difficulty === "easy"
                        ? "default"
                        : quiz.difficulty === "medium"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {quiz.difficulty === "easy"
                      ? "簡單"
                      : quiz.difficulty === "medium"
                      ? "中等"
                      : "困難"}
                  </Badge>
                </div>
                <CardTitle className="mt-2">
                  {quiz.id === "equity"
                    ? t("quiz.equity.title")
                    : quiz.id === "outs"
                    ? t("quiz.outs.title")
                    : quiz.id === "ev"
                    ? "EV 測驗"
                    : "邏輯測驗"}
                </CardTitle>
                <CardDescription>
                  {quiz.id === "equity"
                    ? t("quiz.equity.description")
                    : quiz.id === "outs"
                    ? t("quiz.outs.description")
                    : quiz.id === "ev"
                    ? "底池賠率與 EV 決策"
                    : "GTO 原理推理"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {quiz.available ? (
                  <Link href={`/quiz/${quiz.id}`}>
                    <Button className="w-full">開始測驗</Button>
                  </Link>
                ) : (
                  <Button className="w-full" disabled>
                    即將推出
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
