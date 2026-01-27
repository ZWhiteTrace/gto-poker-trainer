"use client";

import { DrillSession } from "@/components/poker/DrillSession";

export default function Vs3betDrillPage() {
  return (
    <DrillSession
      drillType="vs_3bet"
      title="VS 3-Bet Drill"
      description="Practice responding to 3-bets after you open raise"
      positions={["UTG", "HJ", "CO", "BTN", "SB"]}
    />
  );
}
