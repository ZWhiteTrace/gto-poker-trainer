"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DrillSession } from "@/components/poker/DrillSession";

function RFIDrill() {
  const searchParams = useSearchParams();
  const focusPosition = searchParams.get("position") || undefined;

  return (
    <DrillSession
      drillType="rfi"
      titleKey="drill.rfi.title"
      descriptionKey="drill.rfi.description"
      positions={["UTG", "HJ", "CO", "BTN", "SB"]}
      initialPosition={focusPosition}
    />
  );
}

export default function RFIDrillPage() {
  return (
    <Suspense>
      <RFIDrill />
    </Suspense>
  );
}
