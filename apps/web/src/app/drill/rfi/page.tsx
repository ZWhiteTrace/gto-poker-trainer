"use client";

import { DrillSession } from "@/components/poker/DrillSession";

export default function RFIDrillPage() {
  return (
    <DrillSession
      drillType="rfi"
      titleKey="drill.rfi.title"
      descriptionKey="drill.rfi.description"
      positions={["UTG", "HJ", "CO", "BTN", "SB"]}
    />
  );
}
