"use client";

import { useEffect, useState, useRef } from "react";
import { useTableStore } from "@/stores/tableStore";
import { useProgressStore } from "@/stores/progressStore";
import { useAuthStore } from "@/stores/authStore";
import { PokerTable, CompactPokerTable, ActionButtons, ScenarioSelector, ScenarioButton } from "@/components/poker/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { POSITIONS, Position, POSITION_LABELS, ScenarioPreset } from "@/lib/poker/types";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, History } from "lucide-react";

export default function TableTrainerClient() {
  const {
    players,
    communityCards,
    pot,
    lastWonPot,
    activePlayerIndex,
    phase,
    currentStreet,
    currentBet,
    aiThinking,
    selectedBetSize,
    sessionStats,
    actionHistory,
    winners,
    handEvaluations,
    trainingMode,
    initializeTable,
    setHeroPosition,
    loadScenario,
    startNewHand,
    handleAction,
    getAvailableActions,
    setSelectedBetSize,
    resetSession,
    processAITurn,
  } = useTableStore();

  const [showScenarioSelector, setShowScenarioSelector] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const handRecorded = useRef(false);

  // Progress tracking
  const { recordTableTrainerHand } = useProgressStore();
  const { user } = useAuthStore();

  // Initialize on mount
  useEffect(() => {
    if (players.length === 0) {
      initializeTable();
    }
  }, [players.length, initializeTable]);

  // Track which player index we last triggered AI for
  const lastAITriggerIndex = useRef<number>(-1);

  // Trigger AI turn when it's an AI's turn to act
  useEffect(() => {
    const activePlayer = players[activePlayerIndex];

    // Reset tracking when phase changes or it's hero's turn
    if (phase !== "playing" || activePlayer?.isHero) {
      lastAITriggerIndex.current = -1;
      return;
    }

    // Only trigger if:
    // 1. Game is in playing phase
    // 2. Active player exists and is not hero
    // 3. AI is not already thinking
    // 4. We haven't already triggered for this specific player index
    if (
      activePlayer &&
      !activePlayer.isFolded &&
      !aiThinking &&
      lastAITriggerIndex.current !== activePlayerIndex
    ) {
      lastAITriggerIndex.current = activePlayerIndex;
      processAITurn();
    }
  }, [phase, activePlayerIndex, players, aiThinking, processAITurn]);

  // Record hand result when phase changes to "result" or "showdown"
  useEffect(() => {
    if ((phase === "result" || phase === "showdown") && winners && winners.length > 0 && !handRecorded.current) {
      handRecorded.current = true;
      const hero = players.find(p => p.isHero);
      if (hero) {
        const isWin = winners.some(w => w.isHero);
        // Calculate correct profit accounting for split pots
        const potShare = lastWonPot / winners.length;
        const profitBB = isWin ? potShare - hero.totalInvested : -hero.totalInvested;
        recordTableTrainerHand(hero.position, isWin, profitBB, user?.id);
      }
    }
    // Reset flag when starting new hand
    if (phase === "setup" || phase === "playing") {
      handRecorded.current = false;
    }
  }, [phase, winners, players, lastWonPot, recordTableTrainerHand, user?.id]);

  const handleLoadScenario = (scenario: ScenarioPreset) => {
    loadScenario(scenario);
    setShowScenarioSelector(false);
  };

  // Keyboard shortcuts with safety checks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if any modifier key is pressed
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;

      // Skip if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if (phase !== "playing") return;
      const activePlayer = players[activePlayerIndex];
      if (!activePlayer?.isHero) return;

      const actions = getAvailableActions();
      let handled = false;

      switch (e.key.toLowerCase()) {
        case "f":
          if (actions.find((a) => a.type === "fold")) {
            handleAction("fold");
            handled = true;
          }
          break;
        case "c":
          if (actions.find((a) => a.type === "check")) {
            handleAction("check");
            handled = true;
          } else if (actions.find((a) => a.type === "call")) {
            handleAction("call");
            handled = true;
          }
          break;
        case "r":
          const betAction = actions.find((a) => a.type === "bet" || a.type === "raise");
          if (betAction) {
            handleAction(betAction.type, selectedBetSize || betAction.minAmount);
            handled = true;
          }
          break;
        case "a":
          if (actions.find((a) => a.type === "allin")) {
            handleAction("allin");
            handled = true;
          }
          break;
      }

      // Prevent default only if we handled the key
      if (handled) {
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, activePlayerIndex, players, getAvailableActions, handleAction, selectedBetSize]);

  // Set default bet size when actions change
  useEffect(() => {
    if (phase === "playing") {
      const actions = getAvailableActions();
      const betAction = actions.find((a) => a.type === "bet" || a.type === "raise");
      if (betAction && !selectedBetSize) {
        setSelectedBetSize(betAction.minAmount || pot * 0.5);
      }
    }
  }, [phase, pot, getAvailableActions, selectedBetSize, setSelectedBetSize]);

  const handleHeroPositionChange = (position: string) => {
    setHeroPosition(position as Position);
  };

  const heroIndex = players.findIndex((p) => p.isHero);
  const hero = players[heroIndex];
  const activePlayer = players[activePlayerIndex];
  const isHeroTurn = activePlayer?.isHero && phase === "playing";
  const availableActions = isHeroTurn ? getAvailableActions() : [];

  // Check if we're on mobile
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // Hide footer when this component is mounted
  useEffect(() => {
    // Add a class to body to hide footer on this page
    document.body.classList.add('table-trainer-active');
    return () => {
      document.body.classList.remove('table-trainer-active');
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-gray-950 text-white flex flex-col z-40">
      {/* Header */}
      <header data-table-trainer-header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm shrink-0 z-50">
        <div className="container mx-auto px-4 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">GTO Table Trainer</h1>
            <Badge variant="outline" className="text-xs">
              Beta
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            {/* Scenario Selector Button */}
            {phase === "setup" && (
              <ScenarioButton onClick={() => setShowScenarioSelector(true)} />
            )}

            {/* Hero Position Selector */}
            {phase === "setup" && !trainingMode.scenario && (
              <select
                onChange={(e) => handleHeroPositionChange(e.target.value)}
                defaultValue={hero?.position || "BTN"}
                className="w-36 h-10 px-3 rounded-md bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos} - {POSITION_LABELS[pos].zh}
                  </option>
                ))}
              </select>
            )}

            {/* Active Scenario Badge */}
            {trainingMode.scenario && (
              <Badge variant="secondary" className="bg-purple-600/20 text-purple-400 border-purple-500/50">
                {trainingMode.scenario.nameZh}
              </Badge>
            )}

            {/* Session Stats */}
            <div className="hidden sm:flex items-center gap-3 text-sm">
              <span className="text-gray-400">
                手數: <span className="text-white">{sessionStats.handsPlayed}</span>
              </span>
              <span className="text-gray-400">
                勝率:{" "}
                <span className="text-green-400">
                  {sessionStats.handsPlayed > 0
                    ? ((sessionStats.handsWon / sessionStats.handsPlayed) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </span>
              <span
                className={cn(
                  "font-semibold",
                  sessionStats.totalProfit >= 0 ? "text-green-400" : "text-red-400"
                )}
              >
                {sessionStats.totalProfit >= 0 ? "+" : ""}
                {sessionStats.totalProfit.toFixed(1)} BB
              </span>
            </div>

            {/* Dev Mode Toggle */}
            <Button
              variant={devMode ? "default" : "outline"}
              size="sm"
              onClick={() => setDevMode(!devMode)}
              className={cn(devMode && "bg-purple-600 hover:bg-purple-500")}
              title="開發者模式：顯示 AI 手牌"
            >
              {devMode ? "🔓 Dev" : "🔒 Dev"}
            </Button>

            {/* Reset Button */}
            <Button variant="outline" size="sm" onClick={resetSession}>
              重置
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 flex-1 flex flex-col overflow-hidden">
        {/* Desktop: Table + Action buttons side by side, Mobile: Stack */}
        <div className="flex-1 flex flex-col lg:flex-row gap-2 sm:gap-4 min-h-0">
          {/* Left: Poker Table Area */}
          <div className="flex-1 flex flex-col gap-2 sm:gap-3 min-h-0">
            {/* Game Phase Indicator */}
            <div className="flex items-center justify-between mb-1 sm:mb-2 shrink-0">
              <div className="flex items-center gap-1 sm:gap-2">
                <Badge
                  variant={phase === "playing" ? "default" : "secondary"}
                  className={cn(
                    phase === "playing" && "bg-green-600",
                    phase === "showdown" && "bg-purple-600",
                    phase === "result" && "bg-amber-600"
                  )}
                >
                  {phase === "setup" && "準備中"}
                  {phase === "playing" && `進行中 - ${currentStreet.toUpperCase()}`}
                  {phase === "showdown" && "攤牌"}
                  {phase === "result" && "結算"}
                </Badge>

                {aiThinking && (
                  <span className="text-sm text-gray-400 animate-pulse">AI 思考中...</span>
                )}
              </div>

              {activePlayer && phase === "playing" && (
                <div className="text-sm">
                  <span className="text-gray-400">當前行動: </span>
                  <span className={activePlayer.isHero ? "text-yellow-400 font-semibold" : "text-white"}>
                    {activePlayer.name} ({activePlayer.position})
                  </span>
                </div>
              )}
            </div>

            {/* Poker Table */}
            <div className="bg-gray-800/50 rounded-xl sm:rounded-2xl p-2 sm:p-6 flex-1 min-h-0">
              {isMobile ? (
                <CompactPokerTable
                  players={players}
                  communityCards={communityCards}
                  pot={phase === "result" || phase === "showdown" ? lastWonPot : pot}
                  activePlayerIndex={activePlayerIndex}
                  heroIndex={heroIndex}
                />
              ) : (
                <PokerTable
                  players={players}
                  communityCards={communityCards}
                  pot={phase === "result" || phase === "showdown" ? lastWonPot : pot}
                  activePlayerIndex={activePlayerIndex}
                  showAllCards={phase === "showdown" || phase === "result"}
                  devMode={devMode}
                />
              )}
            </div>

            {/* Mobile Action Area - only show on mobile */}
            <div className="lg:hidden space-y-2 relative z-30 shrink-0">
              {/* Start / New Hand Button */}
              {(phase === "setup" || phase === "result" || phase === "showdown") && (
                <div className="flex justify-center">
                  <Button
                    size="lg"
                    onClick={startNewHand}
                    className="bg-green-600 hover:bg-green-500 text-base px-6"
                  >
                    {phase === "setup" ? "開始遊戲" : "下一手"}
                  </Button>
                </div>
              )}

              {/* Winner Display */}
              {winners && winners.length > 0 && (
                <div className="text-center py-2 space-y-1">
                  <p className="text-sm">
                    <span className="text-gray-400">贏家: </span>
                    <span className={winners[0].isHero ? "text-yellow-400 font-bold" : "text-white font-semibold"}>
                      {winners.map(w => w.name).join(", ")}
                    </span>
                    {lastWonPot > 0 && (
                      <span className="text-green-400 ml-2">(+{lastWonPot.toFixed(1)} BB)</span>
                    )}
                  </p>
                  {handEvaluations && handEvaluations.size > 0 && winners[0] && (
                    <p className="text-xs text-green-400">
                      {handEvaluations.get(winners[0].id)?.descriptionZh || handEvaluations.get(winners[0].id)?.description}
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons (Hero's turn) - Mobile */}
              {isHeroTurn && !aiThinking && (
                <ActionButtons
                  availableActions={availableActions}
                  onAction={handleAction}
                  currentBet={currentBet}
                  potSize={pot}
                  heroStack={hero?.stack || 0}
                  selectedBetSize={selectedBetSize}
                  onBetSizeChange={setSelectedBetSize}
                  disabled={aiThinking}
                />
              )}
            </div>
          </div>

          {/* Desktop Right Panel - Action Buttons & Controls */}
          <div className="hidden lg:flex flex-col w-80 shrink-0 gap-3">
            {/* Action Buttons Area */}
            <Card className="bg-gray-800/50 border-gray-700 flex-1">
              <CardContent className="p-4 h-full flex flex-col">
                {/* Start / New Hand Button */}
                {(phase === "setup" || phase === "result" || phase === "showdown") && (
                  <div className="flex-1 flex items-center justify-center">
                    <Button
                      size="lg"
                      onClick={startNewHand}
                      className="bg-green-600 hover:bg-green-500 text-lg px-8 py-6"
                    >
                      {phase === "setup" ? "開始遊戲" : "下一手"}
                    </Button>
                  </div>
                )}

                {/* Winner Display + Hand Review */}
                {winners && winners.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {/* Winner Info */}
                    <div className="text-center py-2 space-y-1">
                      <p className="text-lg">
                        <span className="text-gray-400">贏家: </span>
                        <span className={winners[0].isHero ? "text-yellow-400 font-bold" : "text-white font-semibold"}>
                          {winners.map(w => w.name).join(", ")}
                        </span>
                      </p>
                      {lastWonPot > 0 && (
                        <p className={cn(
                          "text-xl font-bold",
                          winners.some(w => w.isHero) ? "text-green-400" : "text-red-400"
                        )}>
                          {winners.some(w => w.isHero) ? "+" : "-"}{(winners.some(w => w.isHero) ? lastWonPot : hero?.totalInvested || 0).toFixed(1)} BB
                        </p>
                      )}
                      {handEvaluations && handEvaluations.size > 0 && winners[0] && (
                        <p className="text-sm text-green-400">
                          {handEvaluations.get(winners[0].id)?.descriptionZh || handEvaluations.get(winners[0].id)?.description}
                        </p>
                      )}
                    </div>

                    {/* Hand Review - Hero's Actions */}
                    {actionHistory.filter(a => a.isHero).length > 0 && (
                      <div className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-2">你的行動回顧:</p>
                        <div className="flex flex-wrap gap-1">
                          {actionHistory.filter(a => a.isHero).map((action, i) => (
                            <span
                              key={i}
                              className={cn(
                                "px-2 py-0.5 rounded text-xs",
                                action.action === "fold" && "bg-red-500/20 text-red-400",
                                action.action === "check" && "bg-gray-500/20 text-gray-300",
                                action.action === "call" && "bg-blue-500/20 text-blue-400",
                                (action.action === "bet" || action.action === "raise") && "bg-green-500/20 text-green-400",
                                action.action === "allin" && "bg-red-600/30 text-red-400"
                              )}
                            >
                              {action.street}: {action.action.toUpperCase()}
                              {action.amount ? ` ${action.amount.toFixed(1)}` : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons (Hero's turn) - Desktop */}
                {isHeroTurn && !aiThinking && (
                  <ActionButtons
                    availableActions={availableActions}
                    onAction={handleAction}
                    currentBet={currentBet}
                    potSize={pot}
                    heroStack={hero?.stack || 0}
                    selectedBetSize={selectedBetSize}
                    onBetSizeChange={setSelectedBetSize}
                    disabled={aiThinking}
                  />
                )}

                {/* Waiting indicator */}
                {phase === "playing" && !isHeroTurn && (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-gray-400 text-center">
                      {aiThinking ? "AI 思考中..." : "等待對手行動..."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hero Stats - Desktop */}
            {hero && (
              <Card className="bg-yellow-500/10 border-yellow-500/30">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-400 font-semibold">{hero.position} - Hero</p>
                      <p className="text-xs text-gray-400">本手投入: {hero.totalInvested.toFixed(1)} BB</p>
                    </div>
                    <p className="text-xl font-bold text-green-400">{hero.stack.toFixed(1)} BB</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Bottom Panel - Action History (Desktop) / Toggle (Mobile) */}
        <div className="shrink-0 mt-2 sm:mt-3">
          {/* Mobile Sidebar Toggle */}
          <div className="lg:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMobileSidebar(!showMobileSidebar)}
              className="w-full flex items-center justify-center gap-2"
            >
              <History className="h-4 w-4" />
              <span>行動歷史</span>
              {showMobileSidebar ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          {/* Action History - Desktop (horizontal bar) / Mobile (collapsible) */}
          <div className={cn(
            showMobileSidebar ? "block mt-2" : "hidden lg:block"
          )}>
            {/* Desktop: Horizontal action history bar */}
            <div className="hidden lg:block">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="py-2 px-4">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400 shrink-0">行動歷史:</span>
                    <div className="flex-1 flex items-center gap-2 overflow-x-auto">
                      {actionHistory.length === 0 ? (
                        <span className="text-xs text-gray-500">尚無行動</span>
                      ) : (
                        actionHistory.slice(-10).map((action, i) => (
                          <span
                            key={i}
                            className={cn(
                              "text-xs px-2 py-1 rounded whitespace-nowrap",
                              action.isHero ? "bg-yellow-500/20" : "bg-gray-700/50"
                            )}
                          >
                            <span className="text-gray-400">{action.position}</span>{" "}
                            <span className={cn(
                              action.action === "fold" && "text-red-400",
                              action.action === "check" && "text-gray-300",
                              action.action === "call" && "text-blue-400",
                              (action.action === "bet" || action.action === "raise") && "text-green-400",
                              action.action === "allin" && "text-red-500 font-bold"
                            )}>
                              {action.action.toUpperCase()}
                            </span>
                            {action.amount && <span className="text-gray-400"> {action.amount.toFixed(1)}</span>}
                          </span>
                        ))
                      )}
                    </div>
                    {/* Keyboard shortcuts inline */}
                    <div className="flex items-center gap-3 shrink-0 border-l border-gray-700 pl-4">
                      <span className="text-[10px] text-gray-500">
                        <kbd className="px-1 bg-gray-700 rounded">F</kbd> Fold
                      </span>
                      <span className="text-[10px] text-gray-500">
                        <kbd className="px-1 bg-gray-700 rounded">C</kbd> Call
                      </span>
                      <span className="text-[10px] text-gray-500">
                        <kbd className="px-1 bg-gray-700 rounded">R</kbd> Raise
                      </span>
                      <span className="text-[10px] text-gray-500">
                        <kbd className="px-1 bg-gray-700 rounded">A</kbd> All-in
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Mobile: Vertical collapsible */}
            <div className="lg:hidden space-y-2">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardContent className="py-2">
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {actionHistory.length === 0 ? (
                      <p className="text-xs text-gray-500">尚無行動</p>
                    ) : (
                      actionHistory.slice(-10).map((action, i) => (
                        <div
                          key={i}
                          className={cn(
                            "text-xs p-1 rounded",
                            action.isHero ? "bg-yellow-500/10" : "bg-gray-700/50"
                          )}
                        >
                          <span className="text-gray-400">{action.position}</span>{" "}
                          <span className={cn(
                            action.action === "fold" && "text-red-400",
                            action.action === "check" && "text-gray-300",
                            action.action === "call" && "text-blue-400",
                            (action.action === "bet" || action.action === "raise") && "text-green-400",
                            action.action === "allin" && "text-red-500 font-bold"
                          )}>
                            {action.action.toUpperCase()}
                          </span>
                          {action.amount && <span className="text-gray-400"> {action.amount.toFixed(1)}</span>}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Scenario Selector Modal */}
      {showScenarioSelector && (
        <ScenarioSelector
          onSelect={handleLoadScenario}
          onClose={() => setShowScenarioSelector(false)}
        />
      )}
    </div>
  );
}
