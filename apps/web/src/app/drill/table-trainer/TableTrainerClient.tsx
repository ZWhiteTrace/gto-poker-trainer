"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useTableStore, setAIOpponentStyle } from "@/stores/tableStore";
import { useProgressStore } from "@/stores/progressStore";
import { useAuthStore } from "@/stores/authStore";
import {
  PokerTable,
  CompactPokerTable,
  ActionButtons,
  ScenarioSelector,
  ScenarioButton,
} from "@/components/poker/table";
import { AI_PROFILES, type AIPlayerProfile } from "@/lib/poker/aiDecisionEngine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  POSITIONS,
  Position,
  POSITION_LABELS,
  ScenarioPreset,
  HintMode,
  GTOHint,
  ActionType,
} from "@/lib/poker/types";
import {
  getPlayerVPIP,
  getPlayerPFR,
  getPlayer3Bet,
  getPlayerATS,
  getFlopCBet,
  getTurnCBet,
  getRiverCBet,
  getFoldToCBet,
  getCallCBet,
  getRaiseCBet,
  getWTSD,
  getWSD,
  getTAF,
  getPlayerType,
} from "@/lib/poker/playerStats";
import {
  STATS_THRESHOLDS,
  analyzePlayerStats,
  getTopImprovementAreas,
  getOverallPerformance,
  type StatFeedback,
} from "@/lib/poker/statsFeedback";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, History, RotateCw, BarChart3, FileText, Home } from "lucide-react";
import Link from "next/link";
import { HandHistoryPanel } from "@/components/poker/HandHistoryPanel";
import { GTOHintPanel, HintModeSelector } from "@/components/poker/GTOHintPanel";
import { AIExploitAnalysis } from "@/components/poker/AIExploitAnalysis";
import { LearningPathPanel } from "@/components/poker/LearningPathPanel";
import { generateGTOHint, generateGTOHintWithSolver } from "@/lib/poker/gtoHintEngine";

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
    heroStats,
    positionStats,
    aiOpponentStats,
    actionHistory,
    winners,
    handEvaluations,
    trainingMode,
    autoRotate,
    initializeTable,
    setHeroPosition,
    loadScenario,
    startNewHand,
    handleAction,
    getAvailableActions,
    setSelectedBetSize,
    resetSession,
    processAITurn,
    setAutoRotate,
  } = useTableStore();

  const [showScenarioSelector, setShowScenarioSelector] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [showOpponentSelector, setShowOpponentSelector] = useState(false);
  const [selectedOpponentStyle, setSelectedOpponentStyle] = useState<string>("mixed");
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [showHandHistory, setShowHandHistory] = useState(false);
  const [hintMode, setHintMode] = useState<HintMode>("off");
  const [lastHeroAction, setLastHeroAction] = useState<ActionType | null>(null);
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
    if (
      (phase === "result" || phase === "showdown") &&
      winners &&
      winners.length > 0 &&
      !handRecorded.current
    ) {
      handRecorded.current = true;
      const hero = players.find((p) => p.isHero);
      if (hero) {
        const isWin = winners.some((w) => w.isHero);
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

  // Memoize display pot to prevent flicker during phase transitions
  const displayPot = useMemo(() => {
    return phase === "result" || phase === "showdown" ? lastWonPot : pot;
  }, [phase, pot, lastWonPot]);

  // GTO hint state - async with solver, fallback to rules-based
  const [gtoHint, setGtoHint] = useState<GTOHint | null>(null);
  const [isLoadingSolverHint, setIsLoadingSolverHint] = useState(false);

  // Generate GTO hint for current situation
  useEffect(() => {
    if (hintMode === "off") {
      setGtoHint(null);
      return;
    }

    const hero = players.find((p) => p.isHero);
    if (!hero || !hero.holeCards || phase !== "playing") {
      setGtoHint(null);
      return;
    }

    const activePlayer = players[activePlayerIndex];
    if (!activePlayer?.isHero) {
      setGtoHint(null);
      return;
    }

    // Determine if hero is in position
    const dealerIndex = players.findIndex((p) => p.isDealer);
    const activePlayers = players.filter((p) => p.isActive && !p.isFolded && !p.isAllIn);
    const heroSeatIndex = hero.seatIndex;
    const isInPosition = activePlayers.every(
      (p) =>
        p.seatIndex === heroSeatIndex ||
        (p.seatIndex - dealerIndex + 6) % 6 < (heroSeatIndex - dealerIndex + 6) % 6
    );

    // Check if hero was preflop aggressor
    const preflopActions = actionHistory.filter((a) => a.street === "preflop");
    const preflopRaiser = preflopActions
      .filter((a) => a.action === "raise" || a.action === "bet")
      .pop();
    const isPreflopAggressor = preflopRaiser?.isHero ?? false;

    // Check if facing a bet
    const facingBet = currentBet > hero.currentBet;

    const hintContext = {
      holeCards: hero.holeCards,
      communityCards,
      position: hero.position,
      street: currentStreet,
      pot,
      currentBet,
      playerBet: hero.currentBet,
      stack: hero.stack,
      isInPosition,
      facingBet,
      isPreflopAggressor,
    };

    // First set rules-based hint immediately for fast response
    const rulesBasedHint = generateGTOHint(hintContext);
    setGtoHint(rulesBasedHint);

    // Then try to get solver-based hint for postflop
    if (currentStreet !== "preflop" && communityCards.length >= 3) {
      setIsLoadingSolverHint(true);
      generateGTOHintWithSolver(hintContext)
        .then((solverHint) => {
          // Only update if we got solver data
          if (solverHint.reasoning.solverData) {
            setGtoHint(solverHint);
          }
        })
        .catch(() => {
          // Keep rules-based hint on error
        })
        .finally(() => {
          setIsLoadingSolverHint(false);
        });
    }
  }, [
    players,
    activePlayerIndex,
    phase,
    communityCards,
    currentStreet,
    pot,
    currentBet,
    actionHistory,
    hintMode,
  ]);

  // Wrap handleAction to track last hero action
  const handleActionWithTracking = (action: ActionType, amount?: number) => {
    const activePlayer = players[activePlayerIndex];
    if (activePlayer?.isHero) {
      setLastHeroAction(action);
    }
    handleAction(action, amount);
  };

  // Reset last hero action when street changes or hand ends
  useEffect(() => {
    if (phase === "setup" || phase === "result" || phase === "showdown") {
      setLastHeroAction(null);
    }
  }, [phase]);

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

      let handled = false;

      // Space/Enter to start new hand (when not playing)
      if (e.key === " " || e.key === "Enter") {
        if (phase === "setup" || phase === "result" || phase === "showdown") {
          startNewHand();
          handled = true;
        }
      }

      // Action shortcuts (only when playing and hero's turn)
      if (phase === "playing") {
        const activePlayer = players[activePlayerIndex];
        if (activePlayer?.isHero) {
          const actions = getAvailableActions();

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
        }
      }

      // Prevent default only if we handled the key
      if (handled) {
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    phase,
    activePlayerIndex,
    players,
    getAvailableActions,
    handleAction,
    selectedBetSize,
    startNewHand,
  ]);

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
    document.body.classList.add("table-trainer-active");
    return () => {
      document.body.classList.remove("table-trainer-active");
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gradient-to-b from-gray-900 to-gray-950 pb-[env(safe-area-inset-bottom)] text-white">
      {/* Header */}
      <header
        data-table-trainer-header
        className="z-50 shrink-0 border-b border-gray-800 bg-gray-900/50 pt-[env(safe-area-inset-top)] backdrop-blur-sm"
      >
        <div className="container mx-auto flex items-center justify-between px-4 py-2 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/"
              className="rounded-lg p-2 transition-colors hover:bg-gray-800"
              title="回首頁"
            >
              <Home className="h-5 w-5" />
            </Link>
            <Badge variant="outline" className="text-xs">
              Beta
            </Badge>
          </div>

          <div className="scrollbar-thin scrollbar-thumb-gray-700 flex max-w-[60vw] items-center gap-2 overflow-x-auto sm:max-w-none sm:gap-3">
            {/* Scenario Selector Button */}
            {phase === "setup" && <ScenarioButton onClick={() => setShowScenarioSelector(true)} />}

            {/* AI Opponent Style Selector */}
            <select
              value={selectedOpponentStyle}
              onChange={(e) => {
                const newStyle = e.target.value;
                setSelectedOpponentStyle(newStyle);
                setAIOpponentStyle(newStyle);
                // Reinitialize table with new AI profiles
                if (phase === "setup" || phase === "showdown") {
                  initializeTable();
                }
              }}
              className="focus:ring-primary h-10 rounded-md border border-gray-700 bg-gray-800 px-2 text-sm text-white focus:ring-2 focus:outline-none"
              title="AI 對手風格"
            >
              <option value="mixed">🎲 混合對手</option>
              <option value="gto-bot">🤖 GTO Bot</option>
              <option value="lag-larry">🔥 LAG 激進</option>
              <option value="tag-tony">🦈 TAG 緊凶</option>
              <option value="passive-pete">🐟 跟注站</option>
              <option value="nit-nancy">🐢 緊被</option>
              <option value="maniac-mike">🃏 瘋狂</option>
            </select>

            {/* Auto Rotate Toggle */}
            <Button
              variant={autoRotate ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRotate(!autoRotate)}
              className={cn("gap-1.5", autoRotate && "bg-blue-600 hover:bg-blue-500")}
              title={autoRotate ? "自動輪流位置 (開啟)" : "自動輪流位置 (關閉)"}
            >
              <RotateCw
                className={cn("h-4 w-4", autoRotate && "animate-spin")}
                style={{ animationDuration: "3s" }}
              />
              <span className="hidden sm:inline">{autoRotate ? "輪流" : "固定"}</span>
            </Button>

            {/* Hero Position Selector - only show when not auto rotating */}
            {phase === "setup" && !trainingMode.scenario && !autoRotate && (
              <select
                onChange={(e) => handleHeroPositionChange(e.target.value)}
                defaultValue={hero?.position || "BTN"}
                className="focus:ring-primary h-10 w-36 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm text-white focus:ring-2 focus:outline-none"
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
              <Badge
                variant="secondary"
                className="border-purple-500/50 bg-purple-600/20 text-purple-400"
              >
                {trainingMode.scenario.nameZh}
              </Badge>
            )}

            {/* Session Stats */}
            <div className="hidden items-center gap-3 text-sm sm:flex">
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

            {/* Dev Mode: AI Adaptation Hint */}
            {devMode && heroStats.handsPlayed >= 10 && (
              <div className="hidden rounded border border-purple-500/30 bg-purple-900/50 px-2 py-1 text-xs text-purple-300 sm:block">
                AI 適應中: VPIP {(getPlayerVPIP(heroStats) * 100).toFixed(0)}% / PFR{" "}
                {(getPlayerPFR(heroStats) * 100).toFixed(0)}%
              </div>
            )}

            {/* Stats Panel Toggle */}
            <Button
              variant={showStatsPanel ? "default" : "outline"}
              size="sm"
              onClick={() => setShowStatsPanel(!showStatsPanel)}
              className={cn("gap-1.5", showStatsPanel && "bg-cyan-600 hover:bg-cyan-500")}
              title="玩家統計"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">統計</span>
            </Button>

            {/* GTO Hint Mode Selector */}
            <HintModeSelector mode={hintMode} onChange={setHintMode} className="flex" />

            {/* Hand History Toggle */}
            <Button
              variant={showHandHistory ? "default" : "outline"}
              size="sm"
              onClick={() => setShowHandHistory(!showHandHistory)}
              className={cn("gap-1.5", showHandHistory && "bg-amber-600 hover:bg-amber-500")}
              title="手牌紀錄"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">紀錄</span>
            </Button>

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

      <main className="container mx-auto flex flex-1 flex-col overflow-auto px-2 py-2 sm:px-4 sm:py-4">
        {/* Desktop: Table + Action buttons side by side, Mobile: Stack */}
        <div className="flex min-h-0 flex-1 flex-col gap-2 sm:gap-4 lg:flex-row">
          {/* Left: Poker Table Area */}
          <div className="flex min-h-0 flex-1 flex-col gap-2 sm:gap-3">
            {/* Game Phase Indicator */}
            <div className="mb-1 flex shrink-0 items-center justify-between sm:mb-2">
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
                  <span className="animate-pulse text-sm text-gray-400">AI 思考中...</span>
                )}
              </div>

              {activePlayer && phase === "playing" && (
                <div className="text-sm">
                  <span className="text-gray-400">當前行動: </span>
                  <span
                    className={activePlayer.isHero ? "font-semibold text-yellow-400" : "text-white"}
                  >
                    {activePlayer.name} ({activePlayer.position})
                  </span>
                </div>
              )}
            </div>

            {/* Poker Table */}
            <div className="min-h-0 flex-1 rounded-lg bg-gray-800/50 p-1 sm:rounded-2xl sm:p-6">
              {isMobile ? (
                <CompactPokerTable
                  players={players}
                  communityCards={communityCards}
                  pot={displayPot}
                  activePlayerIndex={activePlayerIndex}
                  heroIndex={heroIndex}
                  showAllCards={phase === "showdown" || phase === "result"}
                  devMode={devMode}
                />
              ) : (
                <PokerTable
                  players={players}
                  communityCards={communityCards}
                  pot={displayPot}
                  activePlayerIndex={activePlayerIndex}
                  showAllCards={phase === "showdown" || phase === "result"}
                  devMode={devMode}
                />
              )}
            </div>

            {/* Mobile Action Area - only show on mobile */}
            <div className="relative z-30 shrink-0 space-y-2 lg:hidden">
              {/* Start / New Hand Button */}
              {(phase === "setup" || phase === "result" || phase === "showdown") && (
                <div className="flex justify-center">
                  <Button
                    size="lg"
                    onClick={startNewHand}
                    className="bg-green-600 px-6 text-base hover:bg-green-500"
                  >
                    {phase === "setup" ? "開始遊戲" : "下一手"}
                  </Button>
                </div>
              )}

              {/* Winner Display */}
              {winners && winners.length > 0 && (
                <div className="space-y-1 py-2 text-center">
                  <p className="text-sm">
                    <span className="text-gray-400">贏家: </span>
                    <span
                      className={
                        winners[0].isHero ? "font-bold text-yellow-400" : "font-semibold text-white"
                      }
                    >
                      {winners.map((w) => `${w.name} (${w.position})`).join(", ")}
                    </span>
                    {lastWonPot > 0 && (
                      <span
                        className={cn(
                          "ml-2",
                          winners.some((w) => w.isHero) ? "text-green-400" : "text-red-400"
                        )}
                      >
                        {winners.some((w) => w.isHero)
                          ? `(+${lastWonPot.toFixed(1)} BB)`
                          : (hero?.totalInvested ?? 0) > 0
                            ? `(-${(hero?.totalInvested ?? 0).toFixed(1)} BB)`
                            : `(${lastWonPot.toFixed(1)} BB)`}
                      </span>
                    )}
                  </p>
                  {handEvaluations && handEvaluations.size > 0 && winners[0] && (
                    <p className="text-xs text-green-400">
                      {handEvaluations.get(winners[0].id)?.descriptionZh ||
                        handEvaluations.get(winners[0].id)?.description}
                    </p>
                  )}
                </div>
              )}

              {/* Mobile Hero Stats - show above action buttons */}
              {hero && phase === "playing" && (
                <div className="flex items-center justify-between rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-yellow-400">{hero.position}</span>
                    <span className="text-gray-400">Hero</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      投入: <span className="text-orange-400">{hero.totalInvested.toFixed(1)}</span>
                    </span>
                    <span
                      className={cn(
                        "font-semibold",
                        hero.stack > 50
                          ? "text-green-400"
                          : hero.stack > 20
                            ? "text-yellow-400"
                            : "text-red-400"
                      )}
                    >
                      {hero.stack.toFixed(1)} BB
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons (Hero's turn) - Mobile */}
              {isHeroTurn && !aiThinking && (
                <ActionButtons
                  availableActions={availableActions}
                  onAction={handleActionWithTracking}
                  currentBet={currentBet}
                  potSize={pot}
                  heroStack={hero?.stack || 0}
                  selectedBetSize={selectedBetSize}
                  onBetSizeChange={setSelectedBetSize}
                  disabled={aiThinking}
                />
              )}

              {/* GTO Hint Panel - Mobile */}
              <div className="lg:hidden">
                {(hintMode === "before" || hintMode === "detailed") && isHeroTurn && gtoHint && (
                  <GTOHintPanel hint={gtoHint} mode={hintMode} className="mt-3" />
                )}
                {hintMode === "after" && lastHeroAction && gtoHint && (
                  <GTOHintPanel
                    hint={gtoHint}
                    mode={hintMode}
                    lastAction={lastHeroAction}
                    className="mt-3"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Desktop Right Panel - Action Buttons & Controls */}
          <div className="hidden max-h-full w-80 shrink-0 flex-col gap-3 overflow-y-auto lg:flex">
            {/* Action Buttons Area */}
            <Card className="flex-1 border-gray-700 bg-gray-800/50">
              <CardContent className="flex h-full flex-col p-4">
                {/* Start / New Hand Button */}
                {(phase === "setup" || phase === "result" || phase === "showdown") && (
                  <div className="flex flex-1 items-center justify-center">
                    <Button
                      size="lg"
                      onClick={startNewHand}
                      className="bg-green-600 px-8 py-6 text-lg hover:bg-green-500"
                    >
                      {phase === "setup" ? "開始遊戲" : "下一手"}
                    </Button>
                  </div>
                )}

                {/* Winner Display + Hand Review */}
                {winners && winners.length > 0 && (
                  <div className="mb-4 space-y-3">
                    {/* Winner Info */}
                    <div className="space-y-1 py-2 text-center">
                      <p className="text-lg">
                        <span className="text-gray-400">贏家: </span>
                        <span
                          className={
                            winners[0].isHero
                              ? "font-bold text-yellow-400"
                              : "font-semibold text-white"
                          }
                        >
                          {winners.map((w) => `${w.name} (${w.position})`).join(", ")}
                        </span>
                      </p>
                      {lastWonPot > 0 && (
                        <p
                          className={cn(
                            "text-xl font-bold",
                            winners.some((w) => w.isHero) ? "text-green-400" : "text-red-400"
                          )}
                        >
                          {winners.some((w) => w.isHero)
                            ? `+${lastWonPot.toFixed(1)} BB`
                            : (hero?.totalInvested ?? 0) > 0
                              ? `-${(hero?.totalInvested ?? 0).toFixed(1)} BB`
                              : `底池 ${lastWonPot.toFixed(1)} BB`}
                        </p>
                      )}
                      {handEvaluations && handEvaluations.size > 0 && winners[0] && (
                        <p className="text-sm text-green-400">
                          {handEvaluations.get(winners[0].id)?.descriptionZh ||
                            handEvaluations.get(winners[0].id)?.description}
                        </p>
                      )}
                    </div>

                    {/* Hand Review - Hero's Actions */}
                    {actionHistory.filter((a) => a.isHero).length > 0 && (
                      <div className="rounded-lg bg-gray-800/50 p-3">
                        <p className="mb-2 text-xs text-gray-400">你的行動回顧:</p>
                        <div className="flex flex-wrap gap-1">
                          {actionHistory
                            .filter((a) => a.isHero)
                            .map((action, i) => (
                              <span
                                key={i}
                                className={cn(
                                  "rounded px-2 py-0.5 text-xs",
                                  action.action === "fold" && "bg-red-500/20 text-red-400",
                                  action.action === "check" && "bg-gray-500/20 text-gray-300",
                                  action.action === "call" && "bg-blue-500/20 text-blue-400",
                                  (action.action === "bet" || action.action === "raise") &&
                                    "bg-green-500/20 text-green-400",
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
                    onAction={handleActionWithTracking}
                    currentBet={currentBet}
                    potSize={pot}
                    heroStack={hero?.stack || 0}
                    selectedBetSize={selectedBetSize}
                    onBetSizeChange={setSelectedBetSize}
                    disabled={aiThinking}
                  />
                )}

                {/* GTO Hint Panel - Always below action buttons */}
                {/* 行動前: 輪到你時顯示建議 */}
                {/* 行動後: 你行動後才顯示分析 */}
                {/* 詳細: 顯示更詳細的說明 */}
                {(hintMode === "before" || hintMode === "detailed") && isHeroTurn && gtoHint && (
                  <GTOHintPanel hint={gtoHint} mode={hintMode} className="mt-3" />
                )}
                {hintMode === "after" && lastHeroAction && gtoHint && (
                  <GTOHintPanel
                    hint={gtoHint}
                    mode={hintMode}
                    lastAction={lastHeroAction}
                    className="mt-3"
                  />
                )}

                {/* Waiting indicator */}
                {phase === "playing" && !isHeroTurn && (
                  <div className="flex flex-1 items-center justify-center">
                    <p className="text-center text-gray-400">
                      {aiThinking ? "AI 思考中..." : "等待對手行動..."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hero Stats - Desktop */}
            {hero && (
              <Card className="border-yellow-500/30 bg-yellow-500/10">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-yellow-400">{hero.position} - Hero</p>
                      <p className="text-xs text-gray-400">
                        本手投入: {hero.totalInvested.toFixed(1)} BB
                      </p>
                    </div>
                    <p className="text-xl font-bold text-green-400">{hero.stack.toFixed(1)} BB</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Bottom Panel - Action History (Desktop) / Toggle (Mobile) */}
        <div className="mt-2 shrink-0 sm:mt-3">
          {/* Mobile Sidebar Toggle */}
          <div className="lg:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMobileSidebar(!showMobileSidebar)}
              className="flex w-full items-center justify-center gap-2"
            >
              <History className="h-4 w-4" />
              <span>行動歷史</span>
              {showMobileSidebar ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Action History - Desktop (horizontal bar) / Mobile (collapsible) */}
          <div className={cn(showMobileSidebar ? "mt-2 block" : "hidden lg:block")}>
            {/* Desktop: Horizontal action history bar - limited width to not overlap right panel */}
            <div className="hidden lg:mr-[21rem] lg:block">
              <Card className="overflow-hidden border-gray-700 bg-gray-800/50">
                <CardContent className="px-4 py-2">
                  <div className="flex max-w-full items-center gap-4">
                    <span className="shrink-0 text-xs text-gray-400">行動歷史:</span>
                    <div className="flex flex-1 items-center gap-2 overflow-x-auto">
                      {actionHistory.length === 0 ? (
                        <span className="text-xs text-gray-500">尚無行動</span>
                      ) : (
                        actionHistory.slice(-10).map((action, i) => (
                          <span
                            key={i}
                            className={cn(
                              "rounded px-2 py-1 text-xs whitespace-nowrap",
                              action.isHero ? "bg-yellow-500/20" : "bg-gray-700/50"
                            )}
                          >
                            <span className="text-gray-400">{action.position}</span>{" "}
                            <span
                              className={cn(
                                action.action === "fold" && "text-red-400",
                                action.action === "check" && "text-gray-300",
                                action.action === "call" && "text-blue-400",
                                (action.action === "bet" || action.action === "raise") &&
                                  "text-green-400",
                                action.action === "allin" && "font-bold text-red-500"
                              )}
                            >
                              {action.action.toUpperCase()}
                            </span>
                            {action.amount && (
                              <span className="text-gray-400"> {action.amount.toFixed(1)}</span>
                            )}
                          </span>
                        ))
                      )}
                    </div>
                    {/* Keyboard shortcuts inline */}
                    <div className="flex shrink-0 items-center gap-3 border-l border-gray-700 pl-4">
                      <span className="text-[10px] text-gray-500">
                        <kbd className="rounded bg-gray-700 px-1">F</kbd> Fold
                      </span>
                      <span className="text-[10px] text-gray-500">
                        <kbd className="rounded bg-gray-700 px-1">C</kbd> Call
                      </span>
                      <span className="text-[10px] text-gray-500">
                        <kbd className="rounded bg-gray-700 px-1">R</kbd> Raise
                      </span>
                      <span className="text-[10px] text-gray-500">
                        <kbd className="rounded bg-gray-700 px-1">A</kbd> All-in
                      </span>
                      <span className="text-[10px] text-gray-500">
                        <kbd className="rounded bg-gray-700 px-1">Space</kbd> 下一手
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Mobile: Vertical collapsible */}
            <div className="space-y-2 lg:hidden">
              <Card className="border-gray-700 bg-gray-800/50">
                <CardContent className="py-2">
                  <div className="max-h-32 space-y-1 overflow-y-auto">
                    {actionHistory.length === 0 ? (
                      <p className="text-xs text-gray-500">尚無行動</p>
                    ) : (
                      actionHistory.slice(-10).map((action, i) => (
                        <div
                          key={i}
                          className={cn(
                            "rounded p-1 text-xs",
                            action.isHero ? "bg-yellow-500/10" : "bg-gray-700/50"
                          )}
                        >
                          <span className="text-gray-400">{action.position}</span>{" "}
                          <span
                            className={cn(
                              action.action === "fold" && "text-red-400",
                              action.action === "check" && "text-gray-300",
                              action.action === "call" && "text-blue-400",
                              (action.action === "bet" || action.action === "raise") &&
                                "text-green-400",
                              action.action === "allin" && "font-bold text-red-500"
                            )}
                          >
                            {action.action.toUpperCase()}
                          </span>
                          {action.amount && (
                            <span className="text-gray-400"> {action.amount.toFixed(1)}</span>
                          )}
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

      {/* Stats Panel Modal */}
      {showStatsPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="max-h-[80vh] w-full max-w-lg overflow-auto border-gray-700 bg-gray-900">
            <CardHeader className="sticky top-0 z-10 border-b border-gray-700 bg-gray-900">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white">
                  <BarChart3 className="h-5 w-5" />
                  玩家統計
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowStatsPanel(false)}>
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {/* Player Summary - Always Show */}
              <div className="flex items-center justify-between rounded-lg bg-gray-800/50 p-3">
                <div>
                  <p className="text-xs text-gray-400">手數</p>
                  <p className="text-lg font-bold text-white">{heroStats.handsPlayed}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">盈虧</p>
                  <p
                    className={cn(
                      "text-lg font-bold",
                      sessionStats.totalProfit >= 0 ? "text-green-400" : "text-red-400"
                    )}
                  >
                    {sessionStats.totalProfit >= 0 ? "+" : ""}
                    {sessionStats.totalProfit.toFixed(1)} BB
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">勝率</p>
                  <p className="text-lg font-bold text-white">
                    {heroStats.handsPlayed > 0
                      ? ((sessionStats.handsWon / heroStats.handsPlayed) * 100).toFixed(0)
                      : 0}
                    %
                  </p>
                </div>
              </div>

              {/* ===== 分階段統計顯示 ===== */}
              {heroStats.handsPlayed < STATS_THRESHOLDS.BASIC ? (
                /* 階段 1: 收集中 (0-29 手) */
                <div className="space-y-4 py-8 text-center">
                  <div className="mb-4 text-6xl">📊</div>
                  <p className="text-lg font-semibold text-gray-300">收集數據中...</p>
                  <p className="text-sm text-gray-500">
                    需要 {STATS_THRESHOLDS.BASIC} 手才能顯示基礎統計
                  </p>
                  <div className="mx-auto max-w-xs space-y-2">
                    <Progress
                      value={(heroStats.handsPlayed / STATS_THRESHOLDS.BASIC) * 100}
                      className="h-2"
                    />
                    <p className="text-xs text-gray-500">
                      {heroStats.handsPlayed} / {STATS_THRESHOLDS.BASIC} 手
                    </p>
                  </div>
                </div>
              ) : heroStats.handsPlayed < STATS_THRESHOLDS.FULL ? (
                /* 階段 2: 基礎統計 (30-99 手) */
                <>
                  {/* Player Type */}
                  <div className="rounded-lg bg-gray-800/30 p-3 text-center">
                    <p className="mb-1 text-xs text-gray-400">玩家類型</p>
                    <p className="text-xl font-bold text-yellow-400">{getPlayerType(heroStats)}</p>
                  </div>

                  {/* Basic Preflop Stats */}
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-gray-300">翻前統計 (基礎)</h3>
                    <div className="grid grid-cols-4 gap-2">
                      <StatRing
                        label="VPIP"
                        value={getPlayerVPIP(heroStats)}
                        target={[0.22, 0.26]}
                        color="cyan"
                      />
                      <StatRing
                        label="PFR"
                        value={getPlayerPFR(heroStats)}
                        target={[0.18, 0.22]}
                        color="orange"
                      />
                      <StatRing
                        label="ATS"
                        value={getPlayerATS(heroStats)}
                        target={[0.32, 0.38]}
                        color="yellow"
                      />
                      <StatRing
                        label="3BET"
                        value={getPlayer3Bet(heroStats)}
                        target={[0.08, 0.12]}
                        color="red"
                      />
                    </div>
                  </div>

                  {/* Progress to Full Stats */}
                  <div className="space-y-2 rounded-lg border border-blue-500/30 bg-blue-900/20 p-3">
                    <p className="text-xs font-semibold text-blue-400">解鎖完整分析</p>
                    <Progress
                      value={
                        ((heroStats.handsPlayed - STATS_THRESHOLDS.BASIC) /
                          (STATS_THRESHOLDS.FULL - STATS_THRESHOLDS.BASIC)) *
                        100
                      }
                      className="h-2"
                    />
                    <p className="text-xs text-gray-500">
                      還需 {STATS_THRESHOLDS.FULL - heroStats.handsPlayed} 手解鎖翻後統計與改進建議
                    </p>
                  </div>

                  {/* Position Stats - Basic */}
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-gray-300">各位置盈虧</h3>
                    <div className="grid grid-cols-6 gap-1">
                      {(["BTN", "CO", "HJ", "UTG", "SB", "BB"] as const).map((pos) => {
                        const stats = positionStats?.[pos] ?? {
                          handsPlayed: 0,
                          handsWon: 0,
                          totalProfit: 0,
                        };
                        return (
                          <div key={pos} className="rounded bg-gray-800/30 p-1.5 text-center">
                            <p className="text-xs font-semibold text-gray-400">{pos}</p>
                            <p
                              className={cn(
                                "text-sm font-bold",
                                stats.totalProfit >= 0 ? "text-green-400" : "text-red-400"
                              )}
                            >
                              {stats.totalProfit >= 0 ? "+" : ""}
                              {stats.totalProfit.toFixed(0)}
                            </p>
                            <p className="text-[10px] text-gray-500">{stats.handsPlayed}手</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                /* 階段 3: 完整統計 + 建議 (100+ 手) */
                <>
                  {/* Player Type & Performance */}
                  <div className="flex items-center justify-between rounded-lg bg-gray-800/30 p-3">
                    <div>
                      <p className="text-xs text-gray-400">玩家類型</p>
                      <p className="text-xl font-bold text-yellow-400">
                        {getPlayerType(heroStats)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">整體評估</p>
                      <p
                        className={cn(
                          "text-lg font-bold",
                          getOverallPerformance(heroStats).level === "excellent" &&
                            "text-green-400",
                          getOverallPerformance(heroStats).level === "good" && "text-blue-400",
                          getOverallPerformance(heroStats).level === "needs_work" &&
                            "text-yellow-400",
                          getOverallPerformance(heroStats).level === "poor" && "text-red-400"
                        )}
                      >
                        {getOverallPerformance(heroStats).levelZh}
                      </p>
                    </div>
                  </div>

                  {/* Improvement Suggestions */}
                  {getTopImprovementAreas(heroStats, 3).length > 0 && (
                    <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-900/20 p-3">
                      <p className="flex items-center gap-1 text-xs font-semibold text-amber-400">
                        💡 改進建議
                      </p>
                      <div className="space-y-2">
                        {getTopImprovementAreas(heroStats, 3).map((item, idx) => (
                          <div key={idx} className="text-sm">
                            <p className="text-amber-200">
                              <span className="font-semibold">{item.stat}</span>
                              <span className="ml-2 text-gray-400">
                                {(item.value * 100).toFixed(0)}% (目標{" "}
                                {(item.target[0] * 100).toFixed(0)}-
                                {(item.target[1] * 100).toFixed(0)}%)
                              </span>
                            </p>
                            <p className="mt-0.5 text-xs text-gray-400">{item.suggestion}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full Preflop Stats */}
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-gray-300">翻前統計</h3>
                    <div className="grid grid-cols-4 gap-2">
                      <StatRing
                        label="VPIP"
                        value={getPlayerVPIP(heroStats)}
                        target={[0.22, 0.26]}
                        color="cyan"
                      />
                      <StatRing
                        label="PFR"
                        value={getPlayerPFR(heroStats)}
                        target={[0.18, 0.22]}
                        color="orange"
                      />
                      <StatRing
                        label="ATS"
                        value={getPlayerATS(heroStats)}
                        target={[0.32, 0.38]}
                        color="yellow"
                      />
                      <StatRing
                        label="3BET"
                        value={getPlayer3Bet(heroStats)}
                        target={[0.08, 0.12]}
                        color="red"
                      />
                    </div>
                  </div>

                  {/* Full Postflop Stats - By Street */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Flop */}
                    <div className="rounded-lg bg-gray-800/30 p-2">
                      <h4 className="mb-2 text-center text-xs font-semibold text-gray-400">翻牌</h4>
                      <StatBar label="CB" value={getFlopCBet(heroStats)} target={[0.5, 0.6]} />
                      <StatBar label="FCB" value={getFoldToCBet(heroStats)} target={[0.38, 0.45]} />
                      <StatBar label="CCB" value={getCallCBet(heroStats)} target={[0.4, 0.5]} />
                      <StatBar label="RCB" value={getRaiseCBet(heroStats)} target={[0.1, 0.15]} />
                    </div>
                    {/* Turn */}
                    <div className="rounded-lg bg-gray-800/30 p-2">
                      <h4 className="mb-2 text-center text-xs font-semibold text-gray-400">轉牌</h4>
                      <StatBar label="CB" value={getTurnCBet(heroStats)} target={[0.45, 0.52]} />
                      <StatBar label="FCB" value={getFoldToCBet(heroStats)} target={[0.4, 0.48]} />
                      <StatBar label="CCB" value={getCallCBet(heroStats)} target={[0.4, 0.48]} />
                      <StatBar label="RCB" value={getRaiseCBet(heroStats)} target={[0.08, 0.12]} />
                    </div>
                    {/* River / Showdown */}
                    <div className="rounded-lg bg-gray-800/30 p-2">
                      <h4 className="mb-2 text-center text-xs font-semibold text-gray-400">河牌</h4>
                      <StatBar label="WT" value={getWTSD(heroStats)} target={[0.26, 0.3]} />
                      <StatBar label="WSD" value={getWSD(heroStats)} target={[0.5, 0.55]} />
                      <StatBar
                        label="TAF"
                        value={Math.min(getTAF(heroStats) / 5, 1)}
                        target={[0.35, 0.45]}
                        isRatio
                      />
                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="text-gray-500">TAF</span>
                        <span className="font-semibold text-white">
                          {getTAF(heroStats).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Position Stats */}
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-gray-300">各位置盈虧</h3>
                    <div className="grid grid-cols-6 gap-1">
                      {(["BTN", "CO", "HJ", "UTG", "SB", "BB"] as const).map((pos) => {
                        const stats = positionStats?.[pos] ?? {
                          handsPlayed: 0,
                          handsWon: 0,
                          totalProfit: 0,
                        };
                        return (
                          <div key={pos} className="rounded bg-gray-800/30 p-1.5 text-center">
                            <p className="text-xs font-semibold text-gray-400">{pos}</p>
                            <p
                              className={cn(
                                "text-sm font-bold",
                                stats.totalProfit >= 0 ? "text-green-400" : "text-red-400"
                              )}
                            >
                              {stats.totalProfit >= 0 ? "+" : ""}
                              {stats.totalProfit.toFixed(0)}
                            </p>
                            <p className="text-[10px] text-gray-500">{stats.handsPlayed}手</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Adaptation Status */}
                  <div className="rounded-lg border border-purple-500/30 bg-purple-900/30 p-3">
                    <p className="mb-1 text-xs font-semibold text-purple-400">AI 適應狀態</p>
                    <p className="text-sm text-purple-300">
                      {getPlayerVPIP(heroStats) > 0.35
                        ? "你打得較鬆，AI 會增加 3-bet 頻率來對抗"
                        : getPlayerVPIP(heroStats) < 0.15
                          ? "你打得很緊，AI 會增加偷盲頻率"
                          : "你的風格較為平衡，AI 使用標準策略"}
                    </p>
                  </div>

                  {/* AI Opponent Exploit Analysis */}
                  <AIExploitAnalysis stats={aiOpponentStats} minHandsRequired={20} />

                  {/* Learning Path Recommendations */}
                  <LearningPathPanel stats={heroStats} />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hand History Panel Modal */}
      {showHandHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="max-h-[80vh] w-full max-w-lg overflow-auto border-gray-700 bg-gray-900">
            <CardHeader className="sticky top-0 z-10 border-b border-gray-700 bg-gray-900">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white">
                  <FileText className="h-5 w-5" />
                  手牌紀錄
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowHandHistory(false)}>
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <HandHistoryPanel />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================
// Stats Display Helper Components
// ============================================

interface StatRingProps {
  label: string;
  value: number;
  target: [number, number];
  color: "cyan" | "orange" | "yellow" | "red" | "green";
}

function StatRing({ label, value, target, color }: StatRingProps) {
  const percentage = Math.min(value * 100, 100);
  const isInRange = value >= target[0] && value <= target[1];

  const colorMap = {
    cyan: "text-cyan-400",
    orange: "text-orange-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
    green: "text-green-400",
  };

  const bgColorMap = {
    cyan: "stroke-cyan-400",
    orange: "stroke-orange-400",
    yellow: "stroke-yellow-400",
    red: "stroke-red-400",
    green: "stroke-green-400",
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-14 w-14">
        <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15" fill="none" stroke="#374151" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            className={bgColorMap[color]}
            strokeWidth="3"
            strokeDasharray={`${percentage} 100`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("text-sm font-bold", colorMap[color])}>
            {(value * 100).toFixed(0)}%
          </span>
        </div>
      </div>
      <span className="mt-1 text-xs text-gray-400">{label}</span>
      <span className="text-[10px] text-gray-500">
        {(target[0] * 100).toFixed(0)}-{(target[1] * 100).toFixed(0)}%
      </span>
    </div>
  );
}

interface StatBarProps {
  label: string;
  value: number;
  target: [number, number];
  isRatio?: boolean;
}

function StatBar({ label, value, target, isRatio }: StatBarProps) {
  const percentage = Math.min(value * 100, 100);
  const isInRange = value >= target[0] && value <= target[1];
  const isLow = value < target[0];

  // Color based on whether in range
  const barColor = isInRange ? "bg-green-500" : isLow ? "bg-orange-500" : "bg-red-500";

  return (
    <div className="mb-1.5">
      <div className="mb-0.5 flex items-center justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span
          className={cn(
            "font-semibold",
            isInRange ? "text-green-400" : isLow ? "text-orange-400" : "text-red-400"
          )}
        >
          {isRatio ? "" : (value * 100).toFixed(0) + "%"}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-700">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
