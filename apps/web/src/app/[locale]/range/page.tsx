"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RangeGrid } from "@/components/poker/RangeGrid";
import { api, RangeResponse } from "@/lib/api";
import { Loader2 } from "lucide-react";

const RFI_POSITIONS = ["UTG", "HJ", "CO", "BTN", "SB"];

const VS_RFI_MATCHUPS = [
  { hero: "HJ", villain: "UTG" },
  { hero: "CO", villain: "UTG" },
  { hero: "CO", villain: "HJ" },
  { hero: "BTN", villain: "UTG" },
  { hero: "BTN", villain: "HJ" },
  { hero: "BTN", villain: "CO" },
  { hero: "SB", villain: "UTG" },
  { hero: "SB", villain: "HJ" },
  { hero: "SB", villain: "CO" },
  { hero: "SB", villain: "BTN" },
  { hero: "BB", villain: "UTG" },
  { hero: "BB", villain: "HJ" },
  { hero: "BB", villain: "CO" },
  { hero: "BB", villain: "BTN" },
  { hero: "BB", villain: "SB" },
];

// VS 3-bet: Original raiser faces 3-bet
const VS_3BET_MATCHUPS = [
  { hero: "UTG", villain: "HJ" },
  { hero: "UTG", villain: "CO" },
  { hero: "UTG", villain: "BTN" },
  { hero: "UTG", villain: "SB" },
  { hero: "UTG", villain: "BB" },
  { hero: "HJ", villain: "CO" },
  { hero: "HJ", villain: "BTN" },
  { hero: "HJ", villain: "SB" },
  { hero: "HJ", villain: "BB" },
  { hero: "CO", villain: "BTN" },
  { hero: "CO", villain: "SB" },
  { hero: "CO", villain: "BB" },
  { hero: "BTN", villain: "SB" },
  { hero: "BTN", villain: "BB" },
  { hero: "SB", villain: "BB" },
];

// VS 4-bet: 3-bettor faces 4-bet
const VS_4BET_MATCHUPS = [
  { hero: "HJ", villain: "UTG" },
  { hero: "CO", villain: "UTG" },
  { hero: "CO", villain: "HJ" },
  { hero: "BTN", villain: "UTG" },
  { hero: "BTN", villain: "HJ" },
  { hero: "BTN", villain: "CO" },
  { hero: "SB", villain: "UTG" },
  { hero: "SB", villain: "HJ" },
  { hero: "SB", villain: "CO" },
  { hero: "SB", villain: "BTN" },
  { hero: "BB", villain: "UTG" },
  { hero: "BB", villain: "HJ" },
  { hero: "BB", villain: "CO" },
  { hero: "BB", villain: "BTN" },
  { hero: "BB", villain: "SB" },
];

type RangeTab = "rfi" | "vs_rfi" | "vs_3bet" | "vs_4bet";

export default function RangeViewerPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<RangeTab>("rfi");
  const [selectedPosition, setSelectedPosition] = useState("UTG");
  const [selectedVsRfiMatchup, setSelectedVsRfiMatchup] = useState(VS_RFI_MATCHUPS[0]);
  const [selectedVs3betMatchup, setSelectedVs3betMatchup] = useState(VS_3BET_MATCHUPS[0]);
  const [selectedVs4betMatchup, setSelectedVs4betMatchup] = useState(VS_4BET_MATCHUPS[0]);
  const [rangeData, setRangeData] = useState<RangeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedHand, setSelectedHand] = useState<string | null>(null);

  // Fetch range data
  useEffect(() => {
    const fetchRange = async () => {
      setIsLoading(true);
      setError(null);
      setSelectedHand(null);

      try {
        let data: RangeResponse;
        switch (activeTab) {
          case "rfi":
            data = await api.getRfiRange(selectedPosition);
            break;
          case "vs_rfi":
            data = await api.getVsRfiRange(selectedVsRfiMatchup.hero, selectedVsRfiMatchup.villain);
            break;
          case "vs_3bet":
            data = await api.getVs3betRange(
              selectedVs3betMatchup.hero,
              selectedVs3betMatchup.villain
            );
            break;
          case "vs_4bet":
            data = await api.getVs4betRange(
              selectedVs4betMatchup.hero,
              selectedVs4betMatchup.villain
            );
            break;
        }
        setRangeData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("common.error"));
        setRangeData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRange();
  }, [
    activeTab,
    selectedPosition,
    selectedVsRfiMatchup,
    selectedVs3betMatchup,
    selectedVs4betMatchup,
    t,
  ]);

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("range.title")}</h1>
        <p className="text-muted-foreground">{t("range.description")}</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RangeTab)}>
        <TabsList className="mb-6 h-auto flex-wrap gap-1">
          <TabsTrigger value="rfi">{t("range.rfiRanges")}</TabsTrigger>
          <TabsTrigger value="vs_rfi">{t("range.vsRfiRanges")}</TabsTrigger>
          <TabsTrigger value="vs_3bet">{t("range.vs3betRanges")}</TabsTrigger>
          <TabsTrigger value="vs_4bet">{t("range.vs4betRanges")}</TabsTrigger>
        </TabsList>

        <TabsContent value="rfi" className="space-y-6">
          {/* Position Selector */}
          <Card>
            <CardHeader>
              <CardTitle>{t("range.selectPosition")}</CardTitle>
              <CardDescription>{t("range.selectPositionDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {RFI_POSITIONS.map((pos) => (
                  <Button
                    key={pos}
                    variant={selectedPosition === pos ? "default" : "outline"}
                    onClick={() => setSelectedPosition(pos)}
                  >
                    {pos}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Range Display */}
          <RangeCard
            title={`${selectedPosition} ${t("range.openRange", { position: selectedPosition }).split(selectedPosition)[1] || "Open Range"}`}
            description={t("range.openRangeDesc", { position: selectedPosition })}
            rangeData={rangeData}
            isLoading={isLoading}
            error={error}
            selectedHand={selectedHand}
            onHandClick={setSelectedHand}
          />
        </TabsContent>

        <TabsContent value="vs_rfi" className="space-y-6">
          {/* Matchup Selector */}
          <Card>
            <CardHeader>
              <CardTitle>{t("range.selectMatchup")}</CardTitle>
              <CardDescription>{t("range.vsRfiDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {VS_RFI_MATCHUPS.map((matchup) => {
                  const isSelected =
                    matchup.hero === selectedVsRfiMatchup.hero &&
                    matchup.villain === selectedVsRfiMatchup.villain;
                  return (
                    <Button
                      key={`${matchup.hero}-${matchup.villain}`}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedVsRfiMatchup(matchup)}
                    >
                      {matchup.hero} vs {matchup.villain}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Range Display */}
          <RangeCard
            title={`${selectedVsRfiMatchup.hero} vs ${selectedVsRfiMatchup.villain} RFI`}
            description={t("range.vsRangeDesc", {
              hero: selectedVsRfiMatchup.hero,
              villain: selectedVsRfiMatchup.villain,
            })}
            rangeData={rangeData}
            isLoading={isLoading}
            error={error}
            selectedHand={selectedHand}
            onHandClick={setSelectedHand}
          />
        </TabsContent>

        <TabsContent value="vs_3bet" className="space-y-6">
          {/* Matchup Selector */}
          <Card>
            <CardHeader>
              <CardTitle>{t("range.selectMatchup")}</CardTitle>
              <CardDescription>{t("range.vs3betDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {VS_3BET_MATCHUPS.map((matchup) => {
                  const isSelected =
                    matchup.hero === selectedVs3betMatchup.hero &&
                    matchup.villain === selectedVs3betMatchup.villain;
                  return (
                    <Button
                      key={`${matchup.hero}-${matchup.villain}`}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedVs3betMatchup(matchup)}
                    >
                      {matchup.hero} vs {matchup.villain}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Range Display */}
          <RangeCard
            title={`${selectedVs3betMatchup.hero} vs ${selectedVs3betMatchup.villain} 3-Bet`}
            description={t("range.vs3betRangeDesc", {
              hero: selectedVs3betMatchup.hero,
              villain: selectedVs3betMatchup.villain,
            })}
            rangeData={rangeData}
            isLoading={isLoading}
            error={error}
            selectedHand={selectedHand}
            onHandClick={setSelectedHand}
          />
        </TabsContent>

        <TabsContent value="vs_4bet" className="space-y-6">
          {/* Matchup Selector */}
          <Card>
            <CardHeader>
              <CardTitle>{t("range.selectMatchup")}</CardTitle>
              <CardDescription>{t("range.vs4betDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {VS_4BET_MATCHUPS.map((matchup) => {
                  const isSelected =
                    matchup.hero === selectedVs4betMatchup.hero &&
                    matchup.villain === selectedVs4betMatchup.villain;
                  return (
                    <Button
                      key={`${matchup.hero}-${matchup.villain}`}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedVs4betMatchup(matchup)}
                    >
                      {matchup.hero} vs {matchup.villain}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Range Display */}
          <RangeCard
            title={`${selectedVs4betMatchup.hero} vs ${selectedVs4betMatchup.villain} 4-Bet`}
            description={t("range.vs4betRangeDesc", {
              hero: selectedVs4betMatchup.hero,
              villain: selectedVs4betMatchup.villain,
            })}
            rangeData={rangeData}
            isLoading={isLoading}
            error={error}
            selectedHand={selectedHand}
            onHandClick={setSelectedHand}
          />
        </TabsContent>
      </Tabs>

      {/* Range Stats */}
      {rangeData && <RangeStats rangeData={rangeData} />}
    </div>
  );
}

interface RangeCardProps {
  title: string;
  description: string;
  rangeData: RangeResponse | null;
  isLoading: boolean;
  error: string | null;
  selectedHand: string | null;
  onHandClick: (hand: string) => void;
}

function RangeCard({
  title,
  description,
  rangeData,
  isLoading,
  error,
  selectedHand,
  onHandClick,
}: RangeCardProps) {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-destructive py-12 text-center">{error}</div>
        ) : rangeData ? (
          <RangeGrid
            hands={rangeData.hands}
            selectedHand={selectedHand}
            onHandClick={onHandClick}
          />
        ) : (
          <div className="text-muted-foreground py-12 text-center">{t("range.selectToView")}</div>
        )}
      </CardContent>
    </Card>
  );
}

function RangeStats({ rangeData }: { rangeData: RangeResponse }) {
  const t = useTranslations();

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{t("range.stats.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatItem label={t("range.stats.totalHands")} value={rangeData.total_hands} />
          <StatItem label={t("range.stats.drillableHands")} value={rangeData.drillable.length} />
          <StatItem label={t("range.stats.position")} value={rangeData.position} />
          <StatItem label={t("range.stats.actionType")} value={rangeData.action_type} />
        </div>
      </CardContent>
    </Card>
  );
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-muted-foreground text-sm">{label}</div>
    </div>
  );
}
