import Link from "next/link";
import { getAllGuides, getGuideCategories } from "@/lib/guides";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Target, Trophy, Layers } from "lucide-react";

const categoryConfig: Record<
  string,
  { label: string; labelEn: string; icon: typeof BookOpen; color: string }
> = {
  fundamentals: {
    label: "基礎概念",
    labelEn: "Fundamentals",
    icon: BookOpen,
    color: "bg-purple-500/10 text-purple-500",
  },
  preflop: {
    label: "翻前策略",
    labelEn: "Preflop",
    icon: Target,
    color: "bg-blue-500/10 text-blue-500",
  },
  postflop: {
    label: "翻後策略",
    labelEn: "Postflop",
    icon: Layers,
    color: "bg-green-500/10 text-green-500",
  },
  mtt: {
    label: "MTT 策略",
    labelEn: "MTT",
    icon: Trophy,
    color: "bg-amber-500/10 text-amber-500",
  },
  advanced: {
    label: "進階概念",
    labelEn: "Advanced",
    icon: Target,
    color: "bg-red-500/10 text-red-500",
  },
};

export default function LearnIndexPage() {
  const guides = getAllGuides();
  const categories = getGuideCategories();

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">學習中心</h1>
        <p className="text-muted-foreground">
          深入學習 GTO 撲克策略，從基礎到進階
        </p>
      </div>

      {categories.map((category) => {
        const config = categoryConfig[category] || {
          label: category,
          labelEn: category,
          icon: BookOpen,
          color: "bg-gray-500/10 text-gray-500",
        };
        const Icon = config.icon;
        const categoryGuides = guides.filter((g) => g.category === category);

        return (
          <div key={category} className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className={`p-2 rounded-lg ${config.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold">{config.label}</h2>
              <span className="text-sm text-muted-foreground">
                ({config.labelEn})
              </span>
            </div>

            <div className="grid gap-4">
              {categoryGuides.map((guide) => (
                <Link key={guide.slug} href={`/learn/${guide.slug}`}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{guide.title}</CardTitle>
                        <Badge variant="secondary" className={config.color}>
                          {config.labelEn}
                        </Badge>
                      </div>
                      <CardDescription>{guide.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <span className="text-sm text-primary hover:underline">
                        閱讀文章 →
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const metadata = {
  title: "學習中心 - GTO Poker Trainer",
  description: "深入學習 GTO 撲克策略：翻前範圍、3-bet 應對、Push/Fold、ICM 計算等",
};
