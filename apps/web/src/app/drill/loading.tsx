import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DrillLoading() {
  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Session Stats */}
      <div className="mb-4 grid grid-cols-4 gap-2 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-3 sm:p-4 text-center">
              <Skeleton className="h-7 w-12 mx-auto mb-1" />
              <Skeleton className="h-4 w-16 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Drill Area */}
      <Card className="mb-8">
        <CardHeader>
          <Skeleton className="h-6 w-40 mb-1" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Hand display skeleton */}
            <div className="flex items-center justify-center gap-6 sm:gap-8">
              <div className="text-center">
                <Skeleton className="h-16 w-24 mx-auto mb-2" />
                <Skeleton className="h-4 w-16 mx-auto" />
              </div>
              <div className="text-center">
                <Skeleton className="h-10 w-16 mx-auto mb-2" />
                <Skeleton className="h-4 w-12 mx-auto" />
              </div>
            </div>
            {/* Action buttons skeleton */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 sm:h-16 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Position Reference */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-36" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {["UTG", "HJ", "CO", "BTN", "SB", "BB"].map((pos) => (
              <Skeleton key={pos} className="h-6 w-12" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
