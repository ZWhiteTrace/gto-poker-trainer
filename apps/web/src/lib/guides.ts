import fs from "fs";
import path from "path";
import matter from "gray-matter";

const guidesDirectory = path.join(process.cwd(), "content/guides");

export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface GuideMetadata {
  slug: string;
  title: string;
  description: string;
  category: string;
  order: number;
  difficulty: Difficulty;
  featured?: boolean;
}

export interface Guide extends GuideMetadata {
  content: string;
}

const guideMetadata: Record<string, Omit<GuideMetadata, "slug">> = {
  // === FUNDAMENTALS (基礎概念) ===
  "beginners-complete-guide": {
    title: "新手完全入門指南",
    description: "從零開始學德州撲克：規則、策略、資金管理一次搞定",
    category: "fundamentals",
    order: 1,
    difficulty: "beginner",
    featured: true,
  },
  "poker-hand-rankings": {
    title: "撲克手牌排名完整指南",
    description: "從高牌到皇家同花順：詳細了解所有牌型及其強度",
    category: "fundamentals",
    order: 2,
    difficulty: "beginner",
    featured: true,
  },
  "position-basics": {
    title: "位置基礎入門",
    description: "理解位置的重要性：為什麼按鈕位是最佳位置",
    category: "fundamentals",
    order: 3,
    difficulty: "beginner",
    featured: true,
  },
  "position-strategy-deep-dive": {
    title: "位置策略深入剖析",
    description: "從入門到精通：各位置的詳細策略和調整技巧",
    category: "fundamentals",
    order: 4,
    difficulty: "intermediate",
  },
  "betting-actions-explained": {
    title: "下注行動完整解析",
    description: "Check、Bet、Raise、Call、Fold 的正確使用時機",
    category: "fundamentals",
    order: 5,
    difficulty: "beginner",
  },
  "pot-odds-simplified": {
    title: "底池賠率簡化教學",
    description: "快速計算底池賠率：新手也能輕鬆掌握的方法",
    category: "fundamentals",
    order: 6,
    difficulty: "beginner",
    featured: true,
  },
  "pot-odds-guide": {
    title: "底池賠率進階指南",
    description: "深入理解底池賠率與隱含賠率的完整應用",
    category: "fundamentals",
    order: 7,
    difficulty: "intermediate",
  },
  "poker-math-essentials": {
    title: "撲克數學精要",
    description: "贏家必備的計算能力：Outs、Equity、EV 完全解讀",
    category: "fundamentals",
    order: 8,
    difficulty: "intermediate",
  },
  "hand-reading-fundamentals": {
    title: "讀牌基礎教學",
    description: "從翻前到河牌的範圍思考：學會像職業玩家一樣讀牌",
    category: "fundamentals",
    order: 9,
    difficulty: "intermediate",
  },
  "bankroll-management": {
    title: "資金管理完全指南",
    description: "撲克生存法則：升降級規則、波動管理、職業玩家建議",
    category: "fundamentals",
    order: 10,
    difficulty: "beginner",
    featured: true,
  },
  "common-mistakes": {
    title: "翻前常見錯誤及糾正",
    description: "避免這些常見的翻前錯誤，立即提升你的勝率",
    category: "fundamentals",
    order: 11,
    difficulty: "beginner",
  },
  "mental-game-fundamentals": {
    title: "心理遊戲基礎",
    description: "控制情緒、避免 Tilt：職業玩家的心理建設",
    category: "fundamentals",
    order: 12,
    difficulty: "beginner",
  },
  "gto-vs-exploit-strategy": {
    title: "GTO vs 剝削策略",
    description: "何時該用 GTO？何時該剝削？完整的策略選擇指南",
    category: "fundamentals",
    order: 13,
    difficulty: "intermediate",
  },
  "table-selection": {
    title: "選桌策略完全指南",
    description: "找到最有利可圖的牌桌：線上和現場的選桌技巧",
    category: "fundamentals",
    order: 14,
    difficulty: "beginner",
  },
  "cash-vs-tournament": {
    title: "現金局 vs 錦標賽比較",
    description: "兩種格式的完整差異分析：選擇適合你的撲克之路",
    category: "fundamentals",
    order: 15,
    difficulty: "beginner",
  },
  "live-poker-adjustments": {
    title: "現場撲克調整策略",
    description: "從線上到現場：必要的策略調整和行為讀取",
    category: "fundamentals",
    order: 16,
    difficulty: "intermediate",
  },
  "free-gto-resources": {
    title: "免費 GTO 撲克資源完整指南",
    description: "所有免費 GTO 學習資源整理：範圍圖表、訓練工具、學習路線",
    category: "fundamentals",
    order: 17,
    difficulty: "beginner",
  },
  "taiwan-poker-guide": {
    title: "台灣德州撲克指南",
    description: "線上線下完整攻略：平台選擇、俱樂部介紹、新手入門須知",
    category: "fundamentals",
    order: 18,
    difficulty: "beginner",
    featured: true,
  },

  // === PREFLOP (翻前策略) ===
  "6max-preflop-chart": {
    title: "6-Max 翻前範圍圖表完整指南",
    description: "六人桌翻前開池範圍速查表：各位置 RFI 頻率和關鍵手牌",
    category: "preflop",
    order: 19,
    difficulty: "beginner",
  },
  "rfi-ranges-guide": {
    title: "RFI 翻前開池範圍完全指南",
    description: "掌握各位置的標準開池範圍，從 UTG 到 BTN 的完整策略",
    category: "preflop",
    order: 20,
    difficulty: "beginner",
  },
  "pocket-pairs-strategy": {
    title: "口袋對子完整策略指南",
    description: "從 AA 到 22：如何在各種情況下正確處理口袋對子",
    category: "preflop",
    order: 21,
    difficulty: "intermediate",
  },
  "3bet-ranges-construction": {
    title: "3-Bet 範圍構建指南",
    description: "建立平衡的 3-Bet 範圍：價值牌和詐唬牌的比例",
    category: "preflop",
    order: 22,
    difficulty: "intermediate",
  },
  "facing-3bet-strategy": {
    title: "面對 3-Bet 完全策略指南",
    description: "學習如何正確應對 3-bet：4-bet、跟注還是棄牌",
    category: "preflop",
    order: 23,
    difficulty: "intermediate",
  },
  "squeeze-play-guide": {
    title: "Squeeze Play 策略指南",
    description: "掌握擠壓打法：何時、如何以及用什麼牌進行 Squeeze",
    category: "preflop",
    order: 24,
    difficulty: "intermediate",
  },
  "short-stack-strategy": {
    title: "短籌碼策略指南",
    description: "10-25BB 的生存法則：Push/Fold 和開池策略",
    category: "preflop",
    order: 25,
    difficulty: "intermediate",
  },
  "deep-stack-play": {
    title: "深籌碼策略指南",
    description: "100BB+ 的高階玩法：SPR 概念和多條街規劃",
    category: "preflop",
    order: 26,
    difficulty: "advanced",
  },
  "heads-up-fundamentals": {
    title: "單挑基礎策略",
    description: "1v1 對決的特殊規則：範圍調整和心理戰術",
    category: "preflop",
    order: 27,
    difficulty: "intermediate",
  },

  // === POSTFLOP (翻後策略) ===
  "postflop-cbet-guide": {
    title: "翻後 C-Bet 策略指南",
    description: "根據牌面結構選擇正確的持續下注頻率和尺度",
    category: "postflop",
    order: 30,
    difficulty: "intermediate",
  },
  "cbet-strategy": {
    title: "C-Bet 進階策略",
    description: "深入了解多街 C-Bet：牌面紋理分析和範圍優勢",
    category: "postflop",
    order: 31,
    difficulty: "advanced",
  },
  "postflop-bet-sizing": {
    title: "翻後下注尺寸指南",
    description: "選擇正確的下注大小：價值下注和詐唬的尺寸策略",
    category: "postflop",
    order: 32,
    difficulty: "intermediate",
  },
  "check-raise-strategy": {
    title: "Check-Raise 策略指南",
    description: "掌握過牌加注的藝術：何時、如何有效使用 Check-Raise",
    category: "postflop",
    order: 33,
    difficulty: "intermediate",
  },
  "value-betting-guide": {
    title: "價值下注完全指南",
    description: "最大化你的獲利：薄價值下注和厚價值下注的技巧",
    category: "postflop",
    order: 34,
    difficulty: "intermediate",
  },
  "bluff-catching-principles": {
    title: "抓詐唬原則指南",
    description: "識別詐唬機會：何時跟注、何時棄牌的決策框架",
    category: "postflop",
    order: 35,
    difficulty: "intermediate",
  },
  "pot-control-strategies": {
    title: "底池控制策略",
    description: "中等牌力的處理：何時控制底池、何時建立底池",
    category: "postflop",
    order: 36,
    difficulty: "intermediate",
  },
  "turn-play-fundamentals": {
    title: "轉牌圈策略基礎",
    description: "轉牌的關鍵決策：繼續下注、過牌還是放棄",
    category: "postflop",
    order: 37,
    difficulty: "intermediate",
  },
  "river-decisions-guide": {
    title: "河牌圈決策指南",
    description: "最後一條街的關鍵：價值下注、詐唬和抓詐唬",
    category: "postflop",
    order: 38,
    difficulty: "intermediate",
  },
  "multiway-pot-adjustments": {
    title: "多人底池調整策略",
    description: "面對多個對手時的策略調整：更緊、更直接",
    category: "postflop",
    order: 39,
    difficulty: "intermediate",
  },
  "board-texture-analysis": {
    title: "牌面結構深度分析",
    description: "讀懂每一塊 Flop：連接性、花色、高低三維度分析",
    category: "postflop",
    order: 40,
    difficulty: "advanced",
  },
  "geometric-bet-sizing": {
    title: "幾何下注尺度指南",
    description: "數學化的下注規劃：多條街取值最大化",
    category: "postflop",
    order: 41,
    difficulty: "advanced",
  },

  // === MTT (錦標賽策略) ===
  "push-fold-complete-guide": {
    title: "Push/Fold 策略完全指南",
    description: "短籌碼 MTT 必備：Nash 均衡推/棄範圍詳解",
    category: "mtt",
    order: 50,
    difficulty: "intermediate",
  },
  "icm-explained": {
    title: "ICM 計算完全解讀",
    description: "理解籌碼價值非線性：泡沫期和決賽桌的決策調整",
    category: "mtt",
    order: 51,
    difficulty: "intermediate",
  },
  "final-table-strategy": {
    title: "決賽桌策略指南",
    description: "錦標賽最後戰役：ICM 壓力下的決策和籌碼結構分析",
    category: "mtt",
    order: 52,
    difficulty: "advanced",
  },
  "tournament-stages-strategy": {
    title: "錦標賽各階段策略",
    description: "從早期到泡沫到決賽桌：不同階段的策略調整",
    category: "mtt",
    order: 53,
    difficulty: "intermediate",
  },
  "cev-vs-dollar-ev-tournament": {
    title: "cEV vs $EV 錦標賽進階",
    description: "籌碼期望值 vs 金錢期望值：ICM 決策的核心概念",
    category: "mtt",
    order: 54,
    difficulty: "advanced",
  },

  // === ADVANCED (進階概念) ===
  "mdf-explained": {
    title: "MDF 最小防守頻率詳解",
    description: "理解 MDF 概念：何時必須防守、何時可以棄牌",
    category: "advanced",
    order: 60,
    difficulty: "advanced",
  },
  "blocker-effects-guide": {
    title: "阻擋效應完全指南",
    description: "利用阻擋牌優化決策：詐唬和價值下注的進階考量",
    category: "advanced",
    order: 61,
    difficulty: "advanced",
  },
  "polarization-concepts": {
    title: "極化範圍概念解析",
    description: "理解極化 vs 合併範圍：何時使用哪種策略",
    category: "advanced",
    order: 62,
    difficulty: "advanced",
  },
  "mixed-strategies-explained": {
    title: "混合策略詳解",
    description: "GTO 中的隨機化：為什麼同一手牌要用不同方式玩",
    category: "advanced",
    order: 63,
    difficulty: "advanced",
  },
  "range-vs-range-analysis": {
    title: "範圍對範圍分析",
    description: "像 Solver 一樣思考：範圍優勢和牌面紋理分析",
    category: "advanced",
    order: 64,
    difficulty: "advanced",
  },
  "node-locking-strategies": {
    title: "Node Locking 策略應用",
    description: "利用 Solver 進行對手建模：針對性策略調整",
    category: "advanced",
    order: 65,
    difficulty: "advanced",
  },
  "solver-outputs-interpretation": {
    title: "Solver 輸出解讀指南",
    description: "正確理解和應用 Solver 結果：避免常見誤解",
    category: "advanced",
    order: 66,
    difficulty: "advanced",
  },
  "equity-realization-explained": {
    title: "權益實現率 (EQR) 完整指南",
    description: "原始權益 vs 實際收益：位置和可玩性如何影響你的勝率",
    category: "advanced",
    order: 67,
    difficulty: "advanced",
  },
  "spr-stack-to-pot-ratio": {
    title: "SPR 堆疊底池比深度解析",
    description: "用 SPR 規劃翻後策略：承諾門檻和下注規劃",
    category: "advanced",
    order: 68,
    difficulty: "advanced",
  },
  "population-exploits": {
    title: "人群剝削策略指南",
    description: "從 GTO 到實戰：識別並利用人群的共同錯誤",
    category: "advanced",
    order: 69,
    difficulty: "advanced",
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

export function getFeaturedGuides(): GuideMetadata[] {
  return getAllGuides().filter((guide) => guide.featured);
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
  const categoryOrder = ["fundamentals", "preflop", "postflop", "mtt", "advanced"];
  const categories = [...new Set(guides.map((g) => g.category))];
  return categories.sort((a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b));
}
