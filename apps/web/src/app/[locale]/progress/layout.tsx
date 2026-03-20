import { createSectionMetadata } from "@/lib/sectionMetadata";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return createSectionMetadata(locale, "progress");
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
