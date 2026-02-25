"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Calculator, Coins, Trophy, TrendingUp, TrendingDown } from "lucide-react";

// Malmuth-Harville ICM calculation
function calculateICM(stacks: number[], payouts: number[]): number[] {
  const totalChips = stacks.reduce((a, b) => a + b, 0);
  const n = stacks.length;
  const m = Math.min(payouts.length, n);

  // Initialize equity array
  const equities = new Array(n).fill(0);

  // Recursive probability calculation
  function calculateEquity(remaining: number[], position: number, probability: number): void {
    if (position >= m || remaining.length === 0) return;

    const totalRemaining = remaining.reduce((a, b) => a + b, 0);
    if (totalRemaining === 0) return;

    for (let i = 0; i < remaining.length; i++) {
      const playerIdx = stacks.indexOf(remaining[i]);
      if (playerIdx === -1) continue;

      const prob = (remaining[i] / totalRemaining) * probability;
      equities[playerIdx] += prob * payouts[position];

      // Recurse for remaining positions
      const newRemaining = remaining.filter((_, idx) => idx !== i);
      calculateEquity(newRemaining, position + 1, prob);
    }
  }

  // Simple ICM for small groups
  if (n <= 6) {
    calculateEquity([...stacks], 0, 1);
  } else {
    // Approximation for larger groups
    for (let i = 0; i < n; i++) {
      const chipShare = stacks[i] / totalChips;
      // Simple approximation
      equities[i] = payouts.reduce((sum, payout, pos) => {
        const weight = Math.pow(chipShare, pos + 1);
        return sum + weight * payout;
      }, 0);
    }
    // Normalize
    const totalEquity = equities.reduce((a, b) => a + b, 0);
    const totalPayout = payouts.reduce((a, b) => a + b, 0);
    for (let i = 0; i < n; i++) {
      equities[i] = (equities[i] / totalEquity) * totalPayout;
    }
  }

  return equities;
}

// Standard payout structures
const PAYOUT_PRESETS = {
  top3: { label: "Top 3 (50/30/20)", payouts: [50, 30, 20] },
  top5: { label: "Top 5", payouts: [40, 25, 18, 10, 7] },
  top9: { label: "Final Table (9)", payouts: [30, 20, 14, 10, 8, 6, 5, 4, 3] },
  headsUp: { label: "Heads Up (60/40)", payouts: [60, 40] },
  winner: { label: "Winner Take All", payouts: [100] },
};

export default function ICMCalculatorPage() {
  const t = useTranslations();
  const [stacks, setStacks] = useState<number[]>([10000, 8000, 6000, 4000, 2000]);
  const [payouts, setPayouts] = useState<number[]>([50, 30, 20]);
  const [selectedPreset, setSelectedPreset] = useState<string>("top3");

  // Calculate ICM
  const results = useMemo(() => {
    if (stacks.length === 0 || payouts.length === 0) return null;
    if (stacks.some((s) => isNaN(s) || s < 0)) return null;
    if (payouts.some((p) => isNaN(p) || p < 0)) return null;

    const totalChips = stacks.reduce((a, b) => a + b, 0);
    const totalPayout = payouts.reduce((a, b) => a + b, 0);

    const icmEquities = calculateICM(stacks, payouts);

    return stacks.map((stack, i) => {
      const chipEV = (stack / totalChips) * totalPayout;
      const icmEV = icmEquities[i];
      const diff = icmEV - chipEV;

      return {
        player: i + 1,
        stack,
        chipPercent: (stack / totalChips) * 100,
        chipEV,
        icmEV,
        icmPercent: (icmEV / totalPayout) * 100,
        diff,
        diffPercent: chipEV > 0 ? (diff / chipEV) * 100 : 0,
      };
    });
  }, [stacks, payouts]);

  const updateStack = (index: number, value: string) => {
    const newStacks = [...stacks];
    newStacks[index] = parseInt(value) || 0;
    setStacks(newStacks);
  };

  const addPlayer = () => {
    if (stacks.length < 9) {
      setStacks([...stacks, 5000]);
    }
  };

  const removePlayer = (index: number) => {
    if (stacks.length > 2) {
      setStacks(stacks.filter((_, i) => i !== index));
    }
  };

  const applyPreset = (presetKey: string) => {
    setSelectedPreset(presetKey);
    setPayouts(PAYOUT_PRESETS[presetKey as keyof typeof PAYOUT_PRESETS].payouts);
  };

  const updatePayout = (index: number, value: string) => {
    const newPayouts = [...payouts];
    newPayouts[index] = parseFloat(value) || 0;
    setPayouts(newPayouts);
    setSelectedPreset("");
  };

  const addPayout = () => {
    if (payouts.length < 9) {
      setPayouts([...payouts, 5]);
      setSelectedPreset("");
    }
  };

  const removePayout = (index: number) => {
    if (payouts.length > 1) {
      setPayouts(payouts.filter((_, i) => i !== index));
      setSelectedPreset("");
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("mtt.icm.title")}</h1>
        <p className="text-muted-foreground">{t("mtt.icm.description")}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Stacks Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              {t("mtt.icm.stacks")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stacks.map((stack, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-muted-foreground w-16 text-sm">
                  {t("mtt.icm.player")} {i + 1}
                </span>
                <Input
                  type="number"
                  value={stack}
                  onChange={(e) => updateStack(i, e.target.value)}
                  className="flex-1"
                  min={0}
                />
                {stacks.length > 2 && (
                  <Button variant="ghost" size="icon" onClick={() => removePlayer(i)}>
                    <Trash2 className="text-destructive h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {stacks.length < 9 && (
              <Button variant="outline" onClick={addPlayer} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                {t("mtt.icm.addPlayer")}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Payouts Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              {t("mtt.icm.payouts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Presets */}
            <div className="mb-4 flex flex-wrap gap-2">
              {Object.entries(PAYOUT_PRESETS).map(([key, preset]) => (
                <Button
                  key={key}
                  variant={selectedPreset === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => applyPreset(key)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <div className="space-y-3">
              {payouts.map((payout, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-muted-foreground w-12 text-sm">#{i + 1}</span>
                  <Input
                    type="number"
                    value={payout}
                    onChange={(e) => updatePayout(i, e.target.value)}
                    className="flex-1"
                    min={0}
                    step={0.1}
                  />
                  <span className="text-muted-foreground text-sm">%</span>
                  {payouts.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removePayout(i)}>
                      <Trash2 className="text-destructive h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {payouts.length < 9 && (
                <Button variant="outline" onClick={addPayout} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Position
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {results && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              ICM Results
            </CardTitle>
            <CardDescription>
              Total Prize Pool: {payouts.reduce((a, b) => a + b, 0)}%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left">{t("mtt.icm.player")}</th>
                    <th className="py-2 text-right">Chips</th>
                    <th className="py-2 text-right">{t("mtt.icm.chipEquity")}</th>
                    <th className="py-2 text-right">{t("mtt.icm.icmEquity")}</th>
                    <th className="py-2 text-right">{t("mtt.icm.difference")}</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.player} className="border-b last:border-0">
                      <td className="py-3 font-medium">
                        {t("mtt.icm.player")} {r.player}
                      </td>
                      <td className="py-3 text-right">
                        <div>{r.stack.toLocaleString()}</div>
                        <div className="text-muted-foreground text-xs">
                          {r.chipPercent.toFixed(1)}%
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <div>{r.chipEV.toFixed(2)}%</div>
                      </td>
                      <td className="py-3 text-right">
                        <div className="font-medium">{r.icmEV.toFixed(2)}%</div>
                        <div className="text-muted-foreground text-xs">
                          {r.icmPercent.toFixed(1)}% of pool
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <div
                          className={cn(
                            "flex items-center justify-end gap-1",
                            r.diff > 0.01
                              ? "text-green-500"
                              : r.diff < -0.01
                                ? "text-red-500"
                                : "text-muted-foreground"
                          )}
                        >
                          {r.diff > 0.01 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : r.diff < -0.01 ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : null}
                          <span>
                            {r.diff >= 0 ? "+" : ""}
                            {r.diff.toFixed(2)}%
                          </span>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {r.diffPercent >= 0 ? "+" : ""}
                          {r.diffPercent.toFixed(1)}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Visual Bar Chart */}
            <div className="mt-6 space-y-3">
              <div className="text-sm font-medium">ICM vs Chip EV Comparison</div>
              {results.map((r) => (
                <div key={r.player} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>
                      {t("mtt.icm.player")} {r.player}
                    </span>
                    <span>{r.icmEV.toFixed(1)}%</span>
                  </div>
                  <div className="bg-muted flex h-6 overflow-hidden rounded-full">
                    <div
                      className="h-full bg-blue-500/50 transition-all"
                      style={{ width: `${r.chipEV}%` }}
                      title={`Chip EV: ${r.chipEV.toFixed(2)}%`}
                    />
                    <div
                      className={cn(
                        "h-full transition-all",
                        r.diff >= 0 ? "bg-green-500" : "bg-red-500"
                      )}
                      style={{ width: `${Math.abs(r.diff)}%` }}
                      title={`Diff: ${r.diff.toFixed(2)}%`}
                    />
                  </div>
                </div>
              ))}
              <div className="text-muted-foreground mt-2 flex gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded bg-blue-500/50" />
                  <span>Chip EV</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded bg-green-500" />
                  <span>ICM Gain</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded bg-red-500" />
                  <span>ICM Loss</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">{t("mtt.icm.tipsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>{t("mtt.icm.tip1")}</p>
          <p>{t("mtt.icm.tip2")}</p>
          <p>{t("mtt.icm.tip3")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
