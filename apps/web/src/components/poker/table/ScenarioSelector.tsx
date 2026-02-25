"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  SCENARIO_PRESETS,
  SCENARIO_CATEGORIES,
  getScenariosByCategory,
} from "@/lib/poker/scenarioPresets";
import type { ScenarioPreset, ScenarioCategory } from "@/lib/poker/types";

interface ScenarioSelectorProps {
  onSelect: (scenario: ScenarioPreset) => void;
  onClose: () => void;
}

export function ScenarioSelector({ onSelect, onClose }: ScenarioSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<ScenarioCategory | null>(null);

  const scenarios = selectedCategory ? getScenariosByCategory(selectedCategory) : SCENARIO_PRESETS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <Card className="max-h-[80vh] w-full max-w-3xl overflow-hidden border-gray-700 bg-gray-900">
        <CardHeader className="border-b border-gray-700">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">選擇訓練場景</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>

        <CardContent className="max-h-[calc(80vh-80px)] space-y-4 overflow-y-auto p-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              全部
            </Button>
            {SCENARIO_CATEGORIES.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.nameZh}
              </Button>
            ))}
          </div>

          {/* Scenario Grid */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                onClick={() => onSelect(scenario)}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ScenarioCardProps {
  scenario: ScenarioPreset;
  onClick: () => void;
}

function ScenarioCard({ scenario, onClick }: ScenarioCardProps) {
  const categoryInfo = SCENARIO_CATEGORIES.find((c) => c.id === scenario.category);

  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg border border-gray-700 bg-gray-800/50 p-4 text-left",
        "hover:border-primary/50 transition-all hover:bg-gray-700/50",
        "focus:ring-primary focus:ring-2 focus:outline-none"
      )}
    >
      <div className="mb-2 flex items-start justify-between">
        <h3 className="font-semibold text-white">{scenario.nameZh}</h3>
        <Badge variant="outline" className="shrink-0 text-xs">
          {categoryInfo?.nameZh}
        </Badge>
      </div>

      <p className="mb-3 text-sm text-gray-400">{scenario.descriptionZh}</p>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded bg-blue-500/20 px-2 py-0.5 text-blue-400">
          Hero: {scenario.heroPosition}
        </span>
        <span className="rounded bg-green-500/20 px-2 py-0.5 text-green-400">
          {scenario.effectiveStack}BB
        </span>
        <span className="rounded bg-purple-500/20 px-2 py-0.5 text-purple-400">
          {scenario.numPlayers} 人
        </span>
      </div>

      {scenario.trainingFocus && scenario.trainingFocus.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {scenario.trainingFocus.slice(0, 3).map((focus, i) => (
            <span key={i} className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-300">
              {focus}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

// Simple inline modal trigger button
interface ScenarioButtonProps {
  onClick: () => void;
  className?: string;
}

export function ScenarioButton({ onClick, className }: ScenarioButtonProps) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className={cn("gap-2", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        <path d="M8 11h8" />
        <path d="M8 7h6" />
      </svg>
      場景
    </Button>
  );
}
