import { describe, it, expect } from "vitest";
import {
  classifyFlop,
  analyzeFlop,
  analyzeSuitDistribution,
  computeGapSum,
  checkPaired,
  generateFlopOfTexture,
  FLOP_TEXTURE_CATEGORIES,
  type FlopTextureType,
} from "@/lib/poker/flopTexture";
import type { Rank, Suit } from "@/lib/poker/types";

describe("classifyFlop", () => {
  describe("Ace + Broadway patterns", () => {
    it("should classify ABB (Ace + 2 Broadway)", () => {
      expect(classifyFlop(["A", "K", "Q"])).toBe("ABB");
      expect(classifyFlop(["A", "K", "J"])).toBe("ABB");
      expect(classifyFlop(["A", "K", "T"])).toBe("ABB");
      expect(classifyFlop(["A", "Q", "J"])).toBe("ABB");
      expect(classifyFlop(["A", "J", "T"])).toBe("ABB");
    });

    it("should classify ABx (Ace + 1 Broadway + 1 low)", () => {
      expect(classifyFlop(["A", "K", "7"])).toBe("ABx");
      expect(classifyFlop(["A", "Q", "3"])).toBe("ABx");
      expect(classifyFlop(["A", "J", "5"])).toBe("ABx");
      expect(classifyFlop(["A", "T", "8"])).toBe("ABx");
    });

    it("should classify Axx (Ace + 2 low)", () => {
      expect(classifyFlop(["A", "7", "2"])).toBe("Axx");
      expect(classifyFlop(["A", "8", "3"])).toBe("Axx");
      expect(classifyFlop(["A", "9", "5"])).toBe("Axx");
    });
  });

  describe("Broadway patterns (no Ace)", () => {
    it("should classify BBB (3 Broadway no Ace)", () => {
      expect(classifyFlop(["K", "Q", "J"])).toBe("BBB");
      expect(classifyFlop(["K", "Q", "T"])).toBe("BBB");
      expect(classifyFlop(["K", "J", "T"])).toBe("BBB");
      expect(classifyFlop(["Q", "J", "T"])).toBe("BBB");
    });

    it("should classify BBx (2 Broadway + 1 low)", () => {
      expect(classifyFlop(["K", "Q", "5"])).toBe("BBx");
      expect(classifyFlop(["J", "T", "3"])).toBe("BBx");
      expect(classifyFlop(["K", "J", "8"])).toBe("BBx");
      expect(classifyFlop(["Q", "T", "4"])).toBe("BBx");
    });
  });

  describe("Single Broadway patterns", () => {
    it("should classify KQx (K or Q high + 2 low)", () => {
      expect(classifyFlop(["K", "8", "3"])).toBe("KQx");
      expect(classifyFlop(["Q", "7", "2"])).toBe("KQx");
      expect(classifyFlop(["K", "9", "4"])).toBe("KQx");
      expect(classifyFlop(["Q", "6", "3"])).toBe("KQx");
    });

    it("should classify JTx (J or T high + disconnected low)", () => {
      // Disconnected: gap sum > 4
      expect(classifyFlop(["J", "8", "3"])).toBe("JTx"); // J(11)-8-3 gap = 3+5 = 8
      expect(classifyFlop(["T", "5", "2"])).toBe("JTx"); // T(10)-5-2 gap = 5+3 = 8
    });

    it("should classify JT_conn (J or T high + connected low)", () => {
      // Connected: gap sum <= 4
      expect(classifyFlop(["J", "9", "8"])).toBe("JT_conn"); // J-9-8 gap = 2+1 = 3
      expect(classifyFlop(["T", "8", "7"])).toBe("JT_conn"); // T-8-7 gap = 2+1 = 3
      expect(classifyFlop(["J", "9", "7"])).toBe("JT_conn"); // J-9-7 gap = 2+2 = 4
    });
  });

  describe("Low card patterns", () => {
    it("should classify Low_conn (all low, connected)", () => {
      expect(classifyFlop(["9", "8", "7"])).toBe("Low_conn"); // gap = 1+1 = 2
      expect(classifyFlop(["8", "7", "6"])).toBe("Low_conn"); // gap = 1+1 = 2
      expect(classifyFlop(["7", "6", "5"])).toBe("Low_conn"); // gap = 1+1 = 2
      expect(classifyFlop(["9", "7", "6"])).toBe("Low_conn"); // gap = 2+1 = 3
    });

    it("should classify Low_unconn (all low, disconnected)", () => {
      expect(classifyFlop(["9", "5", "2"])).toBe("Low_unconn"); // gap = 4+3 = 7
      expect(classifyFlop(["8", "4", "2"])).toBe("Low_unconn"); // gap = 4+2 = 6
      expect(classifyFlop(["7", "3", "2"])).toBe("Low_unconn"); // gap = 4+1 = 5
    });
  });

  describe("Paired boards", () => {
    it("should classify Paired", () => {
      expect(classifyFlop(["K", "K", "5"])).toBe("Paired");
      expect(classifyFlop(["7", "7", "3"])).toBe("Paired");
      expect(classifyFlop(["A", "A", "2"])).toBe("Paired");
      expect(classifyFlop(["9", "9", "3"])).toBe("Paired");
    });

    it("should classify Trips", () => {
      expect(classifyFlop(["7", "7", "7"])).toBe("Trips");
      expect(classifyFlop(["K", "K", "K"])).toBe("Trips");
      expect(classifyFlop(["2", "2", "2"])).toBe("Trips");
    });
  });
});

describe("analyzeSuitDistribution", () => {
  it("should detect rainbow (all different suits)", () => {
    expect(analyzeSuitDistribution(["h", "d", "c"])).toBe("rainbow");
    expect(analyzeSuitDistribution(["s", "h", "d"])).toBe("rainbow");
  });

  it("should detect twotone (2 same suit)", () => {
    expect(analyzeSuitDistribution(["h", "h", "d"])).toBe("twotone");
    expect(analyzeSuitDistribution(["s", "d", "s"])).toBe("twotone");
  });

  it("should detect monotone (all same suit)", () => {
    expect(analyzeSuitDistribution(["h", "h", "h"])).toBe("monotone");
    expect(analyzeSuitDistribution(["s", "s", "s"])).toBe("monotone");
  });
});

describe("computeGapSum", () => {
  it("should compute gap sum correctly", () => {
    // J(11)-9-8 = (11-9) + (9-8) = 2 + 1 = 3
    expect(computeGapSum(["J", "9", "8"])).toBe(3);

    // J(11)-8-3 = (11-8) + (8-3) = 3 + 5 = 8
    expect(computeGapSum(["J", "8", "3"])).toBe(8);

    // 9-8-7 = (9-8) + (8-7) = 1 + 1 = 2
    expect(computeGapSum(["9", "8", "7"])).toBe(2);

    // 9-5-2 = (9-5) + (5-2) = 4 + 3 = 7
    expect(computeGapSum(["9", "5", "2"])).toBe(7);
  });
});

describe("checkPaired", () => {
  it("should detect paired boards", () => {
    const result = checkPaired(["K", "K", "5"]);
    expect(result.isPaired).toBe(true);
    expect(result.isTrips).toBe(false);
    expect(result.pairedRank).toBe(13); // K = 13
  });

  it("should detect trips", () => {
    const result = checkPaired(["7", "7", "7"]);
    expect(result.isPaired).toBe(true);
    expect(result.isTrips).toBe(true);
    expect(result.pairedRank).toBe(7);
  });

  it("should return false for unpaired", () => {
    const result = checkPaired(["A", "K", "Q"]);
    expect(result.isPaired).toBe(false);
    expect(result.isTrips).toBe(false);
    expect(result.pairedRank).toBeUndefined();
  });
});

describe("analyzeFlop", () => {
  it("should provide complete analysis", () => {
    const result = analyzeFlop(["A", "K", "Q"], ["h", "h", "d"]);

    expect(result.texture).toBe("ABB");
    expect(result.suitDistribution).toBe("twotone");
    expect(result.aceCount).toBe(1);
    expect(result.broadwayCount).toBe(2);
    expect(result.lowCount).toBe(0);
    expect(result.highestRank).toBe(14);
    expect(result.isPaired).toBe(false);
    expect(result.hasFlushDraw).toBe(true);
  });

  it("should detect connectivity", () => {
    const connected = analyzeFlop(["9", "8", "7"], ["h", "d", "c"]);
    expect(connected.isConnected).toBe(true);
    expect(connected.gapSum).toBe(2);

    const disconnected = analyzeFlop(["9", "5", "2"], ["h", "d", "c"]);
    expect(disconnected.isConnected).toBe(false);
    expect(disconnected.gapSum).toBe(7);
  });
});

describe("generateFlopOfTexture", () => {
  const textureTypes: FlopTextureType[] = [
    "ABB",
    "ABx",
    "Axx",
    "BBB",
    "BBx",
    "KQx",
    "JTx",
    "JT_conn",
    "Low_conn",
    "Low_unconn",
    "Paired",
    "Trips",
  ];

  textureTypes.forEach((texture) => {
    it(`should generate valid ${texture} flop`, () => {
      // Generate multiple times to ensure consistency
      for (let i = 0; i < 5; i++) {
        const { ranks, suits } = generateFlopOfTexture(texture);

        expect(ranks).toHaveLength(3);
        expect(suits).toHaveLength(3);

        // Verify classification matches
        const classified = classifyFlop(ranks);
        expect(classified).toBe(texture);
      }
    });
  });

  it("should generate valid suits for paired boards", () => {
    const { ranks, suits } = generateFlopOfTexture("Paired");
    // Paired cards must have different suits
    const pairedRank = ranks.find((r, i, arr) => arr.indexOf(r) !== arr.lastIndexOf(r));
    if (pairedRank) {
      const pairedSuits = suits.filter((_, i) => ranks[i] === pairedRank);
      expect(new Set(pairedSuits).size).toBe(2);
    }
  });

  it("should generate 3 different suits for trips", () => {
    const { suits } = generateFlopOfTexture("Trips");
    expect(new Set(suits).size).toBe(3);
  });
});

describe("FLOP_TEXTURE_CATEGORIES", () => {
  it("should have all 12 categories defined", () => {
    expect(Object.keys(FLOP_TEXTURE_CATEGORIES)).toHaveLength(12);
  });

  it("should have valid c-bet frequency ranges", () => {
    Object.values(FLOP_TEXTURE_CATEGORIES).forEach((cat) => {
      expect(cat.ip.cbetFreqMin).toBeGreaterThanOrEqual(0);
      expect(cat.ip.cbetFreqMax).toBeLessThanOrEqual(100);
      expect(cat.ip.cbetFreqMin).toBeLessThanOrEqual(cat.ip.cbetFreqMax);

      expect(cat.oop.cbetFreqMin).toBeGreaterThanOrEqual(0);
      expect(cat.oop.cbetFreqMax).toBeLessThanOrEqual(100);
      expect(cat.oop.cbetFreqMin).toBeLessThanOrEqual(cat.oop.cbetFreqMax);
    });
  });

  it("should have frequency percentages that sum to ~100%", () => {
    const totalFreq = Object.values(FLOP_TEXTURE_CATEGORIES).reduce(
      (sum, cat) => sum + cat.frequencyPct,
      0
    );
    // Should be approximately 100% (allow some margin for rounding)
    expect(totalFreq).toBeGreaterThan(90);
    expect(totalFreq).toBeLessThan(110);
  });
});
