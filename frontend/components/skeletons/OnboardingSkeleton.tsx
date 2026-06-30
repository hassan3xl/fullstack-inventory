import { Skeleton } from "@/components/ui/skeleton";

export function OnboardingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500/5 via-background to-teal-500/5 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center animate-in fade-in duration-500">
      <div className="max-w-3xl mx-auto w-full space-y-8 bg-card border border-border p-8 sm:p-10 rounded-2xl shadow-2xl">
        
        {/* Header Skeleton */}
        <div className="text-center space-y-3 flex flex-col items-center">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>

        <div className="space-y-8">
          {/* Business Name Input Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>

          {/* Business Type Selector Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card">
                  <Skeleton className="p-5 w-12 h-12 rounded-lg shrink-0" />
                  <div className="space-y-2 w-full">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button Skeleton */}
          <div className="pt-4">
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
