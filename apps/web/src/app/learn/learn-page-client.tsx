"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { GuideMetadata, Difficulty } from "@/lib/guides";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Target,
  Trophy,
  Layers,
  ChevronDown,
  ChevronRight,
  Search,
  Star,
  Sparkles,
} from "lucide-react";

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

const difficultyConfig: Record<Difficulty, { label: string; color: string; stars: number }> = {
  beginner: {
    label: "初級",
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    stars: 1,
  },
  intermediate: {
    label: "中級",
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    stars: 2,
  },
  advanced: {
    label: "進階",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    stars: 3,
  },
};

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const config = difficultyConfig[difficulty];
  return (
    <Badge variant="outline" className={`text-xs ${config.color}`}>
      {"⭐".repeat(config.stars)} {config.label}
    </Badge>
  );
}

function GuideCard({ guide }: { guide: GuideMetadata }) {
  const config = categoryConfig[guide.category] || {
    label: guide.category,
    labelEn: guide.category,
    icon: BookOpen,
    color: "bg-gray-500/10 text-gray-500",
  };

  return (
    <Link href={`/learn/${guide.slug}`}>
      <Card className="hover:bg-muted/50 h-full cursor-pointer transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight">{guide.title}</CardTitle>
            <DifficultyBadge difficulty={guide.difficulty} />
          </div>
          <CardDescription className="line-clamp-2 text-sm">{guide.description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <span className="text-primary text-sm hover:underline">閱讀文章 →</span>
        </CardContent>
      </Card>
    </Link>
  );
}

function CategorySection({
  category,
  guides,
  defaultOpen = false,
}: {
  category: string;
  guides: GuideMetadata[];
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const config = categoryConfig[category] || {
    label: category,
    labelEn: category,
    icon: BookOpen,
    color: "bg-gray-500/10 text-gray-500",
  };
  const Icon = config.icon;

  return (
    <div className="overflow-hidden rounded-lg border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hover:bg-muted/50 flex w-full items-center justify-between p-4 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${config.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-semibold">{config.label}</h2>
            <span className="text-muted-foreground text-sm">
              {config.labelEn} · {guides.length} 篇文章
            </span>
          </div>
        </div>
        {isOpen ? (
          <ChevronDown className="text-muted-foreground h-5 w-5" />
        ) : (
          <ChevronRight className="text-muted-foreground h-5 w-5" />
        )}
      </button>

      {isOpen && (
        <div className="grid gap-3 p-4 pt-0 sm:grid-cols-2">
          {guides.map((guide) => (
            <GuideCard key={guide.slug} guide={guide} />
          ))}
        </div>
      )}
    </div>
  );
}

interface LearnPageClientProps {
  guides: GuideMetadata[];
  categories: string[];
  featuredGuides: GuideMetadata[];
}

export function LearnPageClient({ guides, categories, featuredGuides }: LearnPageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGuides = useMemo(() => {
    if (!searchQuery.trim()) return guides;
    const query = searchQuery.toLowerCase();
    return guides.filter(
      (guide) =>
        guide.title.toLowerCase().includes(query) || guide.description.toLowerCase().includes(query)
    );
  }, [guides, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">學習中心</h1>
        <p className="text-muted-foreground">深入學習 GTO 撲克策略，從基礎到進階</p>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          type="text"
          placeholder="搜尋文章..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isSearching ? (
        /* Search Results */
        <div>
          <h2 className="mb-4 text-lg font-semibold">搜尋結果 ({filteredGuides.length} 篇)</h2>
          {filteredGuides.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredGuides.map((guide) => (
                <GuideCard key={guide.slug} guide={guide} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-8 text-center">
              找不到符合的文章，請嘗試其他關鍵字
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Featured Section */}
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-yellow-500/10 p-2 text-yellow-500">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold">新手必讀</h2>
              <span className="text-muted-foreground text-sm">從這裡開始你的 GTO 之旅</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {featuredGuides.map((guide) => (
                <Link key={guide.slug} href={`/learn/${guide.slug}`}>
                  <Card className="hover:bg-muted/50 h-full cursor-pointer border-yellow-500/20 bg-yellow-500/5 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <CardTitle className="text-base">{guide.title}</CardTitle>
                      </div>
                      <CardDescription className="line-clamp-2 text-sm">
                        {guide.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Difficulty Legend */}
          <div className="bg-muted/30 mb-6 flex flex-wrap gap-3 rounded-lg p-3">
            <span className="text-muted-foreground text-sm">難度說明：</span>
            <DifficultyBadge difficulty="beginner" />
            <DifficultyBadge difficulty="intermediate" />
            <DifficultyBadge difficulty="advanced" />
          </div>

          {/* Category Sections */}
          <div className="space-y-4">
            {categories.map((category, index) => {
              const categoryGuides = filteredGuides.filter((g) => g.category === category);
              if (categoryGuides.length === 0) return null;

              return (
                <CategorySection
                  key={category}
                  category={category}
                  guides={categoryGuides}
                  defaultOpen={index === 0}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
