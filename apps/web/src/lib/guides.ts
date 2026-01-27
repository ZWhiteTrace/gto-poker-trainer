import fs from "fs";
import path from "path";
import matter from "gray-matter";

const guidesDirectory = path.join(process.cwd(), "content/guides");

export interface GuideMetadata {
  slug: string;
  title: string;
  description: string;
  category: string;
  order: number;
}

export interface Guide extends GuideMetadata {
  content: string;
}

const guideMetadata: Record<string, Omit<GuideMetadata, "slug">> = {
  "rfi-ranges-guide": {
    title: "RFI 翻前開池範圍完全指南",
    description: "掌握各位置的標準開池範圍，從 UTG 到 BTN 的完整策略",
    category: "preflop",
    order: 1,
  },
  "facing-3bet-strategy": {
    title: "面對 3-Bet 完全策略指南",
    description: "學習如何正確應對 3-bet：4-bet、跟注還是棄牌",
    category: "preflop",
    order: 2,
  },
  "push-fold-complete-guide": {
    title: "Push/Fold 策略完全指南",
    description: "短籌碼 MTT 必備：Nash 均衡推/棄範圍詳解",
    category: "mtt",
    order: 3,
  },
  "icm-explained": {
    title: "ICM 計算完全解讀",
    description: "理解籌碼價值非線性：泡沫期和決賽桌的決策調整",
    category: "mtt",
    order: 4,
  },
  "postflop-cbet-guide": {
    title: "翻後 C-Bet 策略指南",
    description: "根據牌面結構選擇正確的持續下注頻率和尺度",
    category: "postflop",
    order: 5,
  },
  "common-mistakes": {
    title: "翻前常見錯誤及糾正",
    description: "避免這些常見的翻前錯誤，立即提升你的勝率",
    category: "fundamentals",
    order: 6,
  },
};

export function getAllGuides(): GuideMetadata[] {
  const slugs = Object.keys(guideMetadata);

  return slugs
    .map((slug) => ({
      slug,
      ...guideMetadata[slug],
    }))
    .sort((a, b) => a.order - b.order);
}

export function getGuidesByCategory(category: string): GuideMetadata[] {
  return getAllGuides().filter((guide) => guide.category === category);
}

export function getGuide(slug: string): Guide | null {
  const meta = guideMetadata[slug];
  if (!meta) return null;

  const fullPath = path.join(guidesDirectory, `${slug}.md`);

  try {
    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { content } = matter(fileContents);

    return {
      slug,
      ...meta,
      content,
    };
  } catch {
    return null;
  }
}

export function getGuideCategories(): string[] {
  const guides = getAllGuides();
  return [...new Set(guides.map((g) => g.category))];
}
