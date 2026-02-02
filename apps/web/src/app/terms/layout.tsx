import { Metadata } from "next";

export const metadata: Metadata = {
  title: "服務條款 - GTO Poker Trainer",
  description:
    "GTO Poker Trainer 的服務條款。使用本網站前請閱讀並了解相關條款和條件。",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
