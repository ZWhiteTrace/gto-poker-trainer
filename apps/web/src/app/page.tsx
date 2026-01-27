import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Spade,
  Target,
  Brain,
  TrendingUp,
  Zap,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

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
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/30 py-20 md:py-32">
        <div className="container relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              {t("home.badge")}
            </Badge>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              {t("home.title")}{" "}
              <span className="text-primary">{t("home.titleHighlight")}</span>{" "}
              {t("home.titleSuffix")}
            </h1>
            <p className="mb-8 text-lg text-muted-foreground md:text-xl">
              {t("home.subtitle")}
            </p>
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
          <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute right-1/4 bottom-1/4 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
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
                className="border-2 transition-colors hover:border-primary/50"
              >
                <CardHeader>
                  <feature.icon className="mb-2 h-10 w-10 text-primary" />
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
            <h2 className="mb-4 text-3xl font-bold">
              {t("home.practiceModesTitle")}
            </h2>
            <p className="text-muted-foreground">
              {t("home.practiceModesSubtitle")}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {drillTypes.map((drill) => (
              <Link key={drill.name} href={drill.href}>
                <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Spade className="h-5 w-5 text-primary" />
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
          <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="flex flex-col items-center gap-6 py-12 text-center">
              <h2 className="text-3xl font-bold">{t("home.ctaTitle")}</h2>
              <ul className="flex flex-col gap-2 text-muted-foreground md:flex-row md:gap-6">
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
  );
}
