"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export default function RangeViewerPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<"rfi" | "vs_rfi">("rfi");
  const [selectedPosition, setSelectedPosition] = useState("UTG");
  const [selectedMatchup, setSelectedMatchup] = useState(VS_RFI_MATCHUPS[0]);
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
        if (activeTab === "rfi") {
          data = await api.getRfiRange(selectedPosition);
        } else {
          data = await api.getVsRfiRange(
            selectedMatchup.hero,
            selectedMatchup.villain
          );
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
  }, [activeTab, selectedPosition, selectedMatchup, t]);

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("range.title")}</h1>
        <p className="text-muted-foreground">{t("range.description")}</p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "rfi" | "vs_rfi")}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="rfi">{t("range.rfiRanges")}</TabsTrigger>
          <TabsTrigger value="vs_rfi">{t("range.vsRfiRanges")}</TabsTrigger>
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
              <CardDescription>{t("range.selectMatchupDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {VS_RFI_MATCHUPS.map((matchup) => {
                  const isSelected =
                    matchup.hero === selectedMatchup.hero &&
                    matchup.villain === selectedMatchup.villain;
                  return (
                    <Button
                      key={`${matchup.hero}-${matchup.villain}`}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedMatchup(matchup)}
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
            title={`${selectedMatchup.hero} vs ${selectedMatchup.villain}`}
            description={t("range.vsRangeDesc", {
              hero: selectedMatchup.hero,
              villain: selectedMatchup.villain,
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
      {rangeData && (
        <RangeStats rangeData={rangeData} />
      )}
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
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">{error}</div>
        ) : rangeData ? (
          <RangeGrid
            hands={rangeData.hands}
            selectedHand={selectedHand}
            onHandClick={onHandClick}
          />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {t("range.selectToView")}
          </div>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatItem label={t("range.stats.totalHands")} value={rangeData.total_hands} />
          <StatItem
            label={t("range.stats.drillableHands")}
            value={rangeData.drillable.length}
          />
          <StatItem label={t("range.stats.position")} value={rangeData.position} />
          <StatItem label={t("range.stats.actionType")} value={rangeData.action_type} />
        </div>
      </CardContent>
    </Card>
  );
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center p-3 rounded-lg bg-muted/50">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
