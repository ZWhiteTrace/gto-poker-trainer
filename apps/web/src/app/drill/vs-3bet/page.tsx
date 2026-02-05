"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DrillSession } from "@/components/poker/DrillSession";

function Vs3betDrill() {
  const searchParams = useSearchParams();
  const focusPosition = searchParams.get("position") || undefined;

  return (
    <DrillSession
      drillType="vs_3bet"
      titleKey="drill.vs3bet.title"
      descriptionKey="drill.vs3bet.description"
      positions={["UTG", "HJ", "CO", "BTN", "SB"]}
      initialPosition={focusPosition}
    />
  );
}

export default function Vs3betDrillPage() {
  return (
    <Suspense>
      <Vs3betDrill />
    </Suspense>
  );
}
