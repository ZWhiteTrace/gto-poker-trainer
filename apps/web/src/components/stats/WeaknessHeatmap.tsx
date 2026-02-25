"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Grid3X3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TrackedDrillType, DRILL_LABELS as FULL_LABELS, POSITIONS } from "@/lib/constants/drills";

type DrillType = TrackedDrillType;

interface PositionStats {
  total: number;
  correct: number;
  acceptable: number;
}

interface DrillStats {
  total: number;
  correct: number;
  acceptable: number;
  byPosition: Record<string, PositionStats>;
  lastPracticed?: string;
}

interface WeaknessHeatmapProps {
  stats: Record<DrillType, DrillStats>;
}

// Shortened labels for heatmap cells (space constrained)
const HEATMAP_LABELS: Record<DrillType, { short: string; href: string }> = {
  rfi: { short: "RFI", href: FULL_LABELS.rfi.href },
  vs_rfi: { short: "VS RFI", href: FULL_LABELS.vs_rfi.href },
  vs_3bet: { short: "VS 3B", href: FULL_LABELS.vs_3bet.href },
  vs_4bet: { short: "VS 4B", href: FULL_LABELS.vs_4bet.href },
  push_fold: { short: "P/F", href: FULL_LABELS.push_fold.href },
  push_fold_defense: { short: "P/F D", href: FULL_LABELS.push_fold_defense.href },
  push_fold_resteal: { short: "P/F R", href: FULL_LABELS.push_fold_resteal.href },
  push_fold_hu: { short: "HU", href: FULL_LABELS.push_fold_hu.href },
  table_trainer: { short: "Table", href: FULL_LABELS.table_trainer.href },
  postflop: { short: "Post", href: FULL_LABELS.postflop.href },
};

// Preflop drills to show in heatmap (exclude table_trainer which is postflop focused)
const HEATMAP_DRILLS: DrillType[] = [
  "rfi",
  "vs_rfi",
  "vs_3bet",
  "vs_4bet",
  "push_fold",
  "push_fold_defense",
  "push_fold_resteal",
  "push_fold_hu",
];

function getAccuracyColor(accuracy: number, total: number): string {
  if (total === 0) return "bg-muted/30 text-muted-foreground/50";
  if (accuracy >= 80) return "bg-green-500/70 text-green-50";
  if (accuracy >= 60) return "bg-yellow-500/70 text-yellow-50";
  return "bg-red-500/70 text-red-50";
}

function getAccuracyBorderColor(accuracy: number, total: number): string {
  if (total === 0) return "border-muted";
  if (accuracy >= 80) return "border-green-500";
  if (accuracy >= 60) return "border-yellow-500";
  return "border-red-500";
}

export function WeaknessHeatmap({ stats }: WeaknessHeatmapProps) {
  const t = useTranslations();

  // Build position × drill matrix
  const matrix: Record<string, Record<DrillType, { total: number; accuracy: number }>> = {};

  POSITIONS.forEach((pos) => {
    matrix[pos] = {} as Record<DrillType, { total: number; accuracy: number }>;
    HEATMAP_DRILLS.forEach((drill) => {
      const posStats = stats[drill]?.byPosition[pos];
      if (posStats && posStats.total > 0) {
        const accuracy = ((posStats.correct + posStats.acceptable) / posStats.total) * 100;
        matrix[pos][drill] = { total: posStats.total, accuracy };
      } else {
        matrix[pos][drill] = { total: 0, accuracy: 0 };
      }
    });
  });

  // Check if there's any data
  const hasData = POSITIONS.some((pos) =>
    HEATMAP_DRILLS.some((drill) => matrix[pos][drill].total > 0)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5" />
          {t("stats.weaknessHeatmap") || "Weakness Heatmap"}
        </CardTitle>
        <CardDescription>
          {t("stats.weaknessHeatmapDesc") ||
            "Position × Drill accuracy. Red = needs practice, Green = strong."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-muted-foreground py-8 text-center">
            {t("stats.noDataYet") || "No data yet. Start practicing!"}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <div className="min-w-[500px]">
                {/* Header row */}
                <div className="mb-1 flex gap-1">
                  <div className="w-12 shrink-0" /> {/* Empty corner */}
                  {HEATMAP_DRILLS.map((drill) => (
                    <div
                      key={drill}
                      className="text-muted-foreground flex-1 truncate px-1 text-center text-xs font-medium"
                      title={HEATMAP_LABELS[drill].short}
                    >
                      {HEATMAP_LABELS[drill].short}
                    </div>
                  ))}
                </div>

                {/* Data rows */}
                {POSITIONS.map((pos) => (
                  <div key={pos} className="mb-1 flex gap-1">
                    <div className="flex w-12 shrink-0 items-center justify-center text-xs font-medium">
                      {pos}
                    </div>
                    {HEATMAP_DRILLS.map((drill) => {
                      const data = matrix[pos][drill];
                      const colorClass = getAccuracyColor(data.accuracy, data.total);
                      const tooltipText =
                        data.total > 0
                          ? `${pos} - ${HEATMAP_LABELS[drill].short}\nAccuracy: ${data.accuracy.toFixed(1)}%\nHands: ${data.total}\nClick to practice`
                          : `${pos} - ${HEATMAP_LABELS[drill].short}\nNo data yet`;

                      return (
                        <Link
                          key={drill}
                          href={HEATMAP_LABELS[drill].href}
                          title={tooltipText}
                          className={cn(
                            "flex h-10 flex-1 cursor-pointer items-center justify-center rounded border text-xs font-medium transition-all hover:scale-105 hover:shadow-md",
                            colorClass,
                            getAccuracyBorderColor(data.accuracy, data.total)
                          )}
                        >
                          {data.total > 0 ? `${Math.round(data.accuracy)}%` : "-"}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="h-4 w-4 rounded border border-red-500 bg-red-500/70" />
                <span>&lt;60%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-4 w-4 rounded border border-yellow-500 bg-yellow-500/70" />
                <span>60-80%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-4 w-4 rounded border border-green-500 bg-green-500/70" />
                <span>&gt;80%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="bg-muted/30 border-muted h-4 w-4 rounded border" />
                <span>{t("stats.noData") || "No data"}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
