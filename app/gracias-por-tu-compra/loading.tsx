import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="container max-w-4xl py-12">
      <div className="bg-white rounded-3xl shadow-md p-8">
        <div className="flex justify-center mb-6">
          <Skeleton className="h-20 w-20 rounded-full" />
        </div>

        <Skeleton className="h-10 w-3/4 mx-auto mb-2" />
        <Skeleton className="h-6 w-1/2 mx-auto mb-8" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Skeleton className="h-6 w-3/4 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
          </div>

          <div>
            <Skeleton className="h-6 w-3/4 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
          </div>
        </div>

        <div className="my-6 h-px bg-gray-200" />

        <Skeleton className="h-6 w-1/4 mb-4" />

        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Skeleton className="w-16 h-16 rounded-md mr-4" />
              <div>
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
        ))}

        <div className="mt-6 border-t border-gray-200 pt-4">
          <div className="flex justify-between mb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex justify-between mb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex justify-between mb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex justify-between mt-4">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>

        <div className="mt-10 flex flex-col md:flex-row justify-center gap-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    </div>
  )
}
