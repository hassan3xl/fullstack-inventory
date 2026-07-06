import { Skeleton } from "@/components/ui/skeleton";

export function AuthSkeleton() {
  return (
    <div className="w-full max-w-md p-8 rounded-lg shadow-lg border border-border bg-card space-y-6 animate-in fade-in duration-300">
      {/* Header Skeleton */}
      <div className="text-center space-y-3">
        <Skeleton className="h-8 w-48 mx-auto rounded-md" />
        <Skeleton className="h-4 w-64 mx-auto rounded-md" />
      </div>

      {/* Form Fields Skeleton */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        
        {/* Submitting button */}
        <div className="pt-2">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center space-x-2">
        <div className="flex-1 h-px bg-border" />
        <div className="w-8 flex justify-center">
          <Skeleton className="h-3 w-4 rounded-md" />
        </div>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Footer / Social OAuth button */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-4 w-48 mx-auto rounded-md" />
      </div>
    </div>
  );
}
