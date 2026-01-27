"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Spade } from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Navbar() {
  const t = useTranslations();
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  const drillItems = [
    { href: "/drill/rfi", label: t("nav.rfiDrill") },
    { href: "/drill/vs-rfi", label: t("nav.vsRfiDrill") },
    { href: "/drill/vs-3bet", label: t("nav.vs3betDrill") },
  ];

  const navItems = [{ href: "/range", label: t("nav.ranges") }];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Logo */}
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Spade className="h-6 w-6 text-primary" />
          <span className="hidden font-bold sm:inline-block">
            GTO Trainer
          </span>
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
            <Button variant="ghost" size="sm">
              {t("common.signIn")}
            </Button>
            <Button size="sm">{t("common.getStarted")}</Button>
          </div>
        </nav>

        {/* Mobile Navigation */}
        <div className="flex flex-1 items-center justify-end gap-2 md:hidden">
          <LanguageSwitcher currentLocale={locale} />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <nav className="flex flex-col space-y-4 mt-8">
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
                <Button variant="outline" className="w-full">
                  {t("common.signIn")}
                </Button>
                <Button className="w-full">{t("common.getStarted")}</Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
