"use client";

import { DrillSession } from "@/components/poker/DrillSession";

export default function Vs4betDrillPage() {
  return (
    <DrillSession
      drillType="vs_4bet"
      titleKey="drill.vs4bet.title"
      descriptionKey="drill.vs4bet.description"
      positions={["HJ", "CO", "BTN", "SB", "BB"]}
    />
  );
}
