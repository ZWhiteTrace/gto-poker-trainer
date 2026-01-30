"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Trophy,
  Play,
  ArrowLeft,
  ArrowRight,
  Flag,
  RefreshCw,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useProgressStore } from "@/stores/progressStore";
import { createClient } from "@/lib/supabase/client";
import {
  getArticleRecommendations,
  analyzeWeakAreas,
  type ArticleRecommendation,
} from "@/lib/quiz/articleRecommendations";

// Question types for the exam
type QuestionType = "logic" | "equity" | "position" | "push_fold";

interface ExamQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options: { key: string; text: string }[];
  correctAnswer: string;
  explanation: string;
}

// Sample questions from different categories
const EXAM_QUESTIONS: ExamQuestion[] = [
  // Logic Questions
  {
    id: "l1",
    type: "logic",
    question: "為什麼 BTN 的開牌範圍比 UTG 寬？",
    options: [
      { key: "a", text: "BTN 後面只有兩個位置要行動，被 3bet 的機率較低" },
      { key: "b", text: "BTN 可以看到更多牌" },
      { key: "c", text: "BTN 的籌碼更多" },
      { key: "d", text: "BTN 是最後一個行動" },
    ],
    correctAnswer: "a",
    explanation: "位置越靠後，後面要行動的人越少，被加注的機率越低。",
  },
  {
    id: "l2",
    type: "logic",
    question: "什麼是 Minimum Defense Frequency (MDF)？",
    options: [
      { key: "a", text: "面對下注時需要繼續的最低頻率，防止對手有利可圖地詐唬" },
      { key: "b", text: "最少的防守手牌數量" },
      { key: "c", text: "防守盲注的頻率" },
      { key: "d", text: "棄牌的頻率" },
    ],
    correctAnswer: "a",
    explanation: "MDF = 1 - (Bet / (Pot + Bet))。面對底池大小的下注，MDF = 50%。",
  },
  {
    id: "l3",
    type: "logic",
    question: "為什麼在乾燥 A 高牌面適合使用小注高頻 C-bet？",
    options: [
      { key: "a", text: "因為你有範圍優勢，小注即可達成目標" },
      { key: "b", text: "因為對手會棄牌" },
      { key: "c", text: "因為籌碼不夠" },
      { key: "d", text: "因為想要詐唬" },
    ],
    correctAnswer: "a",
    explanation: "乾燥 A 高牌面對開牌者非常有利，小注可以有效施壓。",
  },
  // Equity Questions
  {
    id: "e1",
    type: "equity",
    question: "AA vs KK 全押時，AA 的勝率大約是多少？",
    options: [
      { key: "a", text: "65%" },
      { key: "b", text: "72%" },
      { key: "c", text: "82%" },
      { key: "d", text: "90%" },
    ],
    correctAnswer: "c",
    explanation: "高對子 vs 低對子約 82% vs 18%，這是經典的 cooler 場景。",
  },
  {
    id: "e2",
    type: "equity",
    question: "AKs vs QQ 全押時，大約是多少比例？",
    options: [
      { key: "a", text: "45% vs 55%" },
      { key: "b", text: "50% vs 50%" },
      { key: "c", text: "55% vs 45%" },
      { key: "d", text: "40% vs 60%" },
    ],
    correctAnswer: "a",
    explanation: "AK vs 對子是經典翻硬幣，對子略佔優勢約 55%。",
  },
  {
    id: "e3",
    type: "equity",
    question: "同花聽牌在翻牌時大約有多少 outs？",
    options: [
      { key: "a", text: "4 outs" },
      { key: "b", text: "8 outs" },
      { key: "c", text: "9 outs" },
      { key: "d", text: "12 outs" },
    ],
    correctAnswer: "c",
    explanation: "同花聽牌 = 13張同花 - 4張已見 = 9 outs。",
  },
  // Position Questions
  {
    id: "p1",
    type: "position",
    question: "在 6-max 中，哪個位置的 RFI 範圍最寬？",
    options: [
      { key: "a", text: "UTG" },
      { key: "b", text: "HJ" },
      { key: "c", text: "BTN" },
      { key: "d", text: "SB" },
    ],
    correctAnswer: "c",
    explanation: "BTN 位置最好，只需要通過 SB 和 BB，所以範圍最寬。",
  },
  {
    id: "p2",
    type: "position",
    question: "為什麼 BB 面對 BTN 的開牌應該寬防守？",
    options: [
      { key: "a", text: "因為 BB 已經投入盲注，底池賠率有利" },
      { key: "b", text: "因為 BB 的牌力更強" },
      { key: "c", text: "因為 BTN 一定在詐唬" },
      { key: "d", text: "因為 BB 想看翻牌" },
    ],
    correctAnswer: "a",
    explanation: "BB 已投入 1BB，面對 2.5BB 加注只需再投 1.5BB，底池賠率使寬防守有利可圖。",
  },
  {
    id: "p3",
    type: "position",
    question: "UTG 的標準 RFI 範圍大約是多少？",
    options: [
      { key: "a", text: "約 8-10%" },
      { key: "b", text: "約 12-15%" },
      { key: "c", text: "約 20-25%" },
      { key: "d", text: "約 30-35%" },
    ],
    correctAnswer: "b",
    explanation: "UTG 是最早位置，範圍最緊，通常約 12-15%。",
  },
  // Push/Fold Questions
  {
    id: "pf1",
    type: "push_fold",
    question: "在 10bb 時，BTN 面對前面全部棄牌，A2o 應該？",
    options: [
      { key: "a", text: "棄牌" },
      { key: "b", text: "加注" },
      { key: "c", text: "全下" },
      { key: "d", text: "跛入" },
    ],
    correctAnswer: "c",
    explanation: "10bb BTN 的 push 範圍很寬，A2o 有阻擋效應且能贏翻牌，應該全下。",
  },
  {
    id: "pf2",
    type: "push_fold",
    question: "BB 面對 SB 在 8bb 有效籌碼時全下，87s 應該？",
    options: [
      { key: "a", text: "棄牌 - 勝率不夠" },
      { key: "b", text: "跟注 - 底池賠率有利且有 playability" },
      { key: "c", text: "取決於對手" },
      { key: "d", text: "加注" },
    ],
    correctAnswer: "b",
    explanation: "BB vs SB 全下，底池賠率約 2:1，87s 有足夠 equity 跟注。",
  },
  {
    id: "pf3",
    type: "push_fold",
    question: "5bb 時，SB 面對前面全部棄牌，什麼範圍應該全下？",
    options: [
      { key: "a", text: "只有超強牌 (TT+/AQ+)" },
      { key: "b", text: "約 40% 手牌" },
      { key: "c", text: "約 60-70% 手牌" },
      { key: "d", text: "任何兩張牌" },
    ],
    correctAnswer: "c",
    explanation: "5bb 很短，SB 對 BB 有位置優勢，應該用很寬的範圍（約 60-70%）全下。",
  },
  // More Logic
  {
    id: "l4",
    type: "logic",
    question: "為什麼在泡沫期應該收緊範圍？",
    options: [
      { key: "a", text: "因為出局的代價大於加倍籌碼的收益 (ICM 壓力)" },
      { key: "b", text: "因為對手會更激進" },
      { key: "c", text: "因為牌會變差" },
      { key: "d", text: "因為想要生存" },
    ],
    correctAnswer: "a",
    explanation: "ICM 的核心是籌碼價值非線性，泡沫期出局意味著失去所有已累積的獎金期望值。",
  },
  {
    id: "l5",
    type: "logic",
    question: "為什麼 GTO 需要在河牌有一定的詐唬頻率？",
    options: [
      { key: "a", text: "為了讓對手的 bluff-catch 手牌變成零 EV" },
      { key: "b", text: "因為詐唬很刺激" },
      { key: "c", text: "因為有時候沒有好牌" },
      { key: "d", text: "為了贏更多" },
    ],
    correctAnswer: "a",
    explanation: "GTO 要求足夠的詐唬頻率使對手無法有利可圖地過度跟注或過度棄牌。",
  },
  // C-bet Questions
  {
    id: "cb1",
    type: "logic",
    question: "在乾燥 K72r 牌面，IP 玩家作為翻前加注者應該使用什麼 C-bet 策略？",
    options: [
      { key: "a", text: "高頻小注（25-33% pot）" },
      { key: "b", text: "低頻大注（75% pot）" },
      { key: "c", text: "混合大小注" },
      { key: "d", text: "總是 check" },
    ],
    correctAnswer: "a",
    explanation: "乾燥高牌面對開牌者非常有利，小注高頻可以有效利用範圍優勢。",
  },
  {
    id: "cb2",
    type: "logic",
    question: "為什麼在 JT9 連接牌面應該降低 C-bet 頻率？",
    options: [
      { key: "a", text: "這種牌面對跟注者範圍有利，開牌者沒有明顯範圍優勢" },
      { key: "b", text: "因為對手可能有順子" },
      { key: "c", text: "因為籌碼不夠" },
      { key: "d", text: "因為翻牌太危險" },
    ],
    correctAnswer: "a",
    explanation: "中間連接牌面對 BB 防守範圍非常有利（很多兩對、順子、聽牌），開牌者應該更謹慎。",
  },
  {
    id: "cb3",
    type: "logic",
    question: "OOP 玩家在翻牌的 C-bet 策略應該和 IP 有什麼不同？",
    options: [
      { key: "a", text: "OOP 應該使用更極化的策略（要嘛 check 要嘛大注）" },
      { key: "b", text: "OOP 應該總是 check" },
      { key: "c", text: "OOP 和 IP 策略完全一樣" },
      { key: "d", text: "OOP 應該總是下注" },
    ],
    correctAnswer: "a",
    explanation: "OOP 沒有位置優勢，使用極化策略可以彌補這個劣勢，避免被 float 利用。",
  },
  // Defense Questions
  {
    id: "df1",
    type: "logic",
    question: "面對 1/3 pot 的下注，MDF (Minimum Defense Frequency) 大約是多少？",
    options: [
      { key: "a", text: "50%" },
      { key: "b", text: "67%" },
      { key: "c", text: "75%" },
      { key: "d", text: "80%" },
    ],
    correctAnswer: "c",
    explanation: "MDF = 1 - bet/(pot+bet) = 1 - 1/4 = 75%。小注需要更寬的防守。",
  },
  {
    id: "df2",
    type: "logic",
    question: "為什麼面對大注（如 pot size bet）可以棄牌更多？",
    options: [
      { key: "a", text: "因為 MDF 較低（約 50%），且大注代表更強的範圍" },
      { key: "b", text: "因為害怕輸大鍋" },
      { key: "c", text: "因為沒有好牌" },
      { key: "d", text: "因為對手在詐唬" },
    ],
    correctAnswer: "a",
    explanation: "大注的 MDF 只有約 50%，而且對手通常會用更強的範圍下大注。",
  },
  {
    id: "df3",
    type: "logic",
    question: "在 BB 面對 BTN 的開牌，應該傾向哪種防守方式？",
    options: [
      { key: "a", text: "多 call 少 3-bet，因為底池賠率好且 BTN 範圍寬" },
      { key: "b", text: "總是 3-bet" },
      { key: "c", text: "總是 fold" },
      { key: "d", text: "對半分" },
    ],
    correctAnswer: "a",
    explanation: "BB 已投入 1BB，底池賠率有利，加上 BTN 範圍寬，適合用更多跟注防守。",
  },
  // EV Questions
  {
    id: "ev1",
    type: "equity",
    question: "你有 60% 勝率，底池 100，對手全下 50，跟注的 EV 是多少？",
    options: [
      { key: "a", text: "+20" },
      { key: "b", text: "+40" },
      { key: "c", text: "+50" },
      { key: "d", text: "+60" },
    ],
    correctAnswer: "a",
    explanation: "EV = 0.6 × (100+50) - 0.4 × 50 = 90 - 20 = 70。投入 50，淨 EV = +20。",
  },
  {
    id: "ev2",
    type: "equity",
    question: "河牌底池 100，對手下注 50，你需要多少 equity 才能跟注？",
    options: [
      { key: "a", text: "25%" },
      { key: "b", text: "33%" },
      { key: "c", text: "40%" },
      { key: "d", text: "50%" },
    ],
    correctAnswer: "b",
    explanation: "需要投入 50 爭取 150 底池，需要 50/150 = 33% equity 才能打平。",
  },
  // More Equity
  {
    id: "e4",
    type: "equity",
    question: "翻牌雙頭順聽（OESD）有多少 outs？",
    options: [
      { key: "a", text: "4 outs" },
      { key: "b", text: "6 outs" },
      { key: "c", text: "8 outs" },
      { key: "d", text: "10 outs" },
    ],
    correctAnswer: "c",
    explanation: "雙頭順聽有 8 張牌可以完成順子（兩端各 4 張）。",
  },
  {
    id: "e5",
    type: "equity",
    question: "同花順聽（15 outs）從翻牌到河牌大約有多少機率完成？",
    options: [
      { key: "a", text: "約 35%" },
      { key: "b", text: "約 45%" },
      { key: "c", text: "約 55%" },
      { key: "d", text: "約 65%" },
    ],
    correctAnswer: "c",
    explanation: "15 outs × 4 ≈ 60%，實際約 54%（兩條街的複合計算）。",
  },
  {
    id: "e6",
    type: "equity",
    question: "在翻牌時，set 對上同花聽牌大約是多少比例？",
    options: [
      { key: "a", text: "65% vs 35%" },
      { key: "b", text: "70% vs 30%" },
      { key: "c", text: "75% vs 25%" },
      { key: "d", text: "80% vs 20%" },
    ],
    correctAnswer: "a",
    explanation: "Set 約 65% vs 同花聽牌 35%。如果聽牌有額外 outs（如 backdoor straight），比例會更接近。",
  },
  // Exploit Questions
  {
    id: "ex1",
    type: "logic",
    question: "面對一個棄牌率過高的對手，應該如何調整？",
    options: [
      { key: "a", text: "增加詐唬頻率" },
      { key: "b", text: "減少詐唬頻率" },
      { key: "c", text: "只打價值牌" },
      { key: "d", text: "不做調整" },
    ],
    correctAnswer: "a",
    explanation: "對手棄牌太多時，增加詐唬是最直接的剝削方式，因為詐唬會更頻繁成功。",
  },
  {
    id: "ex2",
    type: "logic",
    question: "面對一個跟注站（calling station），應該如何調整？",
    options: [
      { key: "a", text: "減少詐唬，增加價值下注" },
      { key: "b", text: "增加詐唬" },
      { key: "c", text: "打得更激進" },
      { key: "d", text: "放棄邊緣價值" },
    ],
    correctAnswer: "a",
    explanation: "跟注站不會棄牌，所以詐唬無效。應該用更多中等牌做價值下注。",
  },
  {
    id: "ex3",
    type: "logic",
    question: "面對一個激進玩家（maniac），最好的策略是？",
    options: [
      { key: "a", text: "讓他先行動，用強牌 trap" },
      { key: "b", text: "和他對攻" },
      { key: "c", text: "避開他" },
      { key: "d", text: "4-bet bluff 更多" },
    ],
    correctAnswer: "a",
    explanation: "對付激進玩家，最好的方式是讓他自己詐唬，然後用強牌 trap 他。",
  },
  // More Position
  {
    id: "p4",
    type: "position",
    question: "為什麼 CO vs BTN 的 3-bet 範圍比 CO vs UTG 寬？",
    options: [
      { key: "a", text: "因為 BTN 的開牌範圍更寬，所以可以用更寬的範圍 3-bet" },
      { key: "b", text: "因為 CO 比較強" },
      { key: "c", text: "因為位置比較好" },
      { key: "d", text: "因為籌碼比較多" },
    ],
    correctAnswer: "a",
    explanation: "對手範圍越寬，你的 3-bet bluff range 就可以越寬，因為對手棄牌率更高。",
  },
  {
    id: "p5",
    type: "position",
    question: "在 SB vs BB 單挑時，為什麼 SB 應該使用 limp-only 或 raise-only 策略？",
    options: [
      { key: "a", text: "混合策略會讓範圍更容易被識別，簡化策略更有效率" },
      { key: "b", text: "因為籌碼不夠" },
      { key: "c", text: "因為 BB 很強" },
      { key: "d", text: "因為想看便宜的翻牌" },
    ],
    correctAnswer: "a",
    explanation: "現代 GTO 研究顯示，SB vs BB 使用簡化策略（全部 limp 或全部 raise）已經非常接近最優。",
  },
  // More Push/Fold
  {
    id: "pf4",
    type: "push_fold",
    question: "15bb 時，UTG 的 open raise 策略應該是？",
    options: [
      { key: "a", text: "使用標準 open raise，但範圍收緊" },
      { key: "b", text: "全部全下" },
      { key: "c", text: "全部 limp" },
      { key: "d", text: "只打 premium" },
    ],
    correctAnswer: "a",
    explanation: "15bb 仍有足夠籌碼使用標準加注，但應該選擇更強的手牌。",
  },
  {
    id: "pf5",
    type: "push_fold",
    question: "什麼籌碼深度開始考慮 push-fold 策略？",
    options: [
      { key: "a", text: "10bb 以下" },
      { key: "b", text: "15bb 以下" },
      { key: "c", text: "20bb 以下" },
      { key: "d", text: "25bb 以下" },
    ],
    correctAnswer: "a",
    explanation: "當籌碼低於 10bb，standard raise 後如果被 3-bet 會很尷尬，全下通常是更好的選擇。",
  },
  {
    id: "pf6",
    type: "push_fold",
    question: "CO 10bb 全下，BB 25bb，BB 應該用什麼範圍 call？",
    options: [
      { key: "a", text: "約 top 25% 手牌" },
      { key: "b", text: "約 top 15% 手牌" },
      { key: "c", text: "約 top 10% 手牌" },
      { key: "d", text: "只有 premium" },
    ],
    correctAnswer: "a",
    explanation: "面對 CO 的寬 push 範圍，BB 有好的底池賠率，應該用約 25% 範圍 call。",
  },
  // Advanced Logic
  {
    id: "l6",
    type: "logic",
    question: "什麼是阻擋牌效應？",
    options: [
      { key: "a", text: "你的手牌減少了對手持有某些組合的可能性" },
      { key: "b", text: "阻止對手下注" },
      { key: "c", text: "阻擋對手的詐唬" },
      { key: "d", text: "用大注阻擋對手" },
    ],
    correctAnswer: "a",
    explanation: "例如持有 A♠ 減少了對手有同花 A 或 AA 的組合數。",
  },
  {
    id: "l7",
    type: "logic",
    question: "為什麼 suited 手牌比 offsuit 更有價值？",
    options: [
      { key: "a", text: "可以做同花，且有後門同花 equity" },
      { key: "b", text: "看起來更好看" },
      { key: "c", text: "對手不知道是 suited" },
      { key: "d", text: "發牌機率更高" },
    ],
    correctAnswer: "a",
    explanation: "Suited 手牌有約 3% 額外的同花 equity，加上隱蔽性和後門 equity。",
  },
  {
    id: "l8",
    type: "logic",
    question: "為什麼在多人底池應該收緊範圍？",
    options: [
      { key: "a", text: "因為至少有一人有強牌的機率大增，邊緣牌勝率下降" },
      { key: "b", text: "因為底池太大" },
      { key: "c", text: "因為對手太多" },
      { key: "d", text: "因為位置不好" },
    ],
    correctAnswer: "a",
    explanation: "3-way 或更多人時，「至少有人有強牌」的機率大幅上升，詐唬更難成功。",
  },
  // More equity related
  {
    id: "e7",
    type: "equity",
    question: "4-2 法則是什麼意思？",
    options: [
      { key: "a", text: "翻牌 outs×4，轉牌 outs×2 得到大約勝率" },
      { key: "b", text: "底池賠率計算方式" },
      { key: "c", text: "加注倍數規則" },
      { key: "d", text: "籌碼管理原則" },
    ],
    correctAnswer: "a",
    explanation: "快速估算 equity：翻牌時 outs×4 ≈ 翻牌到河牌勝率；轉牌時 outs×2 ≈ 轉牌到河牌勝率。",
  },
  {
    id: "e8",
    type: "equity",
    question: "什麼是 implied odds（隱含賠率）？",
    options: [
      { key: "a", text: "完成聽牌後預期能從對手那裡贏到的額外籌碼" },
      { key: "b", text: "底池賠率" },
      { key: "c", text: "翻牌前的賠率" },
      { key: "d", text: "詐唬的賠率" },
    ],
    correctAnswer: "a",
    explanation: "隱含賠率考慮完成聽牌後能贏到的額外價值，使某些看似不划算的 call 變得有利可圖。",
  },
  // Postflop specific
  {
    id: "pf7",
    type: "logic",
    question: "什麼是 double barrel（轉牌持續下注）的好時機？",
    options: [
      { key: "a", text: "轉牌改善了你的範圍或對手範圍的牌掉落" },
      { key: "b", text: "任何時候都可以" },
      { key: "c", text: "只有有強牌時" },
      { key: "d", text: "只有在詐唬時" },
    ],
    correctAnswer: "a",
    explanation: "好的 double barrel 時機是當轉牌對你有利（如 A/K 掉落）或減少對手的 equity（如對手聽牌未中）。",
  },
  {
    id: "pf8",
    type: "logic",
    question: "為什麼在河牌要將範圍極化（大注或 check）？",
    options: [
      { key: "a", text: "河牌沒有更多牌可發，中等牌沒有保護需求" },
      { key: "b", text: "因為對手會 fold" },
      { key: "c", text: "因為想要 bluff" },
      { key: "d", text: "因為籌碼不夠" },
    ],
    correctAnswer: "a",
    explanation: "河牌不需要保護手牌，所以策略自然極化：用強牌和詐唬下注，中等牌 check-call 或 check-fold。",
  },
];

// Question type for categorization
type QuestionCategory = "preflop" | "postflop" | "math" | "exploit";

const EXAM_CONFIG = {
  totalQuestions: 40,
  timeLimit: 40 * 60, // 40 minutes in seconds
};

type ExamState = "intro" | "active" | "review";

interface ExamResult {
  questionId: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
}

export default function MockExamPage() {
  const t = useTranslations();
  const { user } = useAuthStore();
  const { recordQuestionAttempt, getQuizCompletionStats } = useProgressStore();
  const [examState, setExamState] = useState<ExamState>("intro");
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<Map<string, ExamResult>>(new Map());
  const [timeLeft, setTimeLeft] = useState(EXAM_CONFIG.timeLimit);
  const [isSaving, setIsSaving] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Save exam results to Supabase
  const saveExamResults = async (finalScore: number, totalQuestions: number, timeTaken: number) => {
    if (!user) return;

    setIsSaving(true);
    try {
      const supabase = createClient();
      const wrongAnswers = Array.from(results.entries())
        .filter(([_, r]) => !r.isCorrect)
        .map(([id, r]) => ({
          questionId: id,
          userAnswer: r.selectedAnswer,
        }));

      await supabase.from("mock_exam_history").insert({
        user_id: user.id,
        score: finalScore,
        total: totalQuestions,
        time_taken: timeTaken,
        wrong_answers: wrongAnswers,
      });
    } catch (error) {
      console.error("Failed to save exam results:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Shuffle and select questions
  const initializeExam = useCallback(() => {
    const shuffled = [...EXAM_QUESTIONS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, EXAM_CONFIG.totalQuestions);
    setQuestions(selected);
    setCurrentIndex(0);
    setResults(new Map());
    setTimeLeft(EXAM_CONFIG.timeLimit);
  }, []);

  // Start the exam
  const startExam = () => {
    initializeExam();
    setExamState("active");
  };

  // Timer effect
  useEffect(() => {
    if (examState === "active" && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setExamState("review");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [examState, timeLeft]);

  // Handle answer selection
  const selectAnswer = (questionId: string, answer: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    setResults((prev) => {
      const newResults = new Map(prev);
      newResults.set(questionId, {
        questionId,
        selectedAnswer: answer,
        isCorrect: answer === question.correctAnswer,
      });
      return newResults;
    });
  };

  // Navigate questions
  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
    }
  };

  // Submit exam
  const submitExam = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Calculate and save results
    const finalScore = Array.from(results.values()).filter((r) => r.isCorrect).length;
    const timeTaken = EXAM_CONFIG.timeLimit - timeLeft;
    saveExamResults(finalScore, questions.length, timeTaken);

    // Record question attempts for progress tracking
    results.forEach((result, questionId) => {
      recordQuestionAttempt(questionId, result.isCorrect);
    });

    setExamState("review");
  };

  // Reset exam
  const resetExam = () => {
    setExamState("intro");
    setQuestions([]);
    setResults(new Map());
    setTimeLeft(EXAM_CONFIG.timeLimit);
  };

  // Calculate score
  const score = Array.from(results.values()).filter((r) => r.isCorrect).length;
  const answered = results.size;
  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentQuestion = questions[currentIndex];
  const currentResult = currentQuestion ? results.get(currentQuestion.id) : null;

  if (examState === "intro") {
    const quizStats = getQuizCompletionStats();

    return (
      <div className="container max-w-2xl py-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">{t("exam.title") || "GTO Mock Exam"}</CardTitle>
            <CardDescription>
              {t("exam.description") || "Test your GTO knowledge with a comprehensive timed exam"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold">{EXAM_CONFIG.totalQuestions}</div>
                <div className="text-sm text-muted-foreground">{t("exam.questions") || "Questions"}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold">{Math.floor(EXAM_CONFIG.timeLimit / 60)}</div>
                <div className="text-sm text-muted-foreground">{t("exam.minutes") || "Minutes"}</div>
              </div>
            </div>

            {/* Quiz Progress Section */}
            {quizStats.attempted > 0 && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <TrendingUp className="h-4 w-4" />
                  {t("exam.yourProgress") || "Your Progress"}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t("exam.questionsAttempted") || "Questions Attempted"}</span>
                    <span>{quizStats.attempted}/{quizStats.total} ({quizStats.completionRate}%)</span>
                  </div>
                  <Progress value={quizStats.completionRate} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span>{t("exam.mastered") || "Mastered"}: {quizStats.mastered}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-amber-500" />
                    <span>{t("exam.needsReview") || "Needs Review"}: {quizStats.needsReview}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="text-sm text-muted-foreground space-y-2">
              <p>{t("exam.instruction1") || "This exam covers:"}</p>
              <ul className="list-disc list-inside space-y-1">
                <li>{t("exam.topic1") || "GTO Logic and Theory"}</li>
                <li>{t("exam.topic2") || "Hand Equity"}</li>
                <li>{t("exam.topic3") || "Position Strategy"}</li>
                <li>{t("exam.topic4") || "Push/Fold Decisions"}</li>
              </ul>
            </div>

            <Button onClick={startExam} className="w-full h-12 text-lg">
              <Play className="mr-2 h-5 w-5" />
              {t("exam.startExam") || "Start Exam"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (examState === "review") {
    return (
      <div className="container max-w-3xl py-8">
        <Card className="mb-6">
          <CardHeader className="text-center">
            <Trophy className={cn("h-16 w-16 mx-auto mb-4", percentage >= 70 ? "text-yellow-500" : "text-muted-foreground")} />
            <CardTitle className="text-3xl">
              {percentage >= 80
                ? t("exam.resultExcellent") || "Excellent!"
                : percentage >= 70
                ? t("exam.resultGood") || "Good Job!"
                : t("exam.resultKeepPracticing") || "Keep Practicing!"}
            </CardTitle>
            <CardDescription>
              {t("exam.yourScore") || "Your Score"}: {score}/{questions.length} ({percentage}%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center mb-6">
              <div className="p-4 bg-green-500/10 rounded-lg">
                <div className="text-2xl font-bold text-green-500">{score}</div>
                <div className="text-sm text-muted-foreground">{t("common.correct")}</div>
              </div>
              <div className="p-4 bg-red-500/10 rounded-lg">
                <div className="text-2xl font-bold text-red-500">{questions.length - score}</div>
                <div className="text-sm text-muted-foreground">{t("exam.incorrect") || "Incorrect"}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{formatTime(EXAM_CONFIG.timeLimit - timeLeft)}</div>
                <div className="text-sm text-muted-foreground">{t("exam.timeTaken") || "Time Taken"}</div>
              </div>
            </div>

            <Button onClick={resetExam} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("exam.tryAgain") || "Try Again"}
            </Button>
          </CardContent>
        </Card>

        {/* Article Recommendations */}
        {(() => {
          const wrongIds = Array.from(results.entries())
            .filter(([_, r]) => !r.isCorrect)
            .map(([id]) => id);
          const questionTypes = Object.fromEntries(
            questions.map((q) => [q.id, q.type])
          );
          const recommendations = getArticleRecommendations(wrongIds, questionTypes);
          const weakAreas = analyzeWeakAreas(wrongIds, questionTypes);

          if (wrongIds.length === 0) return null;

          return (
            <>
              {/* Weak Areas Summary */}
              {weakAreas.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <TrendingUp className="h-5 w-5" />
                      {t("exam.improvementAreas") || "Areas to Improve"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {weakAreas.map((area) => (
                        <div key={area.type} className="flex items-center justify-between">
                          <span className="capitalize">{area.type.replace("_", " ")}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {area.count} {t("exam.mistakes") || "mistakes"}
                            </span>
                            <Progress value={area.percentage} className="w-20 h-2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommended Articles */}
              {recommendations.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BookOpen className="h-5 w-5" />
                      {t("exam.recommendedReading") || "Recommended Reading"}
                    </CardTitle>
                    <CardDescription>
                      {t("exam.recommendedReadingDesc") || "Based on your mistakes, we recommend reviewing these articles:"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recommendations.map((article) => (
                        <Link
                          key={article.path}
                          href={article.path}
                          className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="font-medium">{article.titleZh}</div>
                          <div className="text-sm text-muted-foreground">{article.description}</div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          );
        })()}

        {/* Review Questions */}
        <h2 className="text-xl font-bold mb-4">{t("exam.reviewAnswers") || "Review Your Answers"}</h2>
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const result = results.get(q.id);
            return (
              <Card key={q.id} className={cn(result?.isCorrect ? "border-green-500/50" : "border-red-500/50")}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Q{idx + 1}</Badge>
                    {result?.isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <CardTitle className="text-base">{q.question}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="mb-2">
                    <span className="text-muted-foreground">{t("exam.yourAnswer") || "Your answer"}:</span>{" "}
                    {result?.selectedAnswer
                      ? q.options.find((o) => o.key === result.selectedAnswer)?.text
                      : t("exam.noAnswer") || "No answer"}
                  </p>
                  {!result?.isCorrect && (
                    <p className="text-green-600">
                      <span className="text-muted-foreground">{t("quiz.correctAnswer")}:</span>{" "}
                      {q.options.find((o) => o.key === q.correctAnswer)?.text}
                    </p>
                  )}
                  <p className="mt-2 text-muted-foreground">{q.explanation}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Active exam
  return (
    <div className="container max-w-3xl py-4">
      {/* Header */}
      <div className="sticky top-14 bg-background/95 backdrop-blur z-10 pb-4 mb-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-lg px-3 py-1">
              <Clock className={cn("h-4 w-4 mr-1", timeLeft < 60 && "text-red-500 animate-pulse")} />
              {formatTime(timeLeft)}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {answered}/{questions.length} {t("exam.answered") || "answered"}
            </span>
            <Button variant="destructive" size="sm" onClick={submitExam}>
              <Flag className="h-4 w-4 mr-1" />
              {t("exam.submit") || "Submit"}
            </Button>
          </div>
        </div>

        {/* Progress */}
        <Progress value={(answered / questions.length) * 100} className="h-2" />

        {/* Question Navigation */}
        <div className="flex flex-wrap gap-1 mt-3">
          {questions.map((q, idx) => {
            const result = results.get(q.id);
            return (
              <Button
                key={q.id}
                variant={currentIndex === idx ? "default" : result ? "secondary" : "outline"}
                size="sm"
                className="w-8 h-8 p-0"
                onClick={() => goToQuestion(idx)}
              >
                {idx + 1}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Question */}
      {currentQuestion && (
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">Q{currentIndex + 1}</Badge>
              <Badge variant="outline">{currentQuestion.type}</Badge>
            </div>
            <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentQuestion.options.map((option) => (
                <Button
                  key={option.key}
                  variant={currentResult?.selectedAnswer === option.key ? "default" : "outline"}
                  className="w-full h-auto py-4 px-4 text-left justify-start whitespace-normal"
                  onClick={() => selectAnswer(currentQuestion.id, option.key)}
                >
                  <span className="font-bold mr-2">{option.key.toUpperCase()}.</span>
                  <span className="flex-1">{option.text}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => goToQuestion(currentIndex - 1)}
          disabled={currentIndex === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t("common.previous")}
        </Button>
        <Button
          variant="outline"
          onClick={() => goToQuestion(currentIndex + 1)}
          disabled={currentIndex === questions.length - 1}
        >
          {t("common.next")}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
