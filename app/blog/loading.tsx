import { Skeleton } from "@/components/ui/skeleton"

export default function BlogLoading() {
  return (
    <div className="flex flex-col min-h-screen pt-0">
      <div className="responsive-section bg-white dark:bg-gray-900">
        <div className="responsive-container">
          <Skeleton className="h-10 w-3/4 md:w-1/2 mx-auto mb-6 title-reflection" />
          <Skeleton className="h-6 w-full max-w-2xl mx-auto mb-12" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="bg-white shadow-md dark:bg-gray-800 rounded-xl overflow-hidden">
                <Skeleton className="relative h-48 w-full" />
                <div className="p-6">
                  <Skeleton className="h-4 w-1/3 mb-2" />
                  <Skeleton className="h-6 w-3/4 mb-2 font-display" />
                  <Skeleton className="h-10 w-full mb-4" />
                  <Skeleton className="h-10 w-full rounded-full border" />
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Skeleton className="h-14 w-48 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
