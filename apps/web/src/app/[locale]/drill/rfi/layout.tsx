import { createDrillMetadata } from "@/lib/drillMetadata";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return createDrillMetadata(locale, "rfi");
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
