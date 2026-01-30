// ============================================
// Article Recommendations for Quiz/Exam System
// Maps question types and topics to relevant learning articles
// ============================================

export interface ArticleRecommendation {
  title: string;
  titleZh: string;
  path: string;
  description: string;
}

// Map question types to recommended articles
export const TYPE_TO_ARTICLES: Record<string, ArticleRecommendation[]> = {
  logic: [
    {
      title: "GTO vs Exploit Strategy",
      titleZh: "GTO vs 剝削策略",
      path: "/learn/gto-vs-exploit-strategy",
      description: "Learn when to play GTO and when to exploit.",
    },
    {
      title: "MDF Explained",
      titleZh: "MDF 完整解析",
      path: "/learn/mdf-explained",
      description: "Understand Minimum Defense Frequency.",
    },
  ],
  equity: [
    {
      title: "Poker Math Essentials",
      titleZh: "撲克數學精要",
      path: "/learn/poker-math-essentials",
      description: "Master the math behind poker decisions.",
    },
    {
      title: "Pot Odds Guide",
      titleZh: "底池賠率指南",
      path: "/learn/pot-odds-guide",
      description: "Calculate and apply pot odds correctly.",
    },
    {
      title: "Equity Realization Explained",
      titleZh: "Equity 實現率解析",
      path: "/learn/equity-realization-explained",
      description: "Why raw equity isn't everything.",
    },
  ],
  position: [
    {
      title: "Position Strategy Deep Dive",
      titleZh: "位置策略深度解析",
      path: "/learn/position-strategy-deep-dive",
      description: "Master positional play.",
    },
    {
      title: "RFI Ranges Guide",
      titleZh: "RFI 範圍指南",
      path: "/learn/rfi-ranges-guide",
      description: "Learn opening ranges by position.",
    },
    {
      title: "Position Basics",
      titleZh: "位置基礎",
      path: "/learn/position-basics",
      description: "Understand why position matters.",
    },
  ],
  push_fold: [
    {
      title: "Push/Fold Complete Guide",
      titleZh: "Push/Fold 完整指南",
      path: "/learn/push-fold-complete-guide",
      description: "Master short stack decisions.",
    },
    {
      title: "Short Stack Strategy",
      titleZh: "短籌碼策略",
      path: "/learn/short-stack-strategy",
      description: "Play optimally with short stacks.",
    },
    {
      title: "ICM Explained",
      titleZh: "ICM 詳解",
      path: "/learn/icm-explained",
      description: "Understand tournament equity.",
    },
  ],
};

// Map specific question IDs to articles (for more precise recommendations)
export const QUESTION_TO_ARTICLES: Record<string, ArticleRecommendation[]> = {
  // C-bet related
  cb1: [
    {
      title: "C-Bet Strategy",
      titleZh: "C-Bet 策略",
      path: "/learn/cbet-strategy",
      description: "Master continuation betting.",
    },
    {
      title: "Board Texture Analysis",
      titleZh: "牌面質地分析",
      path: "/learn/board-texture-analysis",
      description: "Read boards like a pro.",
    },
  ],
  cb2: [
    {
      title: "Postflop C-Bet Guide",
      titleZh: "翻後 C-Bet 指南",
      path: "/learn/postflop-cbet-guide",
      description: "When to c-bet and when not to.",
    },
  ],
  cb3: [
    {
      title: "C-Bet Strategy",
      titleZh: "C-Bet 策略",
      path: "/learn/cbet-strategy",
      description: "IP vs OOP c-betting differences.",
    },
  ],
  // Defense related
  df1: [
    {
      title: "MDF Explained",
      titleZh: "MDF 完整解析",
      path: "/learn/mdf-explained",
      description: "Calculate your defense frequency.",
    },
  ],
  df2: [
    {
      title: "MDF Explained",
      titleZh: "MDF 完整解析",
      path: "/learn/mdf-explained",
      description: "How bet sizing affects defense.",
    },
  ],
  df3: [
    {
      title: "Facing 3-Bet Strategy",
      titleZh: "面對 3-Bet 策略",
      path: "/learn/facing-3bet-strategy",
      description: "Defend your blinds correctly.",
    },
  ],
  // Exploit related
  ex1: [
    {
      title: "Population Exploits",
      titleZh: "群體剝削策略",
      path: "/learn/population-exploits",
      description: "Exploit common tendencies.",
    },
  ],
  ex2: [
    {
      title: "VS Calling Station",
      titleZh: "對付跟注站",
      path: "/learn/vs-calling-station",
      description: "Beat the calling station.",
    },
  ],
  ex3: [
    {
      title: "VS LAG Player",
      titleZh: "對付 LAG 玩家",
      path: "/learn/vs-lag-player",
      description: "Handle aggressive opponents.",
    },
  ],
  // EV related
  ev1: [
    {
      title: "Poker Math Essentials",
      titleZh: "撲克數學精要",
      path: "/learn/poker-math-essentials",
      description: "Calculate EV correctly.",
    },
  ],
  ev2: [
    {
      title: "Pot Odds Guide",
      titleZh: "底池賠率指南",
      path: "/learn/pot-odds-guide",
      description: "When calls are profitable.",
    },
  ],
  // Blocker related
  l6: [
    {
      title: "Blocker Effects Guide",
      titleZh: "阻擋牌效應指南",
      path: "/learn/blocker-effects-guide",
      description: "Use blockers strategically.",
    },
  ],
  // Postflop river
  pf8: [
    {
      title: "River Decisions Guide",
      titleZh: "河牌決策指南",
      path: "/learn/river-decisions-guide",
      description: "Master river polarization.",
    },
    {
      title: "Polarization Concepts",
      titleZh: "極化概念",
      path: "/learn/polarization-concepts",
      description: "Understand range polarization.",
    },
  ],
  // Double barrel
  pf7: [
    {
      title: "Turn Play Fundamentals",
      titleZh: "轉牌基礎",
      path: "/learn/turn-play-fundamentals",
      description: "When to double barrel.",
    },
  ],
  // 3-bet related
  p4: [
    {
      title: "3-Bet Ranges Construction",
      titleZh: "3-Bet 範圍構建",
      path: "/learn/3bet-ranges-construction",
      description: "Build optimal 3-bet ranges.",
    },
  ],
  // Multiway
  l8: [
    {
      title: "Multiway Pot Adjustments",
      titleZh: "多人底池調整",
      path: "/learn/multiway-pot-adjustments",
      description: "Play multiway pots correctly.",
    },
  ],
};

/**
 * Get article recommendations based on wrong questions
 * @param wrongQuestionIds Array of question IDs that were answered incorrectly
 * @param questionTypes Record mapping question ID to type
 * @returns Array of recommended articles (deduplicated, limited to top 5)
 */
export function getArticleRecommendations(
  wrongQuestionIds: string[],
  questionTypes: Record<string, string>
): ArticleRecommendation[] {
  const recommendations = new Map<string, ArticleRecommendation>();

  for (const questionId of wrongQuestionIds) {
    // First check for question-specific recommendations
    const specificArticles = QUESTION_TO_ARTICLES[questionId];
    if (specificArticles) {
      for (const article of specificArticles) {
        if (!recommendations.has(article.path)) {
          recommendations.set(article.path, article);
        }
      }
    }

    // Then check for type-based recommendations
    const questionType = questionTypes[questionId];
    if (questionType) {
      const typeArticles = TYPE_TO_ARTICLES[questionType];
      if (typeArticles) {
        for (const article of typeArticles) {
          if (!recommendations.has(article.path)) {
            recommendations.set(article.path, article);
          }
        }
      }
    }
  }

  // Return top 5 recommendations
  return Array.from(recommendations.values()).slice(0, 5);
}

/**
 * Analyze wrong answers and return improvement areas
 * @param wrongQuestionIds Array of question IDs that were answered incorrectly
 * @param questionTypes Record mapping question ID to type
 * @returns Summary of weak areas
 */
export function analyzeWeakAreas(
  wrongQuestionIds: string[],
  questionTypes: Record<string, string>
): { type: string; count: number; percentage: number }[] {
  const typeCounts = new Map<string, number>();

  for (const questionId of wrongQuestionIds) {
    const type = questionTypes[questionId];
    if (type) {
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    }
  }

  const total = wrongQuestionIds.length;
  const areas = Array.from(typeCounts.entries())
    .map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  return areas;
}
