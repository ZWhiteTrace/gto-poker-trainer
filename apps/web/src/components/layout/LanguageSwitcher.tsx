"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { useRouter } from "next/navigation";

const locales = [
  { code: "zh-TW", label: "中文", flag: "🇹🇼" },
  { code: "en", label: "EN", flag: "🇺🇸" },
] as const;

interface LanguageSwitcherProps {
  currentLocale: string;
}

export function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (newLocale: string) => {
    // Set cookie for locale preference
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;

    startTransition(() => {
      router.refresh();
    });
  };

  const currentLocaleData = locales.find((l) => l.code === currentLocale);
  const otherLocale = locales.find((l) => l.code !== currentLocale);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => otherLocale && handleLocaleChange(otherLocale.code)}
      disabled={isPending}
      className="gap-1"
    >
      <Globe className="h-4 w-4" />
      <span className="hidden sm:inline">
        {otherLocale?.flag} {otherLocale?.label}
      </span>
      <span className="sm:hidden">{otherLocale?.flag}</span>
    </Button>
  );
}

export default LanguageSwitcher;
