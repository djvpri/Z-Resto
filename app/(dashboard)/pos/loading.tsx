export default function POSLoading() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      {/* Shift banner skeleton */}
      <div className="bg-gray-100 border-b border-gray-100 px-4 py-2 shrink-0">
        <div className="h-3 bg-gray-200 rounded w-48" />
      </div>

      {/* View toggle skeleton */}
      <div className="flex border-b border-gray-100 shrink-0">
        <div className="flex-1 py-2.5 flex justify-center">
          <div className="h-3 bg-gray-200 rounded w-16" />
        </div>
        <div className="flex-1 py-2.5 flex justify-center">
          <div className="h-3 bg-gray-200 rounded w-16" />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Menu skeleton */}
        <div className="flex-1 flex flex-col overflow-hidden p-3 lg:p-4 gap-2 lg:gap-3">
          {/* Category tabs skeleton */}
          <div className="flex gap-1.5 overflow-hidden shrink-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-7 bg-gray-200 rounded-full w-16 shrink-0" />
            ))}
          </div>

          {/* Menu grid skeleton */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 lg:gap-2.5 content-start">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-100 p-2 lg:p-3"
              >
                <div className="bg-gray-100 rounded-lg h-12 lg:h-14 mb-2" />
                <div className="h-2.5 bg-gray-200 rounded w-3/4 mb-1.5" />
                <div className="h-2.5 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Cart skeleton (desktop) */}
        <div className="hidden lg:flex w-72 bg-white border-l border-gray-100 flex-col shrink-0">
          {/* Cart header */}
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-gray-200 rounded w-20" />
              <div className="h-3 bg-gray-200 rounded w-10" />
            </div>
            <div className="h-10 bg-gray-100 rounded-lg" />
          </div>

          {/* Cart items skeleton */}
          <div className="flex-1 p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-2.5 bg-gray-200 rounded w-1/3" />
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-6 bg-gray-200 rounded-full" />
                  <div className="w-5 h-3 bg-gray-200 rounded" />
                  <div className="w-6 h-6 bg-gray-200 rounded-full" />
                </div>
              </div>
            ))}
          </div>

          {/* Cart footer skeleton */}
          <div className="p-4 border-t border-gray-100 space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-16" />
                <div className="h-3 bg-gray-200 rounded w-20" />
              </div>
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-12" />
                <div className="h-3 bg-gray-200 rounded w-16" />
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <div className="h-4 bg-gray-200 rounded w-12" />
                <div className="h-4 bg-gray-200 rounded w-24" />
              </div>
            </div>
            <div className="h-10 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
