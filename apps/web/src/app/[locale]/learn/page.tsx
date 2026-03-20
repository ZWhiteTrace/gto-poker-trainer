import { createSectionMetadata } from "@/lib/sectionMetadata";
import { getAllGuides, getGuideCategories, getFeaturedGuides, type GuideLocale } from "@/lib/guides";
import { LearnPageClient } from "./learn-page-client";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return createSectionMetadata(locale, "learn");
}

function toGuideLocale(locale: string): GuideLocale {
  return locale === "en" ? "en" : "zh-TW";
}

export default async function LearnIndexPage({ params }: Props) {
  const { locale } = await params;
  const guideLocale = toGuideLocale(locale);
  const guides = getAllGuides(guideLocale);
  const categories = getGuideCategories(guideLocale);
  const featuredGuides = getFeaturedGuides(guideLocale);

  return (
    <LearnPageClient guides={guides} categories={categories} featuredGuides={featuredGuides} />
  );
}
