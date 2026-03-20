"use client";

import { useState, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import type { GuideMetadata, Difficulty } from "@/lib/guides";
import { useLocale } from "next-intl";
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

const learnCopy = {
  "zh-TW": {
    pageTitle: "學習中心",
    pageDescription: "深入學習 GTO 撲克策略，從基礎到進階",
    searchPlaceholder: "搜尋文章...",
    searchResults: "搜尋結果",
    articlesSuffix: "篇",
    noResults: "找不到符合的文章，請嘗試其他關鍵字",
    featuredTitle: "新手必讀",
    featuredSubtitle: "從這裡開始你的 GTO 之旅",
    difficultyLegend: "難度說明：",
    readArticle: "閱讀文章 →",
    chineseOnlyBadge: "繁中內容",
    fallbackBannerTitle: "英文文章尚未上線",
    fallbackBannerDescription:
      "目前教學文章以繁體中文發布為主。英文介面已可使用，但多數文章仍會顯示原文內容。",
  },
  en: {
    pageTitle: "Learning Center",
    pageDescription: "Study GTO poker strategy from fundamentals to advanced concepts",
    searchPlaceholder: "Search guides...",
    searchResults: "Search Results",
    articlesSuffix: "articles",
    noResults: "No matching guides found. Try another keyword.",
    featuredTitle: "Start Here",
    featuredSubtitle: "Core guides for getting your GTO study path started",
    difficultyLegend: "Difficulty:",
    readArticle: "Read Article →",
    chineseOnlyBadge: "Traditional Chinese",
    fallbackBannerTitle: "English guide articles are not fully published yet",
    fallbackBannerDescription:
      "The learning center UI is localized, but most guide articles are still written in Traditional Chinese.",
  },
} as const;

function DifficultyBadge({
  difficulty,
  locale,
}: {
  difficulty: Difficulty;
  locale: "zh-TW" | "en";
}) {
  const config = difficultyConfig[difficulty];
  const labelMap = {
    "zh-TW": config.label,
    en:
      difficulty === "beginner"
        ? "Beginner"
        : difficulty === "intermediate"
          ? "Intermediate"
          : "Advanced",
  };
  return (
    <Badge variant="outline" className={`text-xs ${config.color}`}>
      {"⭐".repeat(config.stars)} {labelMap[locale]}
    </Badge>
  );
}

function GuideCard({ guide, locale }: { guide: GuideMetadata; locale: "zh-TW" | "en" }) {
  const copy = learnCopy[locale];

  return (
    <Link href={`/learn/${guide.slug}`}>
      <Card className="hover:bg-muted/50 h-full cursor-pointer transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight">{guide.title}</CardTitle>
            <DifficultyBadge difficulty={guide.difficulty} locale={locale} />
          </div>
          {locale === "en" && guide.contentLocale !== "en" && (
            <div>
              <Badge variant="outline" className="text-xs">
                {copy.chineseOnlyBadge}
              </Badge>
            </div>
          )}
          <CardDescription className="line-clamp-2 text-sm">{guide.description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <span className="text-primary text-sm hover:underline">{copy.readArticle}</span>
        </CardContent>
      </Card>
    </Link>
  );
}

function CategorySection({
  category,
  guides,
  locale,
  defaultOpen = false,
}: {
  category: string;
  guides: GuideMetadata[];
  locale: "zh-TW" | "en";
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
  const copy = learnCopy[locale];

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
            <h2 className="text-lg font-semibold">{locale === "en" ? config.labelEn : config.label}</h2>
            <span className="text-muted-foreground text-sm">
              {(locale === "en" ? config.label : config.labelEn) || category} · {guides.length}{" "}
              {copy.articlesSuffix}
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
            <GuideCard key={guide.slug} guide={guide} locale={locale} />
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
  const locale = useLocale() === "en" ? "en" : "zh-TW";
  const copy = learnCopy[locale];
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
        <h1 className="text-3xl font-bold">{copy.pageTitle}</h1>
        <p className="text-muted-foreground">{copy.pageDescription}</p>
      </div>

      {locale === "en" && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="text-sm font-semibold text-amber-700">{copy.fallbackBannerTitle}</div>
          <p className="mt-2 text-sm text-amber-800">{copy.fallbackBannerDescription}</p>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-8">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          type="text"
          placeholder={copy.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isSearching ? (
        /* Search Results */
        <div>
          <h2 className="mb-4 text-lg font-semibold">
            {copy.searchResults} ({filteredGuides.length} {copy.articlesSuffix})
          </h2>
          {filteredGuides.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredGuides.map((guide) => (
                <GuideCard key={guide.slug} guide={guide} locale={locale} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-8 text-center">{copy.noResults}</p>
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
              <h2 className="text-xl font-semibold">{copy.featuredTitle}</h2>
              <span className="text-muted-foreground text-sm">{copy.featuredSubtitle}</span>
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
                    {locale === "en" && guide.contentLocale !== "en" && (
                      <CardContent className="pt-0">
                        <Badge variant="outline" className="text-xs">
                          {copy.chineseOnlyBadge}
                        </Badge>
                      </CardContent>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Difficulty Legend */}
          <div className="bg-muted/30 mb-6 flex flex-wrap gap-3 rounded-lg p-3">
            <span className="text-muted-foreground text-sm">{copy.difficultyLegend}</span>
            <DifficultyBadge difficulty="beginner" locale={locale} />
            <DifficultyBadge difficulty="intermediate" locale={locale} />
            <DifficultyBadge difficulty="advanced" locale={locale} />
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
                  locale={locale}
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
