"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Coins, Users, Target, Shield, Zap, UserRound } from "lucide-react";

const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];

const STACK_DEPTHS = ["3bb", "4bb", "5bb", "8bb", "10bb", "12bb", "15bb", "20bb", "25bb"];

const POSITIONS = ["UTG", "HJ", "CO", "BTN", "SB"];

const DEFENSE_SCENARIOS = [
  { key: "BB_vs_SB_shove", label: "BB vs SB Shove", hero: "BB", villain: "SB" },
  { key: "BB_vs_BTN_shove", label: "BB vs BTN Shove", hero: "BB", villain: "BTN" },
  { key: "BB_vs_CO_shove", label: "BB vs CO Shove", hero: "BB", villain: "CO" },
  { key: "BB_vs_HJ_shove", label: "BB vs HJ Shove", hero: "BB", villain: "HJ" },
  { key: "SB_vs_BTN_shove", label: "SB vs BTN Shove", hero: "SB", villain: "BTN" },
];

const RESTEAL_SCENARIOS = [
  { key: "SB_resteal_vs_BTN", label: "SB vs BTN Open", hero: "SB", villain: "BTN" },
  { key: "SB_resteal_vs_CO", label: "SB vs CO Open", hero: "SB", villain: "CO" },
  { key: "BB_resteal_vs_BTN", label: "BB vs BTN Open", hero: "BB", villain: "BTN" },
  { key: "BB_resteal_vs_CO", label: "BB vs CO Open", hero: "BB", villain: "CO" },
  { key: "BB_resteal_vs_HJ", label: "BB vs HJ Open", hero: "BB", villain: "HJ" },
];

const DEFENSE_STACKS = ["3bb", "5bb", "8bb", "10bb", "12bb", "15bb", "20bb"];

const RESTEAL_STACKS = ["10bb", "12bb", "15bb", "18bb", "20bb"];

const HU_SCENARIOS = [
  { key: "SB_push", label: "SB Push", hero: "SB", action: "Push" },
  { key: "BB_call_vs_SB_shove", label: "BB Call vs SB", hero: "BB", action: "Call" },
];

const HU_STACKS = ["3bb", "4bb", "5bb", "6bb", "8bb", "10bb", "12bb", "15bb", "20bb"];

// Generate hand key from grid position
function getHandKey(row: number, col: number): string {
  const rank1 = RANKS[row];
  const rank2 = RANKS[col];

  if (row === col) {
    return `${rank1}${rank2}`;
  } else if (row < col) {
    return `${rank1}${rank2}s`;
  } else {
    return `${rank2}${rank1}o`;
  }
}

// Colors for different chart types
const COLORS = {
  push: "#22c55e",      // Green for push
  fold: "#1e293b",      // Dark for fold
  call: "#3b82f6",      // Blue for call
  resteal: "#f97316",   // Orange for resteal
};

interface PushFoldGridProps {
  hands: string[];
  colorType: "push" | "call" | "resteal";
  onHandClick?: (hand: string) => void;
}

function PushFoldGrid({ hands, colorType, onHandClick }: PushFoldGridProps) {
  const handsSet = useMemo(() => new Set(hands), [hands]);

  return (
    <div
      className="grid gap-[1px] bg-border rounded-lg overflow-hidden"
      style={{ gridTemplateColumns: "repeat(13, 1fr)" }}
    >
      {RANKS.map((_, rowIndex) =>
        RANKS.map((_, colIndex) => {
          const hand = getHandKey(rowIndex, colIndex);
          const isInRange = handsSet.has(hand);
          const isPair = rowIndex === colIndex;

          return (
            <button
              key={hand}
              className={cn(
                "aspect-square flex items-center justify-center",
                "text-[8px] sm:text-[10px] md:text-xs font-medium transition-all",
                "hover:scale-110 hover:z-10",
                isPair && "font-bold"
              )}
              style={{
                backgroundColor: isInRange ? COLORS[colorType] : COLORS.fold,
              }}
              onClick={() => onHandClick?.(hand)}
            >
              <span className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                {hand}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}

const STORAGE_KEY = "push-fold-selections";

function getStoredSelections() {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export default function PushFoldPage() {
  const t = useTranslations();
  const stored = getStoredSelections();

  const [activeTab, setActiveTab] = useState(stored?.activeTab || "push");
  const [position, setPosition] = useState(stored?.position || "BTN");
  const [stackDepth, setStackDepth] = useState(stored?.stackDepth || "10bb");
  const [defenseScenario, setDefenseScenario] = useState(stored?.defenseScenario || "BB_vs_SB_shove");
  const [pushHands, setPushHands] = useState<string[]>([]);
  const [defenseHands, setDefenseHands] = useState<string[]>([]);
  const [restealScenario, setRestealScenario] = useState(stored?.restealScenario || "SB_resteal_vs_BTN");
  const [restealStack, setRestealStack] = useState(stored?.restealStack || "10bb");
  const [restealHands, setRestealHands] = useState<string[]>([]);
  const [huScenario, setHuScenario] = useState(stored?.huScenario || "SB_push");
  const [huStack, setHuStack] = useState(stored?.huStack || "5bb");
  const [huHands, setHuHands] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Persist selections to localStorage
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeTab,
        position,
        stackDepth,
        defenseScenario,
        restealScenario,
        restealStack,
        huScenario,
        huStack,
      })
    );
  }, [activeTab, position, stackDepth, defenseScenario, restealScenario, restealStack, huScenario, huStack]);

  // Fetch push/fold data
  useEffect(() => {
    if (activeTab === "push") {
      setLoading(true);
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://gto-poker-trainer-production.up.railway.app"}/api/mtt/push_fold/${position}/${stackDepth}`
      )
        .then((res) => res.json())
        .then((data) => {
          setPushHands(data.hands || []);
        })
        .catch((err) => {
          console.error("Failed to fetch push/fold data:", err);
          setPushHands([]);
        })
        .finally(() => setLoading(false));
    }
  }, [activeTab, position, stackDepth]);

  // Fetch defense data
  useEffect(() => {
    if (activeTab === "defense") {
      setLoading(true);
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://gto-poker-trainer-production.up.railway.app"}/api/mtt/defense/${defenseScenario}/${stackDepth}`
      )
        .then((res) => res.json())
        .then((data) => {
          setDefenseHands(data.hands || []);
        })
        .catch((err) => {
          console.error("Failed to fetch defense data:", err);
          setDefenseHands([]);
        })
        .finally(() => setLoading(false));
    }
  }, [activeTab, defenseScenario, stackDepth]);

  // Fetch resteal data
  useEffect(() => {
    if (activeTab === "resteal") {
      setLoading(true);
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://gto-poker-trainer-production.up.railway.app"}/api/mtt/resteal/${restealScenario}/${restealStack}`
      )
        .then((res) => res.json())
        .then((data) => {
          setRestealHands(data.hands || []);
        })
        .catch((err) => {
          console.error("Failed to fetch resteal data:", err);
          setRestealHands([]);
        })
        .finally(() => setLoading(false));
    }
  }, [activeTab, restealScenario, restealStack]);

  // Fetch HU data
  useEffect(() => {
    if (activeTab === "hu") {
      setLoading(true);
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://gto-poker-trainer-production.up.railway.app"}/api/mtt/hu/${huScenario}/${huStack}?format=hu`
      )
        .then((res) => res.json())
        .then((data) => {
          setHuHands(data.hands || []);
        })
        .catch((err) => {
          console.error("Failed to fetch HU data:", err);
          setHuHands([]);
        })
        .finally(() => setLoading(false));
    }
  }, [activeTab, huScenario, huStack]);

  // Calculate range percentage
  const currentHands = useMemo(() => {
    switch (activeTab) {
      case "push": return pushHands;
      case "defense": return defenseHands;
      case "resteal": return restealHands;
      case "hu": return huHands;
      default: return [];
    }
  }, [activeTab, pushHands, defenseHands, restealHands, huHands]);

  const rangePercentage = useMemo(() => {
    let combos = 0;
    currentHands.forEach((hand) => {
      if (hand.length === 2) combos += 6; // Pairs
      else if (hand.endsWith("s")) combos += 4; // Suited
      else combos += 12; // Offsuit
    });
    return Math.round((combos / 1326) * 100);
  }, [currentHands]);

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("mtt.pushFold.title")}</h1>
        <p className="text-muted-foreground">{t("mtt.pushFold.description")}</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="push" className="gap-1 text-xs sm:text-sm">
            <Target className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("mtt.pushFold.pushTab")}</span>
            <span className="sm:hidden">Push</span>
          </TabsTrigger>
          <TabsTrigger value="defense" className="gap-1 text-xs sm:text-sm">
            <Shield className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("mtt.pushFold.defenseTab")}</span>
            <span className="sm:hidden">Defense</span>
          </TabsTrigger>
          <TabsTrigger value="resteal" className="gap-1 text-xs sm:text-sm">
            <Zap className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("mtt.pushFold.restealTab")}</span>
            <span className="sm:hidden">Resteal</span>
          </TabsTrigger>
          <TabsTrigger value="hu" className="gap-1 text-xs sm:text-sm">
            <UserRound className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("mtt.pushFold.huTab")}</span>
            <span className="sm:hidden">HU</span>
          </TabsTrigger>
        </TabsList>

        {/* Push Tab */}
        <TabsContent value="push">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span>{position}</span>
                    <Badge variant="outline">{stackDepth}</Badge>
                  </CardTitle>
                  <CardDescription>{t("mtt.pushFold.pushDesc")}</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-500">{rangePercentage}%</div>
                  <div className="text-sm text-muted-foreground">{pushHands.length} {t("mtt.pushFold.hands")}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Position Selector */}
              <div className="mb-4">
                <div className="text-sm text-muted-foreground mb-2">{t("mtt.pushFold.selectPosition")}</div>
                <div className="flex flex-wrap gap-2">
                  {POSITIONS.map((pos) => (
                    <Button
                      key={pos}
                      variant={position === pos ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPosition(pos)}
                    >
                      {pos}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Stack Depth Selector */}
              <div className="mb-6">
                <div className="text-sm text-muted-foreground mb-2">{t("mtt.pushFold.selectStack")}</div>
                <div className="flex flex-wrap gap-2">
                  {STACK_DEPTHS.map((depth) => (
                    <Button
                      key={depth}
                      variant={stackDepth === depth ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStackDepth(depth)}
                      className="min-w-[60px]"
                    >
                      <Coins className="h-3 w-3 mr-1" />
                      {depth}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Grid */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <PushFoldGrid hands={pushHands} colorType="push" />
              )}

              {/* Legend */}
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.push }} />
                  <span>Push</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.fold }} />
                  <span>Fold</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Defense Tab */}
        <TabsContent value="defense">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span>{DEFENSE_SCENARIOS.find((s) => s.key === defenseScenario)?.label}</span>
                    <Badge variant="outline">{stackDepth}</Badge>
                  </CardTitle>
                  <CardDescription>{t("mtt.pushFold.defenseDesc")}</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-500">{rangePercentage}%</div>
                  <div className="text-sm text-muted-foreground">{defenseHands.length} {t("mtt.pushFold.hands")}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Scenario Selector */}
              <div className="mb-4">
                <div className="text-sm text-muted-foreground mb-2">{t("mtt.pushFold.selectScenario")}</div>
                <div className="flex flex-wrap gap-2">
                  {DEFENSE_SCENARIOS.map((scenario) => (
                    <Button
                      key={scenario.key}
                      variant={defenseScenario === scenario.key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDefenseScenario(scenario.key)}
                    >
                      <Users className="h-3 w-3 mr-1" />
                      {scenario.hero} vs {scenario.villain}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Stack Depth Selector */}
              <div className="mb-6">
                <div className="text-sm text-muted-foreground mb-2">{t("mtt.pushFold.selectStack")}</div>
                <div className="flex flex-wrap gap-2">
                  {DEFENSE_STACKS.map((depth) => (
                    <Button
                      key={depth}
                      variant={stackDepth === depth ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStackDepth(depth)}
                      className="min-w-[60px]"
                    >
                      <Coins className="h-3 w-3 mr-1" />
                      {depth}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Grid */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <PushFoldGrid hands={defenseHands} colorType="call" />
              )}

              {/* Legend */}
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.call }} />
                  <span>Call</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.fold }} />
                  <span>Fold</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resteal Tab */}
        <TabsContent value="resteal">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span>{RESTEAL_SCENARIOS.find((s) => s.key === restealScenario)?.label}</span>
                    <Badge variant="outline">{restealStack}</Badge>
                  </CardTitle>
                  <CardDescription>{t("mtt.pushFold.restealDesc")}</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-orange-500">{rangePercentage}%</div>
                  <div className="text-sm text-muted-foreground">{restealHands.length} {t("mtt.pushFold.hands")}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Scenario Selector */}
              <div className="mb-4">
                <div className="text-sm text-muted-foreground mb-2">{t("mtt.pushFold.selectScenario")}</div>
                <div className="flex flex-wrap gap-2">
                  {RESTEAL_SCENARIOS.map((scenario) => (
                    <Button
                      key={scenario.key}
                      variant={restealScenario === scenario.key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRestealScenario(scenario.key)}
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      {scenario.hero} vs {scenario.villain}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Stack Depth Selector */}
              <div className="mb-6">
                <div className="text-sm text-muted-foreground mb-2">{t("mtt.pushFold.selectStack")}</div>
                <div className="flex flex-wrap gap-2">
                  {RESTEAL_STACKS.map((depth) => (
                    <Button
                      key={depth}
                      variant={restealStack === depth ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRestealStack(depth)}
                      className="min-w-[60px]"
                    >
                      <Coins className="h-3 w-3 mr-1" />
                      {depth}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Grid */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <PushFoldGrid hands={restealHands} colorType="resteal" />
              )}

              {/* Legend */}
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.resteal }} />
                  <span>Resteal (3bet Shove)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.fold }} />
                  <span>Fold</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HU Tab */}
        <TabsContent value="hu">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span>{HU_SCENARIOS.find((s) => s.key === huScenario)?.label}</span>
                    <Badge variant="outline">{huStack}</Badge>
                  </CardTitle>
                  <CardDescription>{t("mtt.pushFold.huDesc")}</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold" style={{ color: huScenario === "SB_push" ? COLORS.push : COLORS.call }}>{rangePercentage}%</div>
                  <div className="text-sm text-muted-foreground">{huHands.length} {t("mtt.pushFold.hands")}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Scenario Selector */}
              <div className="mb-4">
                <div className="text-sm text-muted-foreground mb-2">{t("mtt.pushFold.selectScenario")}</div>
                <div className="flex flex-wrap gap-2">
                  {HU_SCENARIOS.map((scenario) => (
                    <Button
                      key={scenario.key}
                      variant={huScenario === scenario.key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setHuScenario(scenario.key)}
                    >
                      <UserRound className="h-3 w-3 mr-1" />
                      {scenario.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Stack Depth Selector */}
              <div className="mb-6">
                <div className="text-sm text-muted-foreground mb-2">{t("mtt.pushFold.selectStack")}</div>
                <div className="flex flex-wrap gap-2">
                  {HU_STACKS.map((depth) => (
                    <Button
                      key={depth}
                      variant={huStack === depth ? "default" : "outline"}
                      size="sm"
                      onClick={() => setHuStack(depth)}
                      className="min-w-[60px]"
                    >
                      <Coins className="h-3 w-3 mr-1" />
                      {depth}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Grid */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <PushFoldGrid hands={huHands} colorType={huScenario === "SB_push" ? "push" : "call"} />
              )}

              {/* Legend */}
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: huScenario === "SB_push" ? COLORS.push : COLORS.call }} />
                  <span>{huScenario === "SB_push" ? "Push" : "Call"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.fold }} />
                  <span>Fold</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("mtt.pushFold.tipsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>{t("mtt.pushFold.tip1")}</p>
          <p>{t("mtt.pushFold.tip2")}</p>
          <p>{t("mtt.pushFold.tip3")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
