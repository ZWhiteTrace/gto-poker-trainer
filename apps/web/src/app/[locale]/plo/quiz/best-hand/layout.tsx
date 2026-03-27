import { Metadata } from "next";

export const metadata: Metadata = {
  title: "PLO4 Best Hand Quiz",
  description:
    "Test your PLO4 hand reading skills. Given 4 hole cards and a board, find the best hand using exactly 2 hole cards and 3 board cards.",
  alternates: {
    languages: {
      "zh-TW": "/plo/quiz/best-hand",
      en: "/en/plo/quiz/best-hand",
    },
  },
};

export default function BestHandLayout({ children }: { children: React.ReactNode }) {
  return children;
}
