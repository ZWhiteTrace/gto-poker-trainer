"use client";

import { DrillSession } from "@/components/poker/DrillSession";

export default function VsRfiDrillPage() {
  return (
    <DrillSession
      drillType="vs_rfi"
      titleKey="drill.vsRfi.title"
      descriptionKey="drill.vsRfi.description"
      positions={["HJ", "CO", "BTN", "SB", "BB"]}
    />
  );
}
