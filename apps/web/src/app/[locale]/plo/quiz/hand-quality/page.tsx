"use client";

import dynamic from "next/dynamic";

const HandQualityQuizClient = dynamic(
  () => import("./HandQualityQuizClient").then((mod) => mod.HandQualityQuizClient),
  {
    ssr: false,
    loading: () => (
      <div className="container max-w-3xl py-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">PLO4 Hand Quality Quiz</h1>
        </div>
        <div className="bg-muted h-80 animate-pulse rounded-xl" />
      </div>
    ),
  }
);

export default function PLO4HandQualityPage() {
  return <HandQualityQuizClient />;
}
