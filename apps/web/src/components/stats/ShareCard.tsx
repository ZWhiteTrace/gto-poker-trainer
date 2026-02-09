"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Share2, Copy, Check, Trophy, Target, Flame, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareCardProps {
  stats: {
    totalHands: number;
    accuracy: number;
    bestStreak: number;
    weeklyHands: number;
    rank?: number;
  };
  userName?: string;
}

export function ShareCard({ stats, userName }: ShareCardProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const shareText = `🎯 GTO Poker Training Stats
📊 ${stats.totalHands} hands practiced
🎯 ${stats.accuracy.toFixed(1)}% accuracy
🔥 ${stats.bestStreak} best streak
${stats.rank ? `🏆 Rank #${stats.rank}` : ""}

Train at grindgto.com`;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My GTO Poker Training Stats",
          text: shareText,
          url: "https://grindgto.com",
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Failed to share:", err);
        }
      }
    } else {
      handleCopyText();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          分享成果
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>分享你的訓練成果</SheetTitle>
          <SheetDescription>
            生成圖卡或複製文字分享到社群
          </SheetDescription>
        </SheetHeader>

        {/* Preview Card */}
        <div className="p-6 mt-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl border border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">G</span>
              </div>
              <div>
                <h3 className="font-bold text-white">GrindGTO</h3>
                <p className="text-xs text-gray-400">Poker Training</p>
              </div>
            </div>
            {stats.rank && (
              <div className="flex items-center gap-1 px-3 py-1 bg-yellow-500/20 rounded-full">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="text-yellow-500 font-bold">#{stats.rank}</span>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <Activity className="h-5 w-5 text-blue-400 mb-2" />
              <div className="text-2xl font-bold text-white">{stats.totalHands.toLocaleString()}</div>
              <div className="text-xs text-gray-400">總練習手數</div>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <Target className="h-5 w-5 text-green-400 mb-2" />
              <div className="text-2xl font-bold text-white">{stats.accuracy.toFixed(1)}%</div>
              <div className="text-xs text-gray-400">準確率</div>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <Flame className="h-5 w-5 text-orange-400 mb-2" />
              <div className="text-2xl font-bold text-white">{stats.bestStreak}</div>
              <div className="text-xs text-gray-400">最佳連勝</div>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <Trophy className="h-5 w-5 text-purple-400 mb-2" />
              <div className="text-2xl font-bold text-white">{stats.weeklyHands}</div>
              <div className="text-xs text-gray-400">本週練習</div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-700 flex items-center justify-between">
            {userName && (
              <span className="text-sm text-gray-400">@{userName}</span>
            )}
            <span className="text-xs text-gray-500">grindgto.com</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={handleCopyText}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                已複製
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                複製文字
              </>
            )}
          </Button>
          <Button className="flex-1" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            分享
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
