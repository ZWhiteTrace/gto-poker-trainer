"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DrillSession } from "@/components/poker/DrillSession";

function Vs4betDrill() {
  const searchParams = useSearchParams();
  const focusPosition = searchParams.get("position") || undefined;

  return (
    <DrillSession
      drillType="vs_4bet"
      titleKey="drill.vs4bet.title"
      descriptionKey="drill.vs4bet.description"
      positions={["HJ", "CO", "BTN", "SB", "BB"]}
      initialPosition={focusPosition}
    />
  );
}

export default function Vs4betDrillPage() {
  return (
    <Suspense>
      <Vs4betDrill />
    </Suspense>
  );
}
