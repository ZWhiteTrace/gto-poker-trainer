import { getAllGuides, getGuideCategories, getFeaturedGuides } from "@/lib/guides";
import { LearnPageClient } from "./learn-page-client";

export default function LearnIndexPage() {
  const guides = getAllGuides();
  const categories = getGuideCategories();
  const featuredGuides = getFeaturedGuides();

  return (
    <LearnPageClient
      guides={guides}
      categories={categories}
      featuredGuides={featuredGuides}
    />
  );
}

export const metadata = {
  title: "學習中心 - GTO Poker Trainer",
  description: "深入學習 GTO 撲克策略：翻前範圍、3-bet 應對、Push/Fold、ICM 計算等",
};
