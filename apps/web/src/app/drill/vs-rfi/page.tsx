"use client";

import { DrillSession } from "@/components/poker/DrillSession";

export default function VsRfiDrillPage() {
  return (
    <DrillSession
      drillType="vs_rfi"
      title="VS RFI Drill"
      description="Practice defending against open raises"
      positions={["HJ", "CO", "BTN", "SB", "BB"]}
    />
  );
}
