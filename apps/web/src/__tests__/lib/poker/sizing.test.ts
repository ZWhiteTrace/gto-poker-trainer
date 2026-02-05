import { describe, it, expect } from "vitest";
import {
  roundToHalf,
  clamp,
  getOpenRaiseSize,
  getThreeBetSize,
  getFourBetSize,
} from "@/lib/poker/sizing";
import type { Position } from "@/lib/poker/types";

describe("sizing utilities", () => {
  describe("roundToHalf", () => {
    it("should round to nearest 0.5", () => {
      expect(roundToHalf(2.3)).toBe(2.5);
      expect(roundToHalf(2.7)).toBe(2.5);
      expect(roundToHalf(2.8)).toBe(3.0);
      expect(roundToHalf(2.2)).toBe(2.0);
    });

    it("should handle exact values", () => {
      expect(roundToHalf(2.5)).toBe(2.5);
      expect(roundToHalf(3.0)).toBe(3.0);
    });

    it("should handle edge cases", () => {
      expect(roundToHalf(0)).toBe(0);
      expect(roundToHalf(0.25)).toBe(0.5);
      expect(roundToHalf(0.24)).toBe(0);
    });
  });

  describe("clamp", () => {
    it("should return value when within range", () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it("should return min when value is below range", () => {
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(-100, 0, 10)).toBe(0);
    });

    it("should return max when value is above range", () => {
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(100, 0, 10)).toBe(10);
    });
  });
});

describe("preflop sizing", () => {
  const neutralProfile = { aggression: 0.5 };
  const aggressiveProfile = { aggression: 1.0 };
  const passiveProfile = { aggression: 0.0 };

  describe("getOpenRaiseSize", () => {
    it("should return base size for standard stacks (100bb)", () => {
      const size = getOpenRaiseSize("BTN", 100, neutralProfile);
      expect(size).toBeGreaterThanOrEqual(2.2);
      expect(size).toBeLessThanOrEqual(3.0);
    });

    it("should increase size for SB position", () => {
      const sbSize = getOpenRaiseSize("SB", 100, neutralProfile);
      const btnSize = getOpenRaiseSize("BTN", 100, neutralProfile);
      expect(sbSize).toBeGreaterThan(btnSize);
    });

    it("should use smaller size for short stacks", () => {
      const shortStackSize = getOpenRaiseSize("BTN", 15, neutralProfile);
      const deepStackSize = getOpenRaiseSize("BTN", 100, neutralProfile);
      expect(shortStackSize).toBeLessThan(deepStackSize);
    });

    it("should use larger size for deep stacks", () => {
      const deepStackSize = getOpenRaiseSize("BTN", 150, neutralProfile);
      const normalStackSize = getOpenRaiseSize("BTN", 100, neutralProfile);
      expect(deepStackSize).toBeGreaterThan(normalStackSize);
    });

    it("should scale with aggression profile", () => {
      const aggressiveSize = getOpenRaiseSize("BTN", 100, aggressiveProfile);
      const passiveSize = getOpenRaiseSize("BTN", 100, passiveProfile);
      expect(aggressiveSize).toBeGreaterThan(passiveSize);
    });

    it("should handle all positions", () => {
      const positions: Position[] = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];
      for (const pos of positions) {
        const size = getOpenRaiseSize(pos, 100, neutralProfile);
        expect(size).toBeGreaterThan(0);
      }
    });
  });

  describe("getThreeBetSize", () => {
    const openSize = 2.5;

    it("should return larger size when OOP", () => {
      const oopSize = getThreeBetSize(openSize, false, 100);
      const ipSize = getThreeBetSize(openSize, true, 100);
      expect(oopSize).toBeGreaterThan(ipSize);
    });

    it("should be approximately 3x open size when IP", () => {
      const size = getThreeBetSize(openSize, true, 100);
      expect(size).toBeGreaterThanOrEqual(openSize * 2.5);
      expect(size).toBeLessThanOrEqual(openSize * 4.0);
    });

    it("should use smaller multiplier for short stacks", () => {
      const shortSize = getThreeBetSize(openSize, true, 20);
      const normalSize = getThreeBetSize(openSize, true, 100);
      expect(shortSize).toBeLessThan(normalSize);
    });

    it("should use larger multiplier for deep stacks", () => {
      const deepSize = getThreeBetSize(openSize, true, 150);
      const normalSize = getThreeBetSize(openSize, true, 100);
      expect(deepSize).toBeGreaterThan(normalSize);
    });
  });

  describe("getFourBetSize", () => {
    const threeBetSize = 8;

    it("should return larger size when OOP", () => {
      const oopSize = getFourBetSize(threeBetSize, false, 100);
      const ipSize = getFourBetSize(threeBetSize, true, 100);
      expect(oopSize).toBeGreaterThan(ipSize);
    });

    it("should be approximately 2.2-2.5x 3bet size", () => {
      const size = getFourBetSize(threeBetSize, true, 100);
      expect(size).toBeGreaterThanOrEqual(threeBetSize * 2.0);
      expect(size).toBeLessThanOrEqual(threeBetSize * 3.0);
    });

    it("should adjust for stack depth", () => {
      const shortSize = getFourBetSize(threeBetSize, true, 30);
      const deepSize = getFourBetSize(threeBetSize, true, 150);
      expect(shortSize).toBeLessThanOrEqual(deepSize);
    });
  });
});
