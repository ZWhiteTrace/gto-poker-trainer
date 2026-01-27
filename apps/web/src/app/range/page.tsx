"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
        setError(err instanceof Error ? err.message : "Failed to load range");
        setRangeData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRange();
  }, [activeTab, selectedPosition, selectedMatchup]);

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Range Viewer</h1>
        <p className="text-muted-foreground">
          Explore GTO preflop ranges for 6-max cash games
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "rfi" | "vs_rfi")}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="rfi">RFI Ranges</TabsTrigger>
          <TabsTrigger value="vs_rfi">vs RFI Ranges</TabsTrigger>
        </TabsList>

        <TabsContent value="rfi" className="space-y-6">
          {/* Position Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Select Position</CardTitle>
              <CardDescription>
                View the opening range (Raise First In) for each position
              </CardDescription>
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
            title={`${selectedPosition} Open Range`}
            description={`RFI range when action folds to ${selectedPosition}`}
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
              <CardTitle>Select Matchup</CardTitle>
              <CardDescription>
                View the defending range against an open raise
              </CardDescription>
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
            title={`${selectedMatchup.hero} vs ${selectedMatchup.villain} Open`}
            description={`Defense range for ${selectedMatchup.hero} facing ${selectedMatchup.villain} RFI`}
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
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Range Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatItem label="Total Hands" value={rangeData.total_hands} />
              <StatItem
                label="Drillable Hands"
                value={rangeData.drillable.length}
              />
              <StatItem label="Position" value={rangeData.position} />
              <StatItem label="Action Type" value={rangeData.action_type} />
            </div>
          </CardContent>
        </Card>
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
            Select a position to view the range
          </div>
        )}
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
