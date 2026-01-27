"use client";

import { DrillSession } from "@/components/poker/DrillSession";

export default function Vs3betDrillPage() {
  return (
    <DrillSession
      drillType="vs_3bet"
      titleKey="drill.vs3bet.title"
      descriptionKey="drill.vs3bet.description"
      positions={["UTG", "HJ", "CO", "BTN", "SB"]}
    />
  );
}
