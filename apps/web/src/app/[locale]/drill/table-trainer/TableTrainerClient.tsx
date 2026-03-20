"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useLocale } from "next-intl";
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
  getTopImprovementAreas,
  getOverallPerformance,
} from "@/lib/poker/statsFeedback";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, History, RotateCw, BarChart3, FileText, Home } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { HandHistoryPanel } from "@/components/poker/HandHistoryPanel";
import { GTOHintPanel, HintModeSelector } from "@/components/poker/GTOHintPanel";
import { AIExploitAnalysis } from "@/components/poker/AIExploitAnalysis";
import { LearningPathPanel } from "@/components/poker/LearningPathPanel";
import { generateGTOHint, generateGTOHintWithSolver } from "@/lib/poker/gtoHintEngine";

const analyticsCopy = {
  "zh-TW": {
    statsTitle: "玩家統計",
    hands: "手數",
    profit: "盈虧",
    winRate: "勝率",
    collectingData: "收集數據中...",
    collectingDataDescription: (handsRequired: number) => `需要 ${handsRequired} 手才能顯示基礎統計`,
    handsProgress: (current: number, target: number) => `${current} / ${target} 手`,
    playerType: "玩家類型",
    basicPreflopStats: "翻前統計 (基礎)",
    unlockFullAnalysis: "解鎖完整分析",
    unlockFullAnalysisDescription: (remainingHands: number) =>
      `還需 ${remainingHands} 手解鎖翻後統計與改進建議`,
    positionProfit: "各位置盈虧",
    handsSuffix: "手",
    overallPerformance: "整體評估",
    improvementSuggestions: "改進建議",
    targetLabel: "目標",
    fullPreflopStats: "翻前統計",
    flop: "翻牌",
    turn: "轉牌",
    river: "河牌",
    aiAdaptation: "AI 適應狀態",
    aiLoose: "你打得較鬆，AI 會增加 3-bet 頻率來對抗",
    aiTight: "你打得很緊，AI 會增加偷盲頻率",
    aiBalanced: "你的風格較為平衡，AI 使用標準策略",
    winner: "贏家",
    heroReview: "你的行動回顧:",
    potLabel: "底池",
    invested: "投入",
    homeTitle: "回首頁",
    opponentStyleTitle: "AI 對手風格",
    opponentStyles: {
      mixed: "🎲 混合對手",
      "lag-larry": "🔥 LAG 激進",
      "tag-tony": "🦈 TAG 緊凶",
      "passive-pete": "🐟 跟注站",
      "nit-nancy": "🐢 緊被",
      "maniac-mike": "🃏 瘋狂",
    },
    autoRotateOn: "自動輪流位置 (開啟)",
    autoRotateOff: "自動輪流位置 (關閉)",
    rotate: "輪流",
    fixed: "固定",
    handsPlayed: "手數",
    aiAdapting: "AI 適應中",
    statsButton: "統計",
    handHistoryButton: "紀錄",
    handHistoryTitle: "手牌紀錄",
    statsButtonTitle: "玩家統計",
    devModeTitle: "開發者模式：顯示 AI 手牌",
    reset: "重置",
    phaseSetup: "準備中",
    phasePlaying: (street: string) => `進行中 - ${street}`,
    phaseShowdown: "攤牌",
    phaseResult: "結算",
    aiThinking: "AI 思考中...",
    currentAction: "當前行動",
    startGame: "開始遊戲",
    nextHand: "下一手",
    waitingOpponent: "等待對手行動...",
    currentHandInvested: "本手投入",
    actionHistory: "行動歷史",
    noActions: "尚無行動",
    shortcutNextHand: "下一手",
  },
  en: {
    statsTitle: "Player Stats",
    hands: "Hands",
    profit: "Profit",
    winRate: "Win Rate",
    collectingData: "Collecting Data...",
    collectingDataDescription: (handsRequired: number) =>
      `${handsRequired} hands are required before baseline stats unlock`,
    handsProgress: (current: number, target: number) => `${current} / ${target} hands`,
    playerType: "Player Type",
    basicPreflopStats: "Preflop Stats (Basic)",
    unlockFullAnalysis: "Unlock Full Analysis",
    unlockFullAnalysisDescription: (remainingHands: number) =>
      `${remainingHands} more hands to unlock postflop stats and targeted improvement guidance`,
    positionProfit: "Position P/L",
    handsSuffix: "hands",
    overallPerformance: "Overall Performance",
    improvementSuggestions: "Improvement Suggestions",
    targetLabel: "Target",
    fullPreflopStats: "Preflop Stats",
    flop: "Flop",
    turn: "Turn",
    river: "River",
    aiAdaptation: "AI Adaptation",
    aiLoose: "You are playing loose, so the AI is increasing its 3-bet frequency to push back.",
    aiTight: "You are playing very tight, so the AI is stealing more aggressively.",
    aiBalanced: "Your style is relatively balanced, so the AI is sticking to a standard strategy.",
    winner: "Winner",
    heroReview: "Your action review:",
    potLabel: "Pot",
    invested: "Invested",
    homeTitle: "Back Home",
    opponentStyleTitle: "AI Opponent Style",
    opponentStyles: {
      mixed: "🎲 Mixed",
      "lag-larry": "🔥 LAG",
      "tag-tony": "🦈 TAG",
      "passive-pete": "🐟 Calling Station",
      "nit-nancy": "🐢 Nit",
      "maniac-mike": "🃏 Maniac",
    },
    autoRotateOn: "Auto-rotate positions (on)",
    autoRotateOff: "Auto-rotate positions (off)",
    rotate: "Rotate",
    fixed: "Fixed",
    handsPlayed: "Hands",
    aiAdapting: "AI adapting",
    statsButton: "Stats",
    handHistoryButton: "History",
    handHistoryTitle: "Hand History",
    statsButtonTitle: "Player Stats",
    devModeTitle: "Developer mode: reveal AI hole cards",
    reset: "Reset",
    phaseSetup: "Setup",
    phasePlaying: (street: string) => `In Progress - ${street}`,
    phaseShowdown: "Showdown",
    phaseResult: "Results",
    aiThinking: "AI is thinking...",
    currentAction: "Current action",
    startGame: "Start Game",
    nextHand: "Next Hand",
    waitingOpponent: "Waiting for opponent action...",
    currentHandInvested: "Invested this hand",
    actionHistory: "Action History",
    noActions: "No actions yet",
    shortcutNextHand: "Next Hand",
  },
} as const;

export default function TableTrainerClient() {
  const locale = useLocale() === "en" ? "en" : "zh-TW";
  const copy = analyticsCopy[locale];
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
  const [selectedOpponentStyle, setSelectedOpponentStyle] = useState<string>("mixed");
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [showHandHistory, setShowHandHistory] = useState(false);
  const [hintMode, setHintMode] = useState<HintMode>("off");
  const [lastHeroAction, setLastHeroAction] = useState<ActionType | null>(null);
  const [lastHeroHint, setLastHeroHint] = useState<GTOHint | null>(null);
  const [solverHintState, setSolverHintState] = useState<{ key: string; hint: GTOHint | null }>({
    key: "",
    hint: null,
  });
  const handRecorded = useRef(false);

  // Progress tracking
  const { recordTableTrainerHand } = useProgressStore();
  const { user } = useAuthStore();
  const overallPerformance = getOverallPerformance(heroStats);
  const topImprovementAreas = getTopImprovementAreas(heroStats, 3);
  const heroIndex = players.findIndex((p) => p.isHero);
  const hero = heroIndex >= 0 ? players[heroIndex] : undefined;
  const activePlayer = players[activePlayerIndex];
  const isHeroTurn = activePlayer?.isHero && phase === "playing";
  const getPlayerDisplayName = (player: { name: string; nameZh?: string }) =>
    locale === "en" ? player.name : player.nameZh || player.name;
  const getHandEvaluationDescription = (playerId: string) => {
    const evaluation = handEvaluations?.get(playerId);
    if (!evaluation) return null;
    return locale === "en"
      ? evaluation.description || evaluation.descriptionZh
      : evaluation.descriptionZh || evaluation.description;
  };

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

  const hintContext = useMemo(() => {
    if (hintMode === "off" || phase !== "playing" || !hero || !hero.holeCards || !activePlayer?.isHero) {
      return null;
    }

    const dealerIndex = players.findIndex((player) => player.isDealer);
    const activePlayers = players.filter((player) => player.isActive && !player.isFolded && !player.isAllIn);
    const heroSeatIndex = hero.seatIndex;
    const isInPosition = activePlayers.every(
      (player) =>
        player.seatIndex === heroSeatIndex ||
        (player.seatIndex - dealerIndex + 6) % 6 < (heroSeatIndex - dealerIndex + 6) % 6
    );

    const preflopActions = actionHistory.filter((action) => action.street === "preflop");
    const preflopRaiser = preflopActions
      .filter((action) => action.action === "raise" || action.action === "bet")
      .pop();
    const isPreflopAggressor = preflopRaiser?.isHero ?? false;

    return {
      holeCards: hero.holeCards,
      communityCards,
      position: hero.position,
      street: currentStreet,
      pot,
      currentBet,
      playerBet: hero.currentBet,
      stack: hero.stack,
      isInPosition,
      facingBet: currentBet > hero.currentBet,
      isPreflopAggressor,
    };
  }, [hintMode, phase, hero, activePlayer, players, actionHistory, communityCards, currentStreet, pot, currentBet]);

  const hintContextKey = useMemo(() => {
    if (!hintContext) return "";

    return JSON.stringify({
      ...hintContext,
      holeCards: hintContext.holeCards.map((card) => `${card.rank}${card.suit}`),
      communityCards: hintContext.communityCards.map((card) => `${card.rank}${card.suit}`),
    });
  }, [hintContext]);

  const currentTurnHint = useMemo(() => {
    if (!hintContext) return null;
    return generateGTOHint(hintContext);
  }, [hintContext]);

  useEffect(() => {
    if (
      !hintContext ||
      !hintContextKey ||
      hintContext.street === "preflop" ||
      hintContext.communityCards.length < 3
    ) {
      return;
    }

    let isCancelled = false;
    const requestKey = hintContextKey;

    generateGTOHintWithSolver(hintContext)
      .then((solverHint) => {
        if (isCancelled) return;
        setSolverHintState({
          key: requestKey,
          hint: solverHint.reasoning.solverData ? solverHint : null,
        });
      })
      .catch(() => {
        if (isCancelled) return;
        setSolverHintState((current) =>
          current.key === requestKey ? current : { key: requestKey, hint: null }
        );
      });

    return () => {
      isCancelled = true;
    };
  }, [hintContext, hintContextKey]);

  const activeHint = useMemo(() => {
    if (!currentTurnHint) return null;
    return solverHintState.key === hintContextKey && solverHintState.hint
      ? solverHintState.hint
      : currentTurnHint;
  }, [currentTurnHint, solverHintState, hintContextKey]);

  const hasHeroActionThisHand = phase === "playing" && actionHistory.some((action) => action.isHero);
  const displayedLastHeroAction = hasHeroActionThisHand ? lastHeroAction : null;
  const displayedHint = hintMode === "after" ? (hasHeroActionThisHand ? lastHeroHint : null) : activeHint;

  // Wrap handleAction to track last hero action
  const handleActionWithTracking = (action: ActionType, amount?: number) => {
    const activePlayer = players[activePlayerIndex];
    if (activePlayer?.isHero) {
      setLastHeroAction(action);
      setLastHeroHint(activeHint);
    }
    handleAction(action, amount);
  };

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
              title={copy.homeTitle}
            >
              <Home className="h-5 w-5" />
            </Link>
            <h1 className="sr-only">GTO Table Trainer</h1>
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
              title={copy.opponentStyleTitle}
            >
              <option value="mixed">{copy.opponentStyles.mixed}</option>
              <option value="gto-bot">🤖 GTO Bot</option>
              <option value="lag-larry">{copy.opponentStyles["lag-larry"]}</option>
              <option value="tag-tony">{copy.opponentStyles["tag-tony"]}</option>
              <option value="passive-pete">{copy.opponentStyles["passive-pete"]}</option>
              <option value="nit-nancy">{copy.opponentStyles["nit-nancy"]}</option>
              <option value="maniac-mike">{copy.opponentStyles["maniac-mike"]}</option>
            </select>

            {/* Auto Rotate Toggle */}
            <Button
              variant={autoRotate ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRotate(!autoRotate)}
              className={cn("gap-1.5", autoRotate && "bg-blue-600 hover:bg-blue-500")}
              title={autoRotate ? copy.autoRotateOn : copy.autoRotateOff}
            >
              <RotateCw
                className={cn("h-4 w-4", autoRotate && "animate-spin")}
                style={{ animationDuration: "3s" }}
              />
              <span className="hidden sm:inline">{autoRotate ? copy.rotate : copy.fixed}</span>
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
                    {pos} - {locale === "en" ? POSITION_LABELS[pos].en : POSITION_LABELS[pos].zh}
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
                {locale === "en" ? trainingMode.scenario.name : trainingMode.scenario.nameZh}
              </Badge>
            )}

            {/* Session Stats */}
            <div className="hidden items-center gap-3 text-sm sm:flex">
              <span className="text-gray-400">
                {copy.handsPlayed}: <span className="text-white">{sessionStats.handsPlayed}</span>
              </span>
              <span className="text-gray-400">
                {copy.winRate}:{" "}
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
                {copy.aiAdapting}: VPIP {(getPlayerVPIP(heroStats) * 100).toFixed(0)}% / PFR{" "}
                {(getPlayerPFR(heroStats) * 100).toFixed(0)}%
              </div>
            )}

            {/* Stats Panel Toggle */}
            <Button
              variant={showStatsPanel ? "default" : "outline"}
              size="sm"
              onClick={() => setShowStatsPanel(!showStatsPanel)}
              className={cn("gap-1.5", showStatsPanel && "bg-cyan-600 hover:bg-cyan-500")}
              title={copy.statsButtonTitle}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">{copy.statsButton}</span>
            </Button>

            {/* GTO Hint Mode Selector */}
            <HintModeSelector mode={hintMode} onChange={setHintMode} className="flex" />

            {/* Hand History Toggle */}
            <Button
              variant={showHandHistory ? "default" : "outline"}
              size="sm"
              onClick={() => setShowHandHistory(!showHandHistory)}
              className={cn("gap-1.5", showHandHistory && "bg-amber-600 hover:bg-amber-500")}
              title={copy.handHistoryTitle}
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">{copy.handHistoryButton}</span>
            </Button>

            {/* Dev Mode Toggle */}
            <Button
              variant={devMode ? "default" : "outline"}
              size="sm"
              onClick={() => setDevMode(!devMode)}
              className={cn(devMode && "bg-purple-600 hover:bg-purple-500")}
              title={copy.devModeTitle}
            >
              {devMode ? "🔓 Dev" : "🔒 Dev"}
            </Button>

            {/* Reset Button */}
            <Button variant="outline" size="sm" onClick={resetSession}>
              {copy.reset}
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
                  {phase === "setup" && copy.phaseSetup}
                  {phase === "playing" && copy.phasePlaying(currentStreet.toUpperCase())}
                  {phase === "showdown" && copy.phaseShowdown}
                  {phase === "result" && copy.phaseResult}
                </Badge>

                {aiThinking && <span className="animate-pulse text-sm text-gray-400">{copy.aiThinking}</span>}
              </div>

              {activePlayer && phase === "playing" && (
                <div className="text-sm">
                  <span className="text-gray-400">{copy.currentAction}: </span>
                  <span
                    className={activePlayer.isHero ? "font-semibold text-yellow-400" : "text-white"}
                  >
                    {getPlayerDisplayName(activePlayer)} ({activePlayer.position})
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
                    {phase === "setup" ? copy.startGame : copy.nextHand}
                  </Button>
                </div>
              )}

              {/* Winner Display */}
              {winners && winners.length > 0 && (
                <div className="space-y-1 py-2 text-center">
                  <p className="text-sm">
                    <span className="text-gray-400">{copy.winner}: </span>
                    <span
                      className={
                        winners[0].isHero ? "font-bold text-yellow-400" : "font-semibold text-white"
                      }
                    >
                      {winners.map((w) => `${getPlayerDisplayName(w)} (${w.position})`).join(", ")}
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
                      {getHandEvaluationDescription(winners[0].id)}
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
                      {copy.invested}:{" "}
                      <span className="text-orange-400">{hero.totalInvested.toFixed(1)}</span>
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
                {(hintMode === "before" || hintMode === "detailed") && isHeroTurn && displayedHint && (
                  <GTOHintPanel hint={displayedHint} mode={hintMode} className="mt-3" />
                )}
                {hintMode === "after" && displayedLastHeroAction && displayedHint && (
                  <GTOHintPanel
                    hint={displayedHint}
                    mode={hintMode}
                    lastAction={displayedLastHeroAction}
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
                      {phase === "setup" ? copy.startGame : copy.nextHand}
                    </Button>
                  </div>
                )}

                {/* Winner Display + Hand Review */}
                {winners && winners.length > 0 && (
                  <div className="mb-4 space-y-3">
                    {/* Winner Info */}
                    <div className="space-y-1 py-2 text-center">
                      <p className="text-lg">
                        <span className="text-gray-400">{copy.winner}: </span>
                        <span
                          className={
                            winners[0].isHero
                              ? "font-bold text-yellow-400"
                              : "font-semibold text-white"
                          }
                        >
                          {winners
                            .map((w) => `${getPlayerDisplayName(w)} (${w.position})`)
                            .join(", ")}
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
                              : `${copy.potLabel} ${lastWonPot.toFixed(1)} BB`}
                        </p>
                      )}
                      {handEvaluations && handEvaluations.size > 0 && winners[0] && (
                        <p className="text-sm text-green-400">
                          {getHandEvaluationDescription(winners[0].id)}
                        </p>
                      )}
                    </div>

                    {/* Hand Review - Hero's Actions */}
                    {actionHistory.filter((a) => a.isHero).length > 0 && (
                      <div className="rounded-lg bg-gray-800/50 p-3">
                        <p className="mb-2 text-xs text-gray-400">{copy.heroReview}</p>
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
                {(hintMode === "before" || hintMode === "detailed") && isHeroTurn && displayedHint && (
                  <GTOHintPanel hint={displayedHint} mode={hintMode} className="mt-3" />
                )}
                {hintMode === "after" && displayedLastHeroAction && displayedHint && (
                  <GTOHintPanel
                    hint={displayedHint}
                    mode={hintMode}
                    lastAction={displayedLastHeroAction}
                    className="mt-3"
                  />
                )}

                {/* Waiting indicator */}
                {phase === "playing" && !isHeroTurn && (
                  <div className="flex flex-1 items-center justify-center">
                    <p className="text-center text-gray-400">
                      {aiThinking ? copy.aiThinking : copy.waitingOpponent}
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
                        {copy.currentHandInvested}: {hero.totalInvested.toFixed(1)} BB
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
              <span>{copy.actionHistory}</span>
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
                    <span className="shrink-0 text-xs text-gray-400">{copy.actionHistory}:</span>
                    <div className="flex flex-1 items-center gap-2 overflow-x-auto">
                      {actionHistory.length === 0 ? (
                        <span className="text-xs text-gray-500">{copy.noActions}</span>
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
                        <kbd className="rounded bg-gray-700 px-1">Space</kbd> {copy.shortcutNextHand}
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
                      <p className="text-xs text-gray-500">{copy.noActions}</p>
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
                  {copy.statsTitle}
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
                  <p className="text-xs text-gray-400">{copy.hands}</p>
                  <p className="text-lg font-bold text-white">{heroStats.handsPlayed}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">{copy.profit}</p>
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
                  <p className="text-xs text-gray-400">{copy.winRate}</p>
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
                  <p className="text-lg font-semibold text-gray-300">{copy.collectingData}</p>
                  <p className="text-sm text-gray-500">
                    {copy.collectingDataDescription(STATS_THRESHOLDS.BASIC)}
                  </p>
                  <div className="mx-auto max-w-xs space-y-2">
                    <Progress
                      value={(heroStats.handsPlayed / STATS_THRESHOLDS.BASIC) * 100}
                      className="h-2"
                    />
                    <p className="text-xs text-gray-500">
                      {copy.handsProgress(heroStats.handsPlayed, STATS_THRESHOLDS.BASIC)}
                    </p>
                  </div>
                </div>
              ) : heroStats.handsPlayed < STATS_THRESHOLDS.FULL ? (
                /* 階段 2: 基礎統計 (30-99 手) */
                <>
                  {/* Player Type */}
                  <div className="rounded-lg bg-gray-800/30 p-3 text-center">
                    <p className="mb-1 text-xs text-gray-400">{copy.playerType}</p>
                    <p className="text-xl font-bold text-yellow-400">{getPlayerType(heroStats)}</p>
                  </div>

                  {/* Basic Preflop Stats */}
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-gray-300">{copy.basicPreflopStats}</h3>
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
                    <p className="text-xs font-semibold text-blue-400">{copy.unlockFullAnalysis}</p>
                    <Progress
                      value={
                        ((heroStats.handsPlayed - STATS_THRESHOLDS.BASIC) /
                          (STATS_THRESHOLDS.FULL - STATS_THRESHOLDS.BASIC)) *
                        100
                      }
                      className="h-2"
                    />
                    <p className="text-xs text-gray-500">
                      {copy.unlockFullAnalysisDescription(STATS_THRESHOLDS.FULL - heroStats.handsPlayed)}
                    </p>
                  </div>

                  {/* Position Stats - Basic */}
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-gray-300">{copy.positionProfit}</h3>
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
                            <p className="text-[10px] text-gray-500">
                              {stats.handsPlayed} {copy.handsSuffix}
                            </p>
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
                      <p className="text-xs text-gray-400">{copy.playerType}</p>
                      <p className="text-xl font-bold text-yellow-400">
                        {getPlayerType(heroStats)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">{copy.overallPerformance}</p>
                      <p
                        className={cn(
                          "text-lg font-bold",
                          overallPerformance.level === "excellent" && "text-green-400",
                          overallPerformance.level === "good" && "text-blue-400",
                          overallPerformance.level === "needs_work" && "text-yellow-400",
                          overallPerformance.level === "poor" && "text-red-400"
                        )}
                      >
                        {locale === "en" ? overallPerformance.levelLabel : overallPerformance.levelZh}
                      </p>
                    </div>
                  </div>

                  {/* Improvement Suggestions */}
                  {topImprovementAreas.length > 0 && (
                    <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-900/20 p-3">
                      <p className="flex items-center gap-1 text-xs font-semibold text-amber-400">
                        💡 {copy.improvementSuggestions}
                      </p>
                      <div className="space-y-2">
                        {topImprovementAreas.map((item, idx) => (
                          <div key={idx} className="text-sm">
                            <p className="text-amber-200">
                              <span className="font-semibold">
                                {locale === "en" ? item.stat : item.statZh}
                              </span>
                              <span className="ml-2 text-gray-400">
                                {(item.value * 100).toFixed(0)}% ({copy.targetLabel}{" "}
                                {(item.target[0] * 100).toFixed(0)}-
                                {(item.target[1] * 100).toFixed(0)}%)
                              </span>
                            </p>
                            <p className="mt-0.5 text-xs text-gray-400">
                              {locale === "en" ? item.suggestion : item.suggestionZh}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full Preflop Stats */}
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-gray-300">{copy.fullPreflopStats}</h3>
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
                      <h4 className="mb-2 text-center text-xs font-semibold text-gray-400">{copy.flop}</h4>
                      <StatBar label="CB" value={getFlopCBet(heroStats)} target={[0.5, 0.6]} />
                      <StatBar label="FCB" value={getFoldToCBet(heroStats)} target={[0.38, 0.45]} />
                      <StatBar label="CCB" value={getCallCBet(heroStats)} target={[0.4, 0.5]} />
                      <StatBar label="RCB" value={getRaiseCBet(heroStats)} target={[0.1, 0.15]} />
                    </div>
                    {/* Turn */}
                    <div className="rounded-lg bg-gray-800/30 p-2">
                      <h4 className="mb-2 text-center text-xs font-semibold text-gray-400">{copy.turn}</h4>
                      <StatBar label="CB" value={getTurnCBet(heroStats)} target={[0.45, 0.52]} />
                      <StatBar label="FCB" value={getFoldToCBet(heroStats)} target={[0.4, 0.48]} />
                      <StatBar label="CCB" value={getCallCBet(heroStats)} target={[0.4, 0.48]} />
                      <StatBar label="RCB" value={getRaiseCBet(heroStats)} target={[0.08, 0.12]} />
                    </div>
                    {/* River / Showdown */}
                    <div className="rounded-lg bg-gray-800/30 p-2">
                      <h4 className="mb-2 text-center text-xs font-semibold text-gray-400">{copy.river}</h4>
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
                    <h3 className="mb-2 text-sm font-semibold text-gray-300">{copy.positionProfit}</h3>
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
                            <p className="text-[10px] text-gray-500">
                              {stats.handsPlayed} {copy.handsSuffix}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Adaptation Status */}
                  <div className="rounded-lg border border-purple-500/30 bg-purple-900/30 p-3">
                    <p className="mb-1 text-xs font-semibold text-purple-400">{copy.aiAdaptation}</p>
                    <p className="text-sm text-purple-300">
                      {getPlayerVPIP(heroStats) > 0.35
                        ? copy.aiLoose
                        : getPlayerVPIP(heroStats) < 0.15
                          ? copy.aiTight
                          : copy.aiBalanced}
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
                  {copy.handHistoryTitle}
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
