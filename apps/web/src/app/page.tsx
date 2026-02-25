import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spade, Target, Brain, TrendingUp, Zap, CheckCircle2, ArrowRight } from "lucide-react";

function FAQPageJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "什么是 GTO 扑克策略？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "GTO（Game Theory Optimal，博弈论最优）是基于数学原理的扑克策略，让你的打法无法被剥削。它包含平衡的范围和频率，防止对手获得优势。",
        },
      },
      {
        "@type": "Question",
        name: "如何使用翻前范围训练器？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "选择你的位置和练习类型（RFI、VS RFI、VS 3-Bet），训练器会随机显示手牌，你选择正确的动作。系统会追踪你的准确率，并识别你游戏中的弱点。",
        },
      },
      {
        "@type": "Question",
        name: "这个扑克训练器是免费的吗？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "是的！GTO Poker Trainer 完全免费使用。所有功能包括翻前练习、Push/Fold 图表和进度追踪都可以免费使用，无需注册账号。",
        },
      },
      {
        "@type": "Question",
        name: "什么是 Push/Fold 策略？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Push/Fold 策略用于锦标赛中筹码较短时（通常低于 15 个大盲注）。不再小额加注，而是选择全下（Push）或弃牌（Fold）。我们的训练器根据位置和筹码深度教授最优的 Push/Fold 范围。",
        },
      },
      {
        "@type": "Question",
        name: "GTO Poker Trainer 中文版有哪些功能？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "包括：翻前范围训练（RFI、VS RFI、VS 3-Bet、VS 4-Bet）、Push/Fold 图表、ICM 计算器、EV 计算练习、Outs 计算练习、手牌历史分析等。全中文界面，无需下载注册。",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function Home() {
  const t = await getTranslations();

  const features = [
    {
      icon: Target,
      title: t("home.features.preflopMastery.title"),
      description: t("home.features.preflopMastery.description"),
    },
    {
      icon: Brain,
      title: t("home.features.understandWhy.title"),
      description: t("home.features.understandWhy.description"),
    },
    {
      icon: TrendingUp,
      title: t("home.features.trackProgress.title"),
      description: t("home.features.trackProgress.description"),
    },
    {
      icon: Zap,
      title: t("home.features.practiceAnywhere.title"),
      description: t("home.features.practiceAnywhere.description"),
    },
  ];

  const drillTypes = [
    {
      name: t("home.drills.rfi.name"),
      description: t("home.drills.rfi.description"),
      href: "/drill/rfi",
    },
    {
      name: t("home.drills.vsRfi.name"),
      description: t("home.drills.vsRfi.description"),
      href: "/drill/vs-rfi",
    },
    {
      name: t("home.drills.vs3bet.name"),
      description: t("home.drills.vs3bet.description"),
      href: "/drill/vs-3bet",
    },
    {
      name: t("home.drills.rangeViewer.name"),
      description: t("home.drills.rangeViewer.description"),
      href: "/range",
    },
  ];

  return (
    <>
      <FAQPageJsonLd />
      <div className="flex flex-col">
        {/* Hero Section */}
        <section className="from-background to-muted/30 relative overflow-hidden bg-gradient-to-b py-20 md:py-32">
          <div className="relative z-10 container">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary" className="mb-4">
                {t("home.badge")}
              </Badge>
              <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                {t("home.title")} <span className="text-primary">{t("home.titleHighlight")}</span>{" "}
                {t("home.titleSuffix")}
              </h1>
              <p className="text-muted-foreground mb-8 text-lg md:text-xl">{t("home.subtitle")}</p>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Button size="lg" asChild>
                  <Link href="/drill/rfi">
                    {t("home.startTraining")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/range">{t("home.viewRanges")}</Link>
                </Button>
              </div>
            </div>
          </div>
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10 opacity-30">
            <div className="bg-primary/20 absolute top-1/4 left-1/4 h-64 w-64 rounded-full blur-3xl" />
            <div className="bg-primary/20 absolute right-1/4 bottom-1/4 h-64 w-64 rounded-full blur-3xl" />
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="container">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold">{t("home.whyTitle")}</h2>
              <p className="text-muted-foreground">{t("home.whySubtitle")}</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  className="hover:border-primary/50 border-2 transition-colors"
                >
                  <CardHeader>
                    <feature.icon className="text-primary mb-2 h-10 w-10" />
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Drill Types Section */}
        <section className="bg-muted/30 py-20">
          <div className="container">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold">{t("home.practiceModesTitle")}</h2>
              <p className="text-muted-foreground">{t("home.practiceModesSubtitle")}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {drillTypes.map((drill) => (
                <Link key={drill.name} href={drill.href}>
                  <Card className="h-full transition-all hover:-translate-y-1 hover:shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Spade className="text-primary h-5 w-5" />
                        {drill.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{drill.description}</CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container">
            <Card className="border-primary/20 from-primary/5 to-primary/10 border-2 bg-gradient-to-r">
              <CardContent className="flex flex-col items-center gap-6 py-12 text-center">
                <h2 className="text-3xl font-bold">{t("home.ctaTitle")}</h2>
                <ul className="text-muted-foreground flex flex-col gap-2 md:flex-row md:gap-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    {t("home.ctaFeatures.free")}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    {t("home.ctaFeatures.noCard")}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    {t("home.ctaFeatures.instant")}
                  </li>
                </ul>
                <Button size="lg" asChild>
                  <Link href="/drill/rfi">
                    {t("home.startFreeTraining")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </>
  );
}
