"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Camera,
  Save,
  Trophy,
  Target,
  Flame,
  Eye,
  EyeOff,
  Check,
  Loader2,
} from "lucide-react";
import {
  getUserProfile,
  updateUserProfile,
  getUserLeaderboardStats,
  getUserAchievements,
  type UserProfile,
  type LeaderboardStats,
  type AchievementSummary,
} from "@/lib/supabase/leaderboard";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import Link from "next/link";

const AVATAR_OPTIONS = [
  "🎯",
  "🃏",
  "♠️",
  "♥️",
  "♦️",
  "♣️",
  "🎰",
  "🏆",
  "👑",
  "💎",
  "🔥",
  "⚡",
  "🌟",
  "💫",
  "🎮",
  "🎲",
];

export default function ProfilePage() {
  const t = useTranslations();
  const router = useRouter();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [achievements, setAchievements] = useState<AchievementSummary | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    async function fetchData() {
      setIsLoading(true);
      try {
        const [profileData, statsData, achievementsData] = await Promise.all([
          getUserProfile(user!.id),
          getUserLeaderboardStats(user!.id),
          getUserAchievements(user!.id),
        ]);

        setProfile(profileData);
        setStats(statsData);
        setAchievements(achievementsData);

        // Initialize form
        if (profileData) {
          setDisplayName(profileData.display_name);
          setSelectedAvatar(profileData.avatar_url);
          setIsPublic(profileData.is_public);
        } else {
          // Default from Google account
          setDisplayName(user!.user_metadata?.full_name || user!.email?.split("@")[0] || "Player");
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [user, router]);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const success = await updateUserProfile(user.id, {
        display_name: displayName.trim() || "Anonymous",
        avatar_url: selectedAvatar,
        is_public: isPublic,
      });

      if (success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="container max-w-2xl py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <User className="text-primary h-8 w-8" />
          {t("profile.title") || "Profile Settings"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("profile.description") || "Customize your profile and privacy settings"}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Avatar & Name */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                {t("profile.appearance") || "Appearance"}
              </CardTitle>
              <CardDescription>
                {t("profile.appearanceDesc") || "Choose how others see you on the leaderboard"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Selection */}
              <div>
                <Label className="mb-3 block text-sm font-medium">
                  {t("profile.avatar") || "Avatar"}
                </Label>
                <div className="grid grid-cols-8 gap-2">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setSelectedAvatar(emoji)}
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-lg text-2xl transition-all",
                        "hover:border-primary/50 border-2",
                        selectedAvatar === emoji
                          ? "border-primary bg-primary/10"
                          : "border-muted bg-muted/30"
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Display Name */}
              <div>
                <Label htmlFor="displayName" className="mb-2 block text-sm font-medium">
                  {t("profile.displayName") || "Display Name"}
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  maxLength={20}
                  className="max-w-xs"
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  {displayName.length}/20 characters
                </p>
              </div>

              {/* Preview */}
              <div>
                <Label className="mb-2 block text-sm font-medium">
                  {t("profile.preview") || "Preview"}
                </Label>
                <div className="bg-muted/30 flex max-w-xs items-center gap-3 rounded-lg border p-3">
                  <div className="bg-primary/20 flex h-10 w-10 items-center justify-center rounded-full text-xl">
                    {selectedAvatar || "👤"}
                  </div>
                  <span className="font-medium">{displayName || "Anonymous"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isPublic ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                {t("profile.privacy") || "Privacy"}
              </CardTitle>
              <CardDescription>
                {t("profile.privacyDesc") || "Control who can see your profile"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t("profile.publicProfile") || "Public Profile"}</p>
                  <p className="text-muted-foreground text-sm">
                    {isPublic
                      ? t("profile.publicDesc") || "Your name and stats appear on the leaderboard"
                      : t("profile.privateDesc") || "You appear as 'Anonymous' on the leaderboard"}
                  </p>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
            </CardContent>
          </Card>

          {/* Stats Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {t("profile.yourStats") || "Your Stats"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{stats.total_hands}</div>
                    <div className="text-muted-foreground text-xs">
                      {t("profile.totalHands") || "Total Hands"}
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-500">
                      {stats.total_hands > 0
                        ? ((stats.correct_hands / stats.total_hands) * 100).toFixed(1)
                        : 0}
                      %
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {t("profile.accuracy") || "Accuracy"}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-2xl font-bold text-orange-500">
                      <Flame className="h-5 w-5" />
                      {stats.best_streak}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {t("profile.bestStreak") || "Best Streak"}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground py-4 text-center">
                  {t("profile.noStats") || "Start practicing to see your stats!"}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Achievements Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                {t("profile.achievements") || "Achievements"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {achievements && achievements.total_achievements > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {achievements.total_achievements} unlocked
                    </span>
                    <Badge variant="secondary" className="text-yellow-500">
                      {achievements.total_points} points
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {achievements.achievements.slice(0, 8).map((a) => (
                      <div
                        key={a.id}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-xl"
                        title={a.name}
                      >
                        {a.icon}
                      </div>
                    ))}
                    {achievements.total_achievements > 8 && (
                      <div className="bg-muted text-muted-foreground flex h-10 w-10 items-center justify-center rounded-lg text-sm">
                        +{achievements.total_achievements - 8}
                      </div>
                    )}
                  </div>
                  <Link href="/achievements">
                    <Button variant="outline" size="sm" className="w-full">
                      {t("profile.viewAll") || "View All Achievements"}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-muted-foreground mb-2">
                    {t("profile.noAchievements") || "No achievements yet"}
                  </p>
                  <Link href="/drill/rfi">
                    <Button size="sm">{t("profile.startPracticing") || "Start Practicing"}</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => router.back()}>
              {t("common.cancel") || "Cancel"}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.saving") || "Saving..."}
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t("common.saved") || "Saved!"}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t("common.save") || "Save Changes"}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
