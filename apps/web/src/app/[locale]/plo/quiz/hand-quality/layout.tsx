import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PLO4 Hand Quality Quiz",
  description:
    "Compare Omaha starting-hand structures and learn why double-suited rundowns outperform disconnected trash.",
  alternates: {
    languages: {
      "zh-TW": "/plo/quiz/hand-quality",
      en: "/en/plo/quiz/hand-quality",
    },
  },
};

export default function HandQualityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
