"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const localeLabels = {
  "zh-TW": { label: "中文", flag: "🇹🇼" },
  en: { label: "EN", flag: "🇺🇸" },
} as const;

interface LanguageSwitcherProps {
  currentLocale: string;
}

export function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const otherLocale = routing.locales.find((l) => l !== currentLocale) ?? routing.defaultLocale;
  const otherData = localeLabels[otherLocale];

  const handleLocaleChange = () => {
    startTransition(() => {
      router.replace(pathname, { locale: otherLocale });
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLocaleChange}
      disabled={isPending}
      className="gap-1"
    >
      <Globe className="h-4 w-4" />
      <span className="hidden sm:inline">
        {otherData.flag} {otherData.label}
      </span>
      <span className="sm:hidden">{otherData.flag}</span>
    </Button>
  );
}

export default LanguageSwitcher;
