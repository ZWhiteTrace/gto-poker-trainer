import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spade, Target, Brain, TrendingUp, Zap, CheckCircle2, ArrowRight } from "lucide-react";
import { createPageMetadata, type AppLocale, toAppLocale } from "@/lib/metadata";

type Props = {
  params: Promise<{ locale: string }>;
};

const HOME_METADATA: Record<AppLocale, { title: string; description: string }> = {
  "zh-TW": {
    title: "免費德州撲克 GTO 練習工具 - 在線撲克範圍訓練器",
    description:
      "提升德撲技巧的免費 GTO 訓練器。提供翻前範圍表、Push/Fold 練習及 ICM 計算。無需下載註冊，立即開啟在線練習。",
  },
  en: {
    title: "Free GTO Poker Trainer - Online Preflop Range Practice",
    description:
      "Train preflop ranges, push-fold spots, and MTT decisions with a free online GTO poker trainer built for fast repetition.",
  },
};

const HOME_FAQ: Record<AppLocale, Array<{ question: string; answer: string }>> = {
  "zh-TW": [
    {
      question: "什麼是 GTO 撲克策略？",
      answer:
        "GTO（Game Theory Optimal，博弈論最優）是基於數學原理的撲克策略，讓你的打法更不容易被剝削。它包含平衡的範圍和頻率，降低對手針對你的空間。",
    },
    {
      question: "如何使用翻前範圍訓練器？",
      answer:
        "選擇你的位置和練習類型（RFI、VS RFI、VS 3-Bet），系統會隨機顯示手牌，你再選擇正確動作。訓練器會追蹤準確率，並找出你的弱點。",
    },
    {
      question: "這個撲克訓練器是免費的嗎？",
      answer:
        "是。GTO Poker Trainer 目前所有核心功能都可免費使用，包括翻前練習、Push/Fold 圖表和進度追蹤，不需要註冊才能開始。",
    },
    {
      question: "什麼是 Push/Fold 策略？",
      answer:
        "Push/Fold 策略用在錦標賽短籌碼情境，通常低於 15 個大盲注。此時不再小額加注，而是選擇全下或棄牌。我們的訓練器會依位置和籌碼深度提供最優範圍。",
    },
    {
      question: "這個中文版有哪些功能？",
      answer:
        "包含翻前範圍訓練（RFI、VS RFI、VS 3-Bet、VS 4-Bet）、Push/Fold 練習、ICM 計算器、機率測驗和手牌分析工具。",
    },
  ],
  en: [
    {
      question: "What is GTO poker strategy?",
      answer:
        "GTO stands for Game Theory Optimal. It is a mathematically balanced poker strategy designed to make your range harder to exploit over time.",
    },
    {
      question: "How do I use the preflop range trainer?",
      answer:
        "Choose a drill such as RFI, VS RFI, or VS 3-Bet. The trainer shows a random hand and position, and you respond with the correct action while the app tracks your accuracy.",
    },
    {
      question: "Is this poker trainer free?",
      answer:
        "Yes. The core training tools are free to use, including preflop drills, push-fold practice, and progress tracking.",
    },
    {
      question: "What is push-fold strategy?",
      answer:
        "Push-fold strategy applies to short-stack tournament spots, usually below 15 big blinds, where the best decision is often to jam all-in or fold.",
    },
    {
      question: "What tools are included in GTO Poker Trainer?",
      answer:
        "The app includes preflop drills, push-fold practice, ICM tools, probability quizzes, and hand analysis features for tournament and cash-game players.",
    },
  ],
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const appLocale = toAppLocale(locale);
  const metadata = HOME_METADATA[appLocale];

  return createPageMetadata({
    locale: appLocale,
    title: metadata.title,
    description: metadata.description,
  });
}

function FAQPageJsonLd({ locale }: { locale: AppLocale }) {
  const faq = HOME_FAQ[locale];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function Home({ params }: Props) {
  const { locale } = await params;
  const appLocale = toAppLocale(locale);
  const t = await getTranslations({ locale: appLocale });

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
      name: t("home.drills.pushFold.name"),
      description: t("home.drills.pushFold.description"),
      href: "/drill/push-fold",
    },
    {
      name: t("home.drills.rangeViewer.name"),
      description: t("home.drills.rangeViewer.description"),
      href: "/range",
    },
  ];

  return (
    <>
      <FAQPageJsonLd locale={appLocale} />
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
