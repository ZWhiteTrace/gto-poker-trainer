"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Spade, User, LogOut, BarChart3, Trophy, Award } from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useAuthStore } from "@/stores/authStore";

export function Navbar() {
  const t = useTranslations();
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const { user, isLoading, signInWithGoogle, signOut } = useAuthStore();

  // Organized drill items by category
  const drillItems = [
    // Featured
    { href: "/drill/endless", label: t("nav.endlessDrill") || "無限練習" },
    // Preflop
    { href: "/drill/rfi", label: t("nav.rfiDrill") },
    { href: "/drill/vs-rfi", label: t("nav.vsRfiDrill") },
    { href: "/drill/vs-3bet", label: t("nav.vs3betDrill") },
    { href: "/drill/vs-4bet", label: t("nav.vs4betDrill") },
    // Postflop
    { href: "/drill/table-trainer", label: t("nav.tableTrainer") || "牌桌訓練" },
    { href: "/drill/multistreet", label: t("nav.multistreetDrill") || "多街道練習" },
    { href: "/drill/postflop", label: t("nav.postflopDrill") },
    { href: "/drill/flop-texture", label: t("nav.flopTexture") || "翻牌質地" },
  ];

  const mttItems = [
    { href: "/drill/push-fold", label: t("drill.pushFold.title") || "Push/Fold 練習" },
    { href: "/mtt/push-fold", label: t("nav.pushFold") || "Push/Fold 圖表" },
    { href: "/mtt/icm", label: t("nav.icm") || "ICM 計算器" },
  ];

  const navItems = [
    { href: "/range", label: t("nav.ranges") },
    { href: "/quiz", label: t("nav.quiz") },
    { href: "/exam", label: t("exam.title") || "Mock Exam" },
    { href: "/learn", label: t("nav.learn") },
    { href: "/analyze", label: t("nav.analyze") },
    { href: "/leaderboard", label: t("leaderboard.title") || "Leaderboard" },
    { href: "/stats", label: t("stats.title") || "Stats" },
  ];

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="container flex h-14 items-center">
        {/* Logo */}
        <Link href="/" className="mr-6 flex items-center space-x-2" aria-label="首頁">
          <Spade className="text-primary h-6 w-6" aria-hidden="true" />
          <span className="hidden font-bold sm:inline-block">GTO Trainer</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex md:flex-1 md:items-center md:justify-between">
          <div className="flex items-center space-x-6">
            {/* Drill dropdown */}
            <div className="group relative">
              <span className="text-muted-foreground hover:text-primary cursor-pointer text-sm font-medium transition-colors">
                {t("nav.practice")}
              </span>
              <div className="bg-background invisible absolute left-0 z-50 mt-2 w-48 rounded-md border opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
                <div className="py-1">
                  {drillItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-muted-foreground hover:bg-muted hover:text-primary block px-4 py-2 text-sm"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            {/* MTT dropdown */}
            <div className="group relative">
              <span className="text-muted-foreground hover:text-primary cursor-pointer text-sm font-medium transition-colors">
                {t("nav.mtt")}
              </span>
              <div className="bg-background invisible absolute left-0 z-50 mt-2 w-48 rounded-md border opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
                <div className="py-1">
                  {mttItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-muted-foreground hover:bg-muted hover:text-primary block px-4 py-2 text-sm"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground hover:text-primary text-sm font-medium transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center space-x-2">
            <LanguageSwitcher currentLocale={locale} />
            {user ? (
              <UserMenu user={user} signOut={signOut} />
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={signInWithGoogle} disabled={isLoading}>
                  {t("common.signIn")}
                </Button>
                <Button size="sm" onClick={signInWithGoogle} disabled={isLoading}>
                  {t("common.getStarted")}
                </Button>
              </>
            )}
          </div>
        </nav>

        {/* Mobile Navigation */}
        <div className="flex flex-1 items-center justify-end gap-2 md:hidden">
          <LanguageSwitcher currentLocale={locale} />
          {!user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={signInWithGoogle}
              disabled={isLoading}
              className="px-2 text-xs"
            >
              <User className="mr-1 h-4 w-4" />
              {t("common.signIn")}
            </Button>
          )}
          {user && (
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)} className="h-8 w-8">
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Avatar"
                  className="h-6 w-6 rounded-full"
                />
              ) : (
                <User className="h-4 w-4" />
              )}
            </Button>
          )}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] overflow-hidden">
              <nav className="mt-8 flex h-full flex-col space-y-4 overflow-y-auto pb-8">
                {user && (
                  <>
                    <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
                      <div className="bg-primary/20 flex h-10 w-10 items-center justify-center rounded-full">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {user.user_metadata?.full_name || user.email}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">{user.email}</p>
                      </div>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setIsOpen(false)}
                      className="hover:text-primary flex items-center gap-2 text-lg font-medium transition-colors"
                    >
                      <User className="h-5 w-5" />
                      {t("profile.title") || "Profile"}
                    </Link>
                    <Link
                      href="/stats"
                      onClick={() => setIsOpen(false)}
                      className="hover:text-primary flex items-center gap-2 text-lg font-medium transition-colors"
                    >
                      <BarChart3 className="h-5 w-5" />
                      {t("stats.title") || "Stats"}
                    </Link>
                    <Link
                      href="/achievements"
                      onClick={() => setIsOpen(false)}
                      className="hover:text-primary flex items-center gap-2 text-lg font-medium transition-colors"
                    >
                      <Award className="h-5 w-5" />
                      {t("achievements.title") || "Achievements"}
                    </Link>
                    <Link
                      href="/leaderboard"
                      onClick={() => setIsOpen(false)}
                      className="hover:text-primary flex items-center gap-2 text-lg font-medium transition-colors"
                    >
                      <Trophy className="h-5 w-5" />
                      {t("leaderboard.title") || "Leaderboard"}
                    </Link>
                    <hr className="my-2" />
                  </>
                )}
                <div className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                  {t("nav.practice")}
                </div>
                {drillItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="hover:text-primary pl-2 text-lg font-medium transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
                <hr className="my-2" />
                <div className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                  {t("nav.mtt")}
                </div>
                {mttItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="hover:text-primary pl-2 text-lg font-medium transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
                <hr className="my-2" />
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="hover:text-primary text-lg font-medium transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
                <hr className="my-4" />
                {user ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      signOut();
                      setIsOpen(false);
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("common.signOut")}
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" className="w-full" onClick={signInWithGoogle}>
                      {t("common.signIn")}
                    </Button>
                    <Button className="w-full" onClick={signInWithGoogle}>
                      {t("common.getStarted")}
                    </Button>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

interface UserMenuProps {
  user: { email?: string; user_metadata?: { full_name?: string; avatar_url?: string } };
  signOut: () => void;
}

function UserMenu({ user, signOut }: UserMenuProps) {
  const t = useTranslations();

  return (
    <div className="group relative">
      <button className="text-muted-foreground hover:text-primary flex items-center gap-2 text-sm font-medium transition-colors">
        {user.user_metadata?.avatar_url ? (
          <img src={user.user_metadata.avatar_url} alt="Avatar" className="h-7 w-7 rounded-full" />
        ) : (
          <div className="bg-primary/20 flex h-7 w-7 items-center justify-center rounded-full">
            <User className="h-4 w-4" />
          </div>
        )}
        <span className="hidden lg:inline">
          {user.user_metadata?.full_name || user.email?.split("@")[0]}
        </span>
      </button>
      <div className="bg-background invisible absolute right-0 z-50 mt-2 w-48 rounded-md border opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
        <div className="py-1">
          <div className="border-b px-4 py-2">
            <p className="truncate text-sm font-medium">
              {user.user_metadata?.full_name || "User"}
            </p>
            <p className="text-muted-foreground truncate text-xs">{user.email}</p>
          </div>
          <Link
            href="/profile"
            className="text-muted-foreground hover:bg-muted hover:text-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <User className="h-4 w-4" />
            {t("profile.title") || "Profile"}
          </Link>
          <Link
            href="/stats"
            className="text-muted-foreground hover:bg-muted hover:text-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <BarChart3 className="h-4 w-4" />
            {t("stats.title") || "Stats"}
          </Link>
          <Link
            href="/achievements"
            className="text-muted-foreground hover:bg-muted hover:text-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Award className="h-4 w-4" />
            {t("achievements.title") || "Achievements"}
          </Link>
          <Link
            href="/leaderboard"
            className="text-muted-foreground hover:bg-muted hover:text-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Trophy className="h-4 w-4" />
            {t("leaderboard.title") || "Leaderboard"}
          </Link>
          <button
            onClick={signOut}
            className="text-muted-foreground hover:bg-muted hover:text-primary flex w-full items-center gap-2 px-4 py-2 text-sm"
          >
            <LogOut className="h-4 w-4" />
            {t("common.signOut")}
          </button>
        </div>
      </div>
    </div>
  );
}
