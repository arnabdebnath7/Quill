import { Skeleton } from "@/components/ui";

export default function AppLoading() {
  return (
    <div className="space-y-6" aria-label="Loading Quill" role="status">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
