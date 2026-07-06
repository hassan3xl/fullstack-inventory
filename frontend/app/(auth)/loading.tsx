import { AuthSkeleton } from "@/components/skeletons/AuthSkeleton";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <AuthSkeleton />
    </div>
  );
}
