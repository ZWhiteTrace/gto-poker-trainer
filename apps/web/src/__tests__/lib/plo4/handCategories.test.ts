import { describe, it, expect } from "vitest";
import { categorize } from "@/lib/plo4/handCategories";

describe("PLO4 Hand Categories", () => {
  describe("suit structure", () => {
    it("detects double-suited", () => {
      // As Ks Qh Jh — 2 spades + 2 hearts
      const cat = categorize("AsKsQhJh");
      expect(cat.isDoubleSuited).toBe(true);
      expect(cat.isSingleSuited).toBe(false);
      expect(cat.isRainbow).toBe(false);
    });

    it("detects single-suited", () => {
      // As Ks Qh Jd — 2 spades, rest different
      const cat = categorize("AsKsQhJd");
      expect(cat.isDoubleSuited).toBe(false);
      expect(cat.isSingleSuited).toBe(true);
    });

    it("detects rainbow", () => {
      // As Kh Qd Jc — all different suits
      const cat = categorize("AsKhQdJc");
      expect(cat.isRainbow).toBe(true);
      expect(cat.isDoubleSuited).toBe(false);
      expect(cat.isSingleSuited).toBe(false);
    });

    it("3 of same suit counts as single-suited", () => {
      // As Ks Qs Jh — 3 spades (only 2 usable, still single-suited)
      const cat = categorize("AsKsQsJh");
      expect(cat.isSingleSuited).toBe(true);
      expect(cat.isDoubleSuited).toBe(false);
    });
  });

  describe("pair structure", () => {
    it("detects no pairs", () => {
      const cat = categorize("AsKhQdJc");
      expect(cat.pairCount).toBe(0);
      expect(cat.isDoublePaired).toBe(false);
    });

    it("detects single pair", () => {
      const cat = categorize("AsAhKdQc");
      expect(cat.pairCount).toBe(1);
      expect(cat.isDoublePaired).toBe(false);
    });

    it("detects double-paired (AAKK)", () => {
      const cat = categorize("AsAhKsKh");
      expect(cat.pairCount).toBe(2);
      expect(cat.isDoublePaired).toBe(true);
    });

    it("detects trips as pair count 1", () => {
      // AhAsAd Kc — 3 aces = 1 pair group
      const cat = categorize("AhAsAdKc");
      expect(cat.pairCount).toBe(1);
    });
  });

  describe("connectivity", () => {
    it("JT98 is a rundown (0 gaps)", () => {
      const cat = categorize("JhTs9d8c");
      expect(cat.connectivity).toBe("rundown");
      expect(cat.gaps).toBe(0);
      expect(cat.totalGapSize).toBe(0);
    });

    it("KQJT is a rundown", () => {
      const cat = categorize("KhQsTdJc");
      expect(cat.connectivity).toBe("rundown");
    });

    it("5432 is a rundown", () => {
      const cat = categorize("5h4s3d2c");
      expect(cat.connectivity).toBe("rundown");
    });

    it("A234 is a rundown (ace-low wheel)", () => {
      const cat = categorize("Ah2s3d4c");
      expect(cat.connectivity).toBe("rundown");
      expect(cat.totalGapSize).toBe(0);
    });

    it("JT97 is semi-connected (1 gap of size 1)", () => {
      const cat = categorize("JhTs9d7c");
      expect(cat.connectivity).toBe("semi-connected");
      expect(cat.gaps).toBe(1);
      expect(cat.totalGapSize).toBe(1);
    });

    it("QT98 is semi-connected (1 gap)", () => {
      const cat = categorize("QhTs9d8c");
      expect(cat.connectivity).toBe("semi-connected");
      expect(cat.gaps).toBe(1);
    });

    it("AK72 is disconnected", () => {
      const cat = categorize("AhKs7d2c");
      expect(cat.connectivity).toBe("disconnected");
    });

    it("AQ73 is disconnected", () => {
      const cat = categorize("AhQs7d3c");
      expect(cat.connectivity).toBe("disconnected");
    });
  });

  describe("danglers", () => {
    it("JT98 has 0 danglers", () => {
      const cat = categorize("JhTs9d8c");
      expect(cat.danglerCount).toBe(0);
    });

    it("AK72 — 2 is a dangler (far from 7)", () => {
      const cat = categorize("AhKs7d2c");
      expect(cat.danglerCount).toBeGreaterThanOrEqual(1);
    });

    it("KQJ2 — 2 is a dangler", () => {
      const cat = categorize("KhQsJd2c");
      expect(cat.danglerCount).toBe(1);
    });

    it("AAKK has 0 danglers (paired structure)", () => {
      // Pairs: A-A gap=0, K-K gap=0, A-K gap=1. No card is >= 3 away from all others.
      const cat = categorize("AsAhKsKh");
      expect(cat.danglerCount).toBe(0);
    });
  });

  describe("high card features", () => {
    it("detects ace", () => {
      expect(categorize("AhKs7d2c").hasAce).toBe(true);
      expect(categorize("KhQs7d2c").hasAce).toBe(false);
    });

    it("counts broadway cards", () => {
      // AKQJ = 4 broadway
      expect(categorize("AhKsQdJc").broadwayCount).toBe(4);
      // A987 = 1 broadway (A only)
      expect(categorize("Ah9s8d7c").broadwayCount).toBe(1);
      // 9876 = 0 broadway
      expect(categorize("9h8s7d6c").broadwayCount).toBe(0);
    });
  });

  describe("categoryKey", () => {
    it("rundown:ds:unpaired", () => {
      const cat = categorize("JsTs9h8h");
      expect(cat.categoryKey).toBe("rundown:ds:unpaired");
      expect(cat.suitKey).toBe("ds");
      expect(cat.pairKey).toBe("unpaired");
    });

    it("disconnected:rainbow:unpaired", () => {
      const cat = categorize("AhKs7d2c");
      expect(cat.categoryKey).toBe("disconnected:rainbow:unpaired");
    });

    it("semi-connected:ds:double-paired", () => {
      const cat = categorize("AsAhKsKh");
      expect(cat.categoryKey).toBe("semi-connected:ds:double-paired");
    });

    it("semi-connected:rainbow:paired", () => {
      // Kh Ks Qd Jc = 4 different suits = rainbow
      const cat = categorize("KhKsQdJc");
      expect(cat.categoryKey).toBe("semi-connected:rainbow:paired");
    });

    it("semi-connected:ss:paired", () => {
      // Kh Kd Qh Jc = 2 hearts = single-suited
      const cat = categorize("KhKdQhJc");
      expect(cat.categoryKey).toBe("semi-connected:ss:paired");
    });
  });

  describe("labels (presentation helpers)", () => {
    it("standard rundown double-suited", () => {
      const cat = categorize("JsTs9h8h");
      expect(cat.label).toContain("Rundown");
      expect(cat.label).toContain("Double-Suited");
    });

    it("disconnected rainbow with dangler", () => {
      const cat = categorize("AhKs7d2c");
      expect(cat.label).toContain("Disconnected");
      expect(cat.label).toContain("Dangler");
    });
  });

  describe("edge cases", () => {
    it("all same rank (quads in hand)", () => {
      const cat = categorize("AhAsAdAc");
      expect(cat.pairCount).toBe(1);
      expect(cat.connectivity).toBe("disconnected");
    });

    it("KKQJ — pair + connected", () => {
      const cat = categorize("KhKsQdJc");
      expect(cat.pairCount).toBe(1);
      // Q-K-J span = 3 (K=13, Q=12, J=11), pair doesn't break connectivity
      expect(cat.connectivity).toBe("semi-connected");
    });
  });
});
