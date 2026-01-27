import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container max-w-4xl py-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Stats bar skeleton */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>

      {/* Main content skeleton */}
      <Skeleton className="h-96 rounded-lg mb-6" />

      {/* Secondary content */}
      <Skeleton className="h-32 rounded-lg" />
    </div>
  );
}
