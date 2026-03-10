"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DrillSession } from "@/components/poker/DrillSession";

function VsRfiDrill() {
  const searchParams = useSearchParams();
  const focusPosition = searchParams.get("position") || undefined;

  return (
    <DrillSession
      drillType="vs_rfi"
      titleKey="drill.vsRfi.title"
      descriptionKey="drill.vsRfi.description"
      positions={["HJ", "CO", "BTN", "SB", "BB"]}
      initialPosition={focusPosition}
    />
  );
}

export default function VsRfiDrillPage() {
  return (
    <Suspense>
      <VsRfiDrill />
    </Suspense>
  );
}
