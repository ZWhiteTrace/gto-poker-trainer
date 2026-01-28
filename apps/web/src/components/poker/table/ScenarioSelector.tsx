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

  const scenarios = selectedCategory
    ? getScenariosByCategory(selectedCategory)
    : SCENARIO_PRESETS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <Card className="w-full max-w-3xl max-h-[80vh] overflow-hidden bg-gray-900 border-gray-700">
        <CardHeader className="border-b border-gray-700">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">選擇訓練場景</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4 overflow-y-auto max-h-[calc(80vh-80px)]">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
        "text-left p-4 rounded-lg border border-gray-700 bg-gray-800/50",
        "hover:bg-gray-700/50 hover:border-primary/50 transition-all",
        "focus:outline-none focus:ring-2 focus:ring-primary"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-white">{scenario.nameZh}</h3>
        <Badge variant="outline" className="text-xs shrink-0">
          {categoryInfo?.nameZh}
        </Badge>
      </div>

      <p className="text-sm text-gray-400 mb-3">{scenario.descriptionZh}</p>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
          Hero: {scenario.heroPosition}
        </span>
        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
          {scenario.effectiveStack}BB
        </span>
        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
          {scenario.numPlayers} 人
        </span>
      </div>

      {scenario.trainingFocus && scenario.trainingFocus.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {scenario.trainingFocus.slice(0, 3).map((focus, i) => (
            <span
              key={i}
              className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded"
            >
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
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn("gap-2", className)}
    >
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
