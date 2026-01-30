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

  const drillItems = [
    { href: "/drill/rfi", label: t("nav.rfiDrill") },
    { href: "/drill/vs-rfi", label: t("nav.vsRfiDrill") },
    { href: "/drill/vs-3bet", label: t("nav.vs3betDrill") },
    { href: "/drill/vs-4bet", label: t("nav.vs4betDrill") },
    { href: "/drill/postflop", label: t("nav.postflopDrill") },
    { href: "/drill/flop-texture", label: t("nav.flopTexture") || "翻牌質地" },
    { href: "/drill/table-trainer", label: t("nav.tableTrainer") || "GTO 牌桌" },
    { href: "/drill/gto-practice", label: t("nav.gtoPractice") },
  ];

  const mttItems = [
    { href: "/drill/push-fold", label: t("drill.pushFold.title") || "Push/Fold Drill" },
    { href: "/mtt/push-fold", label: t("nav.pushFold") },
    { href: "/mtt/icm", label: t("nav.icm") },
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Logo */}
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Spade className="h-6 w-6 text-primary" />
          <span className="hidden font-bold sm:inline-block">GTO Trainer</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex md:flex-1 md:items-center md:justify-between">
          <div className="flex items-center space-x-6">
            {/* Drill dropdown */}
            <div className="relative group">
              <span className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary cursor-pointer">
                {t("nav.practice")}
              </span>
              <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-background border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="py-1">
                  {drillItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            {/* MTT dropdown */}
            <div className="relative group">
              <span className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary cursor-pointer">
                {t("nav.mtt")}
              </span>
              <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-background border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="py-1">
                  {mttItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-primary"
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
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signInWithGoogle}
                  disabled={isLoading}
                >
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
              className="text-xs px-2"
            >
              <User className="h-4 w-4 mr-1" />
              {t("common.signIn")}
            </Button>
          )}
          {user && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(true)}
              className="h-8 w-8"
            >
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
            <SheetContent side="right" className="w-[300px]">
              <nav className="flex flex-col space-y-4 mt-8">
                {user && (
                  <>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.user_metadata?.full_name || user.email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2 text-lg font-medium transition-colors hover:text-primary"
                    >
                      <User className="h-5 w-5" />
                      {t("profile.title") || "Profile"}
                    </Link>
                    <Link
                      href="/stats"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2 text-lg font-medium transition-colors hover:text-primary"
                    >
                      <BarChart3 className="h-5 w-5" />
                      {t("stats.title") || "Stats"}
                    </Link>
                    <Link
                      href="/achievements"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2 text-lg font-medium transition-colors hover:text-primary"
                    >
                      <Award className="h-5 w-5" />
                      {t("achievements.title") || "Achievements"}
                    </Link>
                    <Link
                      href="/leaderboard"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2 text-lg font-medium transition-colors hover:text-primary"
                    >
                      <Trophy className="h-5 w-5" />
                      {t("leaderboard.title") || "Leaderboard"}
                    </Link>
                    <hr className="my-2" />
                  </>
                )}
                <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("nav.practice")}
                </div>
                {drillItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="text-lg font-medium transition-colors hover:text-primary pl-2"
                  >
                    {item.label}
                  </Link>
                ))}
                <hr className="my-2" />
                <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("nav.mtt")}
                </div>
                {mttItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="text-lg font-medium transition-colors hover:text-primary pl-2"
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
                    className="text-lg font-medium transition-colors hover:text-primary"
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
                    <LogOut className="h-4 w-4 mr-2" />
                    {t("common.signOut")}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={signInWithGoogle}
                    >
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
    <div className="relative group">
      <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
        {user.user_metadata?.avatar_url ? (
          <img
            src={user.user_metadata.avatar_url}
            alt="Avatar"
            className="h-7 w-7 rounded-full"
          />
        ) : (
          <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="h-4 w-4" />
          </div>
        )}
        <span className="hidden lg:inline">
          {user.user_metadata?.full_name || user.email?.split("@")[0]}
        </span>
      </button>
      <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-background border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <div className="py-1">
          <div className="px-4 py-2 border-b">
            <p className="text-sm font-medium truncate">
              {user.user_metadata?.full_name || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <Link
            href="/profile"
            className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-primary"
          >
            <User className="h-4 w-4" />
            {t("profile.title") || "Profile"}
          </Link>
          <Link
            href="/stats"
            className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-primary"
          >
            <BarChart3 className="h-4 w-4" />
            {t("stats.title") || "Stats"}
          </Link>
          <Link
            href="/achievements"
            className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-primary"
          >
            <Award className="h-4 w-4" />
            {t("achievements.title") || "Achievements"}
          </Link>
          <Link
            href="/leaderboard"
            className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-primary"
          >
            <Trophy className="h-4 w-4" />
            {t("leaderboard.title") || "Leaderboard"}
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-primary"
          >
            <LogOut className="h-4 w-4" />
            {t("common.signOut")}
          </button>
        </div>
      </div>
    </div>
  );
}
