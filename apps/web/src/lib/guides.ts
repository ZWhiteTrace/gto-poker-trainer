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
  "position-strategy-deep-dive": {
    title: "位置策略深入剖析",
    description: "從入門到精通：各位置的詳細策略和調整技巧",
    category: "fundamentals",
    order: 7,
  },
  "gto-vs-exploit-strategy": {
    title: "GTO vs 剝削策略",
    description: "何時該用 GTO？何時該剝削？完整的策略選擇指南",
    category: "fundamentals",
    order: 8,
  },
  "beginners-complete-guide": {
    title: "新手完全入門指南",
    description: "從零開始學德州撲克：規則、策略、資金管理一次搞定",
    category: "fundamentals",
    order: 9,
  },
  "hand-reading-fundamentals": {
    title: "讀牌基礎教學",
    description: "從翻前到河牌的範圍思考：學會像職業玩家一樣讀牌",
    category: "fundamentals",
    order: 10,
  },
  "bankroll-management": {
    title: "資金管理完全指南",
    description: "撲克生存法則：升降級規則、波動管理、職業玩家建議",
    category: "fundamentals",
    order: 11,
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
