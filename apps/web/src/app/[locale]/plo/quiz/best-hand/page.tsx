"use client";

import dynamic from "next/dynamic";

const BestHandQuizClient = dynamic(() => import("./BestHandQuizClient").then((mod) => mod.BestHandQuizClient), {
  ssr: false,
  loading: () => (
    <div className="container max-w-2xl py-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">PLO4 Best Hand Quiz</h1>
      </div>
      <div className="bg-muted h-80 animate-pulse rounded-xl" />
    </div>
  ),
});

export default function PLO4BestHandPage() {
  return <BestHandQuizClient />;
}
