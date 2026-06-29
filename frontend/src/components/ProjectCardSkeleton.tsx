export default function ProjectCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm animate-pulse flex flex-col gap-3">
      <div className="flex justify-between gap-2">
        <div className="h-4 bg-gray-200 rounded w-3/5" />
        <div className="h-5 bg-gray-100 rounded-full w-16" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-4/5" />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between">
          <div className="h-3 bg-gray-100 rounded w-12" />
          <div className="h-3 bg-gray-100 rounded w-16" />
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full" />
      </div>
    </div>
  );
}
